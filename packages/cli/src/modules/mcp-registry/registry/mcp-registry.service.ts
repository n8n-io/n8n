import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { SettingsRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import type { McpRegistryServerMetadata } from './mcp-registry-api.client';
import { McpRegistryApiClient } from './mcp-registry-api.client';
import type { McpRegistryServer } from './mcp-registry.types';
import { MCP_REGISTRY_PACKAGE_NAME } from '../node-description-transform';

type StoredMcpRegistryServers = {
	servers: McpRegistryServer[];
	lastSyncedAt: string;
};

type RefreshReason = 'startup' | 'leader-takeover' | 'interval';

const MCP_REGISTRY_SETTINGS_KEY = 'mcp-registry.servers';

const REFRESH_INTERVAL_HOURS = 8;

const REFRESH_INTERVAL_MS = REFRESH_INTERVAL_HOURS * Time.hours.toMilliseconds;

@Service()
export class McpRegistryService {
	private readonly servers = new Map<string, McpRegistryServer>();

	private refreshInterval: NodeJS.Timeout | undefined;

	private refreshPromise: Promise<void> | undefined;

	private isShuttingDown = false;

	constructor(
		private readonly logger: Logger,
		private readonly settingsRepository: SettingsRepository,
		private readonly apiClient: McpRegistryApiClient,
		private readonly instanceSettings: InstanceSettings,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
	) {
		this.logger = logger.scoped('mcp-registry');
	}

	async init(): Promise<void> {
		await this.loadFromSettings();
		if (this.instanceSettings.isLeader) {
			// don't want to wait for API calls to complete on init
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
	async reloadFromDb(): Promise<void> {
		await this.loadFromSettings();
		await this.refreshRegistryNodeTypes();
		if (this.isMainInstance()) {
			await this.notifyNodeDescriptionsUpdated();
		}
	}

	getAll({ includeDeprecated = false }: { includeDeprecated?: boolean } = {}): McpRegistryServer[] {
		const all = Array.from(this.servers.values());
		return includeDeprecated ? all : all.filter((server) => server.status === 'active');
	}

	get(slug: string): McpRegistryServer | undefined {
		return this.servers.get(slug);
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
			const stored = await this.readStoredServers();
			const existingServers = stored?.servers ?? [];
			let nextServers: McpRegistryServer[];
			if (existingServers.length === 0) {
				nextServers = await this.apiClient.fetchAllServers();
			} else {
				nextServers = await this.refreshChangedServers(existingServers);
			}

			await this.writeStoredServers(nextServers);
			this.replaceCache(nextServers);
			await this.refreshRegistryNodeTypes();
			await this.notifyNodeDescriptionsUpdated();
			await this.publishReloadCommand();

			this.logger.debug('MCP registry refreshed', {
				reason,
				serverCount: nextServers.length,
			});
		} catch (error) {
			this.logger.error('Failed to refresh MCP registry', { error, reason });
		}
	}

	private async refreshChangedServers(
		existingServers: McpRegistryServer[],
	): Promise<McpRegistryServer[]> {
		const metadata = await this.apiClient.fetchServersMetadata();
		const existingById = new Map(existingServers.map((server) => [server.id, server]));
		const idsToFetch = metadata
			.filter((entry) => this.shouldFetchFullServer(entry, existingById.get(entry.id)))
			.map(({ id }) => id);
		const fetchedServers =
			idsToFetch.length > 0 ? await this.apiClient.fetchServersByIds(idsToFetch) : [];
		for (const server of fetchedServers) {
			existingById.set(server.id, server);
		}

		return Array.from(existingById.values());
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

	private async readStoredServers(): Promise<StoredMcpRegistryServers | null> {
		const row = await this.settingsRepository.findByKey(MCP_REGISTRY_SETTINGS_KEY);
		if (!row) {
			return null;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(row.value);
		} catch {
			this.logger.warn('Invalid MCP registry settings payload, ignoring persisted data');
			return null;
		}

		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			!('servers' in parsed) ||
			!Array.isArray(parsed.servers)
		) {
			this.logger.warn('Invalid MCP registry settings payload, ignoring persisted data');
			return null;
		}

		return parsed as StoredMcpRegistryServers;
	}

	private async writeStoredServers(servers: McpRegistryServer[]): Promise<void> {
		const payload: StoredMcpRegistryServers = {
			servers,
			lastSyncedAt: new Date().toISOString(),
		};

		await this.settingsRepository.upsert(
			{
				key: MCP_REGISTRY_SETTINGS_KEY,
				value: JSON.stringify(payload),
				loadOnStartup: false,
			},
			['key'],
		);
	}

	private async loadFromSettings(): Promise<void> {
		const stored = await this.readStoredServers();
		this.replaceCache(stored?.servers ?? []);
	}

	private replaceCache(servers: McpRegistryServer[]): void {
		this.servers.clear();
		for (const server of servers) {
			this.servers.set(server.slug, server);
		}
	}

	private async refreshRegistryNodeTypes(): Promise<void> {
		const loader = this.loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME];
		if (!loader) {
			return;
		}

		loader.reset();
		await loader.loadAll();
		await this.loadNodesAndCredentials.postProcessLoaders();
		this.loadNodesAndCredentials.releaseTypes();
	}

	private async publishReloadCommand(): Promise<void> {
		const { Publisher } = await import('@/scaling/pubsub/publisher.service');
		await Container.get(Publisher).publishCommand({ command: 'reload-mcp-registry' });
	}

	private async notifyNodeDescriptionsUpdated(): Promise<void> {
		const { Push } = await import('@/push');
		Container.get(Push).broadcast({ type: 'nodeDescriptionUpdated', data: {} });
	}

	private isMainInstance(): boolean {
		return this.instanceSettings.instanceType === 'main';
	}
}
