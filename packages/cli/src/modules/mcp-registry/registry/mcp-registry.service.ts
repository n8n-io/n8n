import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
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
import { pairAiGatewayServers, withAiGatewayPartnerSlugs } from './mcp-registry-ai-gateway';
import { McpRegistryCapabilities } from './mcp-registry-capabilities';
import {
	listMcpRegistryServers,
	searchMcpRegistryServers,
	type McpRegistrySearchResult,
} from './mcp-registry-search';
import type { McpRegistryServer } from './mcp-registry.types';
import { isAiGatewayMcpServer, toEntity, fromEntity } from './mcp-registry.types';
import { canLoadMcpRegistryServer, MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

/**
 * Compares a fetched AI Gateway row with its stored row as the database stores
 * it. The AI Gateway can change a URL or a tool and keep the version, so a
 * version check is not enough. The JSON round trip drops `undefined` keys, as
 * storing does.
 */
function isSameStoredServer(stored: McpRegistryServer, fetched: McpRegistryServer): boolean {
	const toStoredShape = (server: McpRegistryServer): unknown =>
		// eslint-disable-next-line n8n-local-rules/no-json-parse-json-stringify -- deepCopy keeps `undefined` keys, which storage drops
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
		const supportedServers = servers.filter(({ requiredCapabilities }) =>
			this.capabilities.supports(requiredCapabilities),
		);
		return this.pair(supportedServers);
	}

	async get(slug: string): Promise<McpRegistryServer | undefined> {
		const entity = await this.repository.findOneBy({ slug });
		if (!entity) return undefined;

		const server = fromEntity(entity);
		if (!this.capabilities.supports(server.requiredCapabilities)) return undefined;
		return (await this.withPartners([server]))[0];
	}

	async getBySlugs(slugs: string[]): Promise<McpRegistryServer[]> {
		if (slugs.length === 0) {
			return [];
		}

		const entities = await this.repository.findBy(slugs.map((slug) => ({ slug })));
		const servers = entities
			.map(fromEntity)
			.filter(({ requiredCapabilities }) => this.capabilities.supports(requiredCapabilities));
		return await this.withPartners(servers);
	}

	/** Pairs AI Gateway rows with their registry twins (`pairAiGatewayServers`). */
	private pair(servers: McpRegistryServer[]): McpRegistryServer[] {
		const loader = this.loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME];
		if (!(loader instanceof McpRegistryNodeLoader)) return servers;
		const isSupportedCredentialType = (name: string) => loader.isSupportedCredentialType(name);
		return pairAiGatewayServers(servers, (server) =>
			canLoadMcpRegistryServer(server, isSupportedCredentialType),
		);
	}

	/** Pairs the given rows. It also reads their pair partners, but returns only the given rows. */
	private async withPartners(servers: McpRegistryServer[]): Promise<McpRegistryServer[]> {
		const slugs = new Set(servers.map(({ slug }) => slug));
		const partnerSlugs = withAiGatewayPartnerSlugs([...slugs]).filter((slug) => !slugs.has(slug));
		const partners =
			partnerSlugs.length > 0
				? (await this.repository.findBy(partnerSlugs.map((slug) => ({ slug }))))
						.map(fromEntity)
						.filter(({ requiredCapabilities }) => this.capabilities.supports(requiredCapabilities))
				: [];
		return this.pair([...servers, ...partners]).filter(({ slug }) => slugs.has(slug));
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
	 * Refreshes both sources of registry rows, the MCP registry and the AI Gateway,
	 * at the same time, then saves and reloads once. A failed source does not stop
	 * the other one: its error is thrown after the other source's rows are saved.
	 */
	async refreshFromApi(signal?: AbortSignal): Promise<void> {
		const fetchedAt = await this.repository.readDbNow();
		const results = await Promise.allSettled([
			this.refreshRegistryServers(signal),
			this.refreshAiGatewayServers(signal),
		]);
		const updatedServers = results.flatMap((result) =>
			result.status === 'fulfilled' ? result.value : [],
		);
		if (updatedServers.length > 0) {
			signal?.throwIfAborted();
			await this.saveAndReload(updatedServers, fetchedAt);
		}
		const failure = results.find((result) => result.status === 'rejected');
		if (failure) throw failure.reason;
	}

	/**
	 * Returns the new, changed and removed rows of the MCP registry, for
	 * `refreshFromApi` to save. Returns no rows when nothing changed.
	 * Overlapping runs are safe: each row keeps the newest fetch, whichever run
	 * writes last, and the loader rebuild is republished as a whole.
	 * @throws when the remote API fails. The signal cancels the API requests.
	 */
	private async refreshRegistryServers(signal?: AbortSignal): Promise<McpRegistryServer[]> {
		const existingServers = (await this.getStoredServers(true)).filter(
			(server) => !isAiGatewayMcpServer(server),
		);
		let updatedServers: McpRegistryServer[];
		if (existingServers.length === 0) {
			updatedServers = await this.apiClient.fetchAllServers(signal);
		} else {
			const result = await this.refreshUpdatedServers(existingServers, signal);
			if (result === null) {
				this.logger.debug('MCP registry is up to date');
				return [];
			}

			updatedServers = result;
		}

		this.logger.debug('MCP registry refreshed', { serverCount: updatedServers.length });
		return updatedServers;
	}

	private async getStoredServers(includeDeprecated: boolean): Promise<McpRegistryServer[]> {
		const entities = includeDeprecated
			? await this.repository.find()
			: await this.repository.findBy({ status: 'active' });
		return entities.map(fromEntity);
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

	/**
	 * Returns new and changed AI Gateway rows, and deprecates the rows that the AI
	 * Gateway no longer lists. While Gateway credits are off, the stored rows stay.
	 * @throws when the AI Gateway request fails.
	 */
	private async refreshAiGatewayServers(signal?: AbortSignal): Promise<McpRegistryServer[]> {
		if (!this.aiGatewayService.isEnabled()) return [];

		const storedServers = (await this.getStoredServers(true)).filter(isAiGatewayMcpServer);
		const fetchedServers = await this.aiGatewayService.fetchAiGatewayMcpServers(signal);
		const storedBySlug = new Map(storedServers.map((server) => [server.slug, server]));
		const fetchedSlugs = new Set(fetchedServers.map(({ slug }) => slug));
		const changedServers = fetchedServers.filter((server) => {
			const storedServer = storedBySlug.get(server.slug);
			return !storedServer || !isSameStoredServer(storedServer, server);
		});
		const retiredServers = storedServers
			.filter((server) => !fetchedSlugs.has(server.slug) && server.status !== 'deprecated')
			.map((server) => ({
				...server,
				status: 'deprecated' as const,
				updatedAt: new Date().toISOString(),
			}));

		return [...changedServers, ...retiredServers];
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

	private async saveAndReload(servers: McpRegistryServer[], fetchedAt: Date): Promise<void> {
		await this.saveServers(servers, fetchedAt);
		await this.refreshRegistryNodeTypes(true);
		this.notifyNodeDescriptionsUpdated();
		await this.publishReloadCommand();
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
