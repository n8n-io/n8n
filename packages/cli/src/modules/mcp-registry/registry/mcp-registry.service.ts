import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type { McpRegistryConnection } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { McpRegistryServerRepository } from './mcp-registry-server.repository';
import { McpRegistryNodeLoader } from '../mcp-registry-node-loader';
import type { McpRegistryServerMetadata } from './mcp-registry-api.client';
import { McpRegistryApiClient } from './mcp-registry-api.client';
import {
	listMcpRegistryServers,
	searchMcpRegistryServers,
	type McpRegistrySearchResult,
} from './mcp-registry-search';
import type { McpRegistryServer } from './mcp-registry.types';
import { toEntity, fromEntity } from './mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

@Service()
export class McpRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: McpRegistryServerRepository,
		private readonly apiClient: McpRegistryApiClient,
		private readonly instanceSettings: InstanceSettings,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly push: Push,
		private readonly publisher: Publisher,
	) {
		this.logger = logger.scoped('mcp-registry');
	}

	async init(): Promise<void> {
		await this.refreshRegistryNodeTypes(false);
	}

	@OnPubSubEvent('reload-mcp-registry')
	async handleReloadMcpRegistry(): Promise<void> {
		await this.refreshRegistryNodeTypes(true);
		if (this.isMainInstance()) {
			this.notifyNodeDescriptionsUpdated();
		}
	}

	async getAll({
		includeDeprecated = false,
	}: { includeDeprecated?: boolean } = {}): Promise<McpRegistryServer[]> {
		const entities = includeDeprecated
			? await this.repository.find()
			: await this.repository.findBy({ status: 'active' });
		return entities.map(fromEntity);
	}

	async get(slug: string): Promise<McpRegistryServer | undefined> {
		const entity = await this.repository.findOneBy({ slug });
		return entity ? fromEntity(entity) : undefined;
	}

	async getBySlugs(slugs: string[]): Promise<McpRegistryServer[]> {
		if (slugs.length === 0) {
			return [];
		}

		const entities = await this.repository.findBy(slugs.map((slug) => ({ slug })));
		return entities.map(fromEntity);
	}

	/**
	 * Match active registry servers against free-text queries and return them in
	 * the config-ready shape used by the agent-builder tools. Centralizes the
	 * matching + mapping that used to be re-implemented per call site.
	 */
	async search(queries: string[]): Promise<McpRegistrySearchResult[]> {
		return searchMcpRegistryServers(await this.getAll(), queries);
	}

	async list(limit: number): Promise<McpRegistrySearchResult[]> {
		return listMcpRegistryServers(await this.getAll()).slice(0, limit);
	}

	async resolveBySlugs(slugs: string[]): Promise<McpRegistrySearchResult[]> {
		const servers = await this.getBySlugs(slugs);
		return listMcpRegistryServers(servers.filter((server) => server.status === 'active'));
	}

	async getConnection(nodeTypeName: string): Promise<McpRegistryConnection | undefined> {
		const loader = this.loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME];
		if (!(loader instanceof McpRegistryNodeLoader)) return undefined;
		return loader.getConnection(nodeTypeName);
	}

	/**
	 * Refreshes the registry from the remote API and reloads the generated node
	 * types. Skips the write and the reload when nothing changed.
	 * Callers must serialize runs.
	 * @throws when the remote API or the database write fails, or when the
	 * signal aborts before the write starts. The signal cancels the API requests.
	 */
	async refreshFromApi(signal?: AbortSignal): Promise<void> {
		const existingServers = await this.getAll({ includeDeprecated: true });
		let updatedServers: McpRegistryServer[];
		if (existingServers.length === 0) {
			updatedServers = await this.apiClient.fetchAllServers(signal);
		} else {
			const result = await this.refreshUpdatedServers(existingServers, signal);
			if (result === null) {
				this.logger.debug('MCP registry is up to date');
				return;
			}

			updatedServers = result;
		}

		signal?.throwIfAborted();
		await this.saveServers(updatedServers);
		await this.refreshRegistryNodeTypes(true);
		this.notifyNodeDescriptionsUpdated();
		await this.publishReloadCommand();

		this.logger.debug('MCP registry refreshed', { serverCount: updatedServers.length });
	}

	private async refreshUpdatedServers(
		existingServers: McpRegistryServer[],
		signal?: AbortSignal,
	): Promise<McpRegistryServer[] | null> {
		const now = new Date().toISOString();
		const metadata = await this.apiClient.fetchServersMetadata(signal);
		const existingBySlug = new Map(existingServers.map((server) => [server.slug, server]));
		const metadataSlugs = new Set(metadata.map(({ slug }) => slug));
		const slugsToFetch = metadata
			.filter((entry) => this.shouldFetchFullServer(entry, existingBySlug.get(entry.slug)))
			.map(({ slug }) => slug);
		const serversToDeprecate = existingServers
			.filter((server) => !metadataSlugs.has(server.slug) && server.status !== 'deprecated')
			.map((server) => ({ ...server, status: 'deprecated' as const, updatedAt: now }));

		if (slugsToFetch.length === 0 && serversToDeprecate.length === 0) {
			return null;
		}

		if (slugsToFetch.length === 0) {
			return serversToDeprecate;
		}

		const updatedServers = await this.apiClient.fetchServersBySlugs(slugsToFetch, signal);
		return [...updatedServers, ...serversToDeprecate];
	}

	private shouldFetchFullServer(
		metadata: McpRegistryServerMetadata,
		existing: McpRegistryServer | undefined,
	): boolean {
		return (
			!existing ||
			existing.version !== metadata.version ||
			existing.updatedAt !== metadata.updatedAt
		);
	}

	private async saveServers(servers: McpRegistryServer[]): Promise<void> {
		const entities = servers.map(toEntity);
		// We don't delete any servers since they are used to
		// generate node types. If some node types are removed,
		// it will break workflows that use them.
		// If we want to stop supporting a server,
		// we will set its status to 'deprecated' instead.
		// If a server is removed from the remote API,
		// it will be marked as deprecated as well.
		await this.repository.upsert(entities, ['slug']);
	}

	private async refreshRegistryNodeTypes(releaseTypes: boolean): Promise<void> {
		const loader = this.loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME];
		if (!loader) {
			return;
		}

		if (!(loader instanceof McpRegistryNodeLoader)) {
			this.logger.warn('Unexpected MCP registry loader instance type', {
				loaderType: loader.constructor.name,
			});
			return;
		}

		const servers = await this.getAll({ includeDeprecated: true });
		loader.setServers(servers);
		await loader.loadAll();
		await this.loadNodesAndCredentials.postProcessLoaders();
		if (releaseTypes) {
			this.loadNodesAndCredentials.releaseTypes();
		}

		this.logger.debug('MCP registry loader done', { serverCount: servers.length });
	}

	private async publishReloadCommand(): Promise<void> {
		await this.publisher.publishCommand({ command: 'reload-mcp-registry' });
	}

	private notifyNodeDescriptionsUpdated() {
		this.push.broadcast({ type: 'nodeDescriptionUpdated', data: {} });
	}

	private isMainInstance(): boolean {
		return this.instanceSettings.instanceType === 'main';
	}
}
