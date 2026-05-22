import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { McpRegistryServerRepository } from './mcp-registry-server.repository';
import { McpRegistryNodeLoader } from '../mcp-registry-node-loader';
import type { McpRegistryServerMetadata } from './mcp-registry-api.client';
import { McpRegistryApiClient } from './mcp-registry-api.client';
import type { McpRegistryServer } from './mcp-registry.types';
import { toEntity, fromEntity } from './mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

type RefreshReason = 'startup' | 'leader-takeover' | 'interval';

const REFRESH_INTERVAL_HOURS = 8;

const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_HOURS * Time.hours.toMilliseconds;

@Service()
export class McpRegistryService {
	private refreshInterval: NodeJS.Timeout | undefined;

	private refreshPromise: Promise<void> | undefined;

	private isShuttingDown = false;

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
		if (this.instanceSettings.isLeader) {
			// don't want to wait for API calls to block on init
			void this.refreshFromApi('startup');
			this.startPeriodicRefresh();
		}
	}

	@OnLeaderTakeover()
	async onLeaderTakeover(): Promise<void> {
		await this.refreshFromApi('leader-takeover');
		this.startPeriodicRefresh();
	}

	@OnLeaderStepdown()
	onLeaderStepdown(): void {
		this.stopPeriodicRefresh();
	}

	@OnShutdown()
	shutdown(): void {
		this.isShuttingDown = true;
		this.stopPeriodicRefresh();
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

	private startPeriodicRefresh(): void {
		if (this.isShuttingDown || this.refreshInterval) {
			return;
		}

		this.refreshInterval = setInterval(() => {
			void this.refreshFromApi('interval');
		}, REFRESH_INTERVAL_MS);

		this.logger.debug('Scheduled MCP registry refresh', {
			intervalHours: REFRESH_INTERVAL_HOURS,
		});
	}

	private stopPeriodicRefresh(): void {
		clearInterval(this.refreshInterval);
		this.refreshInterval = undefined;
	}

	private async refreshFromApi(reason: RefreshReason): Promise<void> {
		if (this.refreshPromise) {
			await this.refreshPromise;
			return;
		}

		this.refreshPromise = this.refreshFromApiInternal(reason);
		try {
			await this.refreshPromise;
		} finally {
			this.refreshPromise = undefined;
		}
	}

	private async refreshFromApiInternal(reason: RefreshReason): Promise<void> {
		try {
			const existingServers = await this.getAll({ includeDeprecated: true });
			let updatedServers: McpRegistryServer[];
			if (existingServers.length === 0) {
				updatedServers = await this.apiClient.fetchAllServers();
			} else {
				const result = await this.refreshUpdatedServers(existingServers);
				if (result === null) {
					this.logger.debug('MCP registry is up to date', { reason });
					return;
				}

				updatedServers = result;
			}

			await this.saveServers(updatedServers, existingServers);
			await this.refreshRegistryNodeTypes(true);
			this.notifyNodeDescriptionsUpdated();
			await this.publishReloadCommand();

			this.logger.debug('MCP registry refreshed', {
				reason,
				serverCount: updatedServers.length,
			});
		} catch (error) {
			this.logger.error('Failed to refresh MCP registry', { error, reason });
		}
	}

	private async refreshUpdatedServers(
		existingServers: McpRegistryServer[],
	): Promise<McpRegistryServer[] | null> {
		const now = new Date().toISOString();
		const metadata = await this.apiClient.fetchServersMetadata();
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

		const updatedServers = await this.apiClient.fetchServersBySlugs(slugsToFetch);
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

	private async saveServers(
		servers: McpRegistryServer[],
		existingServers: McpRegistryServer[],
	): Promise<void> {
		// Restore ids for existing servers to update them
		const idsBySlug = new Map(existingServers.map((server) => [server.slug, server.id]));
		const entities = servers.map(toEntity);
		for (const [index, server] of servers.entries()) {
			const existingId = idsBySlug.get(server.slug);
			if (existingId !== undefined) {
				entities[index].id = existingId;
			}
		}

		// We don't delete any servers since they are used to
		// generate node types. If some node types are removed,
		// it will break workflows that use them.
		// If we want to stop supporting a server,
		// we will set its status to 'deprecated' instead.
		// If a server is removed from the remote API,
		// it will be marked as deprecated as well.
		const toUpdate = entities.filter((entity) => entity.id !== undefined);
		const toInsert = entities.filter((entity) => entity.id === undefined);
		const updatePromises = toUpdate.map(
			async (entity) => await this.repository.update(entity.id!, entity),
		);
		await Promise.all([...updatePromises, this.repository.insert(toInsert)]);
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
