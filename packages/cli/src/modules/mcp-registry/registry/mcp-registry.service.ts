import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import partition from 'lodash/partition';
import { InstanceSettings } from 'n8n-core';
import type { McpRegistryConnection } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { AiGatewayService } from '@/services/ai-gateway.service';

import { McpRegistryServerRepository } from './mcp-registry-server.repository';
import { McpRegistryNodeLoader } from '../mcp-registry-node-loader';
import type { McpRegistryServerMetadata } from './mcp-registry-api.client';
import { McpRegistryApiClient } from './mcp-registry-api.client';
import { McpRegistryCapabilities } from './mcp-registry-capabilities';
import {
	listMcpRegistryServers,
	searchMcpRegistryServers,
	type McpRegistrySearchResult,
} from './mcp-registry-search';
import type { McpRegistryServer } from './mcp-registry.types';
import {
	AI_GATEWAY_MANAGED_AUTH_TYPE,
	N8N_CONNECT_MCP_SLUG_PREFIX,
	toEntity,
	fromEntity,
} from './mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

/** A row the AI Gateway serves, not the remote registry. */
function isN8nConnectServer(server: McpRegistryServer): boolean {
	return server.authType === AI_GATEWAY_MANAGED_AUTH_TYPE;
}

/**
 * Whether a fetched n8n Connect server matches its stored row in every field.
 * The gateway keeps a fixed version, so a version check alone misses a changed
 * URL or tool list. The JSON round trip drops `undefined` fields, as storing does;
 * `deepCopy` keeps them, so every refresh would see a change.
 */
function isSameStoredServer(stored: McpRegistryServer, fetched: McpRegistryServer): boolean {
	const toStoredShape = (server: McpRegistryServer): unknown =>
		// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify
		JSON.parse(JSON.stringify(toEntity(server)));
	return isEqual(toStoredShape(stored), toStoredShape(fetched));
}

@Service()
export class McpRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: McpRegistryServerRepository,
		private readonly apiClient: McpRegistryApiClient,
		private readonly capabilities: McpRegistryCapabilities,
		private readonly instanceSettings: InstanceSettings,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly aiGatewayService: AiGatewayService,
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
		const servers = await this.getStoredServers(includeDeprecated);
		return servers.filter(({ requiredCapabilities }) =>
			this.capabilities.supports(requiredCapabilities),
		);
	}

	async get(slug: string): Promise<McpRegistryServer | undefined> {
		const entity = await this.repository.findOneBy({ slug });
		if (!entity) return undefined;

		const server = fromEntity(entity);
		return this.capabilities.supports(server.requiredCapabilities) ? server : undefined;
	}

	async getBySlugs(slugs: string[]): Promise<McpRegistryServer[]> {
		if (slugs.length === 0) {
			return [];
		}

		const entities = await this.repository.findBy(slugs.map((slug) => ({ slug })));
		return entities
			.map(fromEntity)
			.filter(({ requiredCapabilities }) => this.capabilities.supports(requiredCapabilities));
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
	 * Refreshes the registry from the remote API and, while n8n Connect is on, the
	 * n8n Connect MCP servers from the AI Gateway. Then reloads the generated node
	 * types. Skips the write and the reload when nothing changed.
	 * Overlapping runs are safe: each row keeps the newest fetch, whichever run
	 * writes last, and the loader rebuild is republished as a whole.
	 * @throws when the remote API or the database write fails, or when the
	 * signal aborts before the write starts. The signal cancels the API requests.
	 * Also throws when the gateway request fails, after the registry updates are saved.
	 */
	async refreshFromApi(signal?: AbortSignal): Promise<void> {
		const storedServers = await this.getStoredServers(true);
		const registryServers = storedServers.filter((server) => !isN8nConnectServer(server));
		const n8nConnectServers = storedServers.filter(isN8nConnectServer);
		const fetchedAt = await this.repository.readDbNow();
		const fetchedRegistryUpdates =
			registryServers.length === 0
				? await this.apiClient.fetchAllServers(signal)
				: ((await this.refreshUpdatedServers(registryServers, signal)) ?? []);
		// The prefix is reserved for n8n Connect rows, so no registry row replaces one.
		const [reservedSlugUpdates, registryUpdates] = partition(fetchedRegistryUpdates, (server) =>
			server.slug.startsWith(N8N_CONNECT_MCP_SLUG_PREFIX),
		);
		if (reservedSlugUpdates.length > 0) {
			this.logger.warn(
				'Ignored MCP registry servers that use the reserved n8n Connect slug prefix',
				{
					slugs: reservedSlugUpdates.map(({ slug }) => slug),
				},
			);
		}

		// A gateway failure must not discard the registry updates, so it is rethrown
		// only after they are saved. The task then retries the gateway part.
		let n8nConnectUpdates: McpRegistryServer[] = [];
		let n8nConnectError: unknown;
		try {
			n8nConnectUpdates = await this.getN8nConnectUpdates(n8nConnectServers);
		} catch (error) {
			n8nConnectError = error;
		}

		const updatedServers = [...registryUpdates, ...n8nConnectUpdates];
		if (updatedServers.length === 0) {
			this.logger.debug('MCP registry is up to date');
		} else {
			signal?.throwIfAborted();
			await this.saveServers(updatedServers, fetchedAt);
			await this.refreshRegistryNodeTypes(true);
			this.notifyNodeDescriptionsUpdated();
			await this.publishReloadCommand();

			this.logger.debug('MCP registry refreshed', { serverCount: updatedServers.length });
		}

		if (n8nConnectError) throw n8nConnectError;
	}

	private async getStoredServers(includeDeprecated: boolean): Promise<McpRegistryServer[]> {
		const entities = includeDeprecated
			? await this.repository.find()
			: await this.repository.findBy({ status: 'active' });
		return entities.map(fromEntity);
	}

	/**
	 * Diffs the n8n Connect MCP servers against their stored rows: a new server,
	 * or one that differs from its stored row, is returned to upsert, and a stored
	 * one the gateway no longer lists is deprecated. While n8n Connect is off this
	 * returns nothing, so the stored rows stay as they are.
	 * @throws when the gateway request fails.
	 */
	private async getN8nConnectUpdates(
		storedServers: McpRegistryServer[],
	): Promise<McpRegistryServer[]> {
		if (!this.aiGatewayService.isEnabled()) return [];

		const now = new Date().toISOString();
		const fetchedServers = await this.aiGatewayService.fetchN8nConnectMcpServers();
		const storedBySlug = new Map(storedServers.map((server) => [server.slug, server]));
		const fetchedSlugs = new Set(fetchedServers.map(({ slug }) => slug));
		const changedServers = fetchedServers.filter((server) => {
			const stored = storedBySlug.get(server.slug);
			return !stored || !isSameStoredServer(stored, server);
		});
		const serversToDeprecate = storedServers
			.filter((server) => !fetchedSlugs.has(server.slug) && server.status !== 'deprecated')
			.map((server) => ({ ...server, status: 'deprecated' as const, updatedAt: now }));
		return [...changedServers, ...serversToDeprecate];
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

	private async saveServers(servers: McpRegistryServer[], fetchedAt: Date): Promise<void> {
		const entities = servers.map(toEntity);
		// We don't delete any servers since they are used to
		// generate node types. If some node types are removed,
		// it will break workflows that use them.
		// If we want to stop supporting a server,
		// we will set its status to 'deprecated' instead.
		// If a server is removed from the remote API,
		// it will be marked as deprecated as well.
		await this.repository.upsertFetchedServers(entities, fetchedAt);
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
