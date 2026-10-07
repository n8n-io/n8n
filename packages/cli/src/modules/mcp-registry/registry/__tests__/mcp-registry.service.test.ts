import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';

import { resolveMcpRegistryConnection } from '../../mcp-registry-connection';
import { McpRegistryNodeLoader } from '../../mcp-registry-node-loader';
import { MCP_REGISTRY_PACKAGE_NAME } from '../../node-description-transform';
import type { McpRegistryApiClient, McpRegistryServerMetadata } from '../mcp-registry-api.client';
import { McpRegistryCapabilities } from '../mcp-registry-capabilities';
import type { McpRegistryServerEntity } from '../mcp-registry-server.entity';
import type { McpRegistryServerRepository } from '../mcp-registry-server.repository';
import { McpRegistryService } from '../mcp-registry.service';
import type { McpRegistryServer } from '../mcp-registry.types';
import { AI_GATEWAY_MANAGED_AUTH_TYPE, toEntity } from '../mcp-registry.types';
import { linearMockServer, notionMockServer } from '../mock-servers';

const DB_NOW = new Date('2026-05-01T00:00:00.000Z');

const n8nConnectMockServer: McpRegistryServer = {
	...notionMockServer,
	name: 'n8n-connect-notion',
	slug: 'n8n-connect-notion',
	authType: AI_GATEWAY_MANAGED_AUTH_TYPE,
	requiredCapabilities: ['n8n-connect'],
};

function toMockEntity(server: McpRegistryServer): McpRegistryServerEntity {
	const now = new Date();
	return { ...toEntity(server), createdAt: now, updatedAt: now } as McpRegistryServerEntity;
}

type CreateServiceOptions = {
	storedServers?: McpRegistryServer[] | null;
	instanceType?: 'main' | 'worker';
	/** `isEnabled` flag on the gateway service mock: whether n8n Connect is on. */
	aiGatewayEnabled?: boolean;
};

function createService(options: CreateServiceOptions = {}) {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const repository = mock<McpRegistryServerRepository>();
	const apiClient = mock<McpRegistryApiClient>();
	const globalConfig = mock<GlobalConfig>({
		deployment: { type: 'default' },
	});
	const instanceSettings = mock<InstanceSettings>({
		instanceType: options.instanceType ?? 'main',
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({ loaders: {} });
	const push = mock<Push>({ broadcast: vi.fn() });
	const publisher = mock<Publisher>({ publishCommand: vi.fn().mockResolvedValue(undefined) });
	const aiGatewayService = mock<AiGatewayService>({
		isEnabled: vi.fn().mockReturnValue(options.aiGatewayEnabled ?? true),
		fetchN8nConnectMcpServers: vi.fn().mockResolvedValue([]),
	});
	const capabilities = new McpRegistryCapabilities(globalConfig, aiGatewayService);

	if (options.storedServers === null) {
		repository.find.mockResolvedValue([]);
		repository.findBy.mockResolvedValue([]);
	} else {
		const servers = options.storedServers ?? [notionMockServer, linearMockServer];
		const entities = servers.map(toMockEntity);
		repository.find.mockResolvedValue(entities);
		repository.findBy.mockImplementation(async (where) => {
			if (Array.isArray(where)) {
				const slugs = new Set(where.map((condition) => condition.slug));
				return entities.filter((e) => slugs.has(e.slug));
			}
			if (where && 'status' in where) {
				return entities.filter((e) => e.status === where.status);
			}
			return entities;
		});
		repository.findOneBy.mockImplementation(async (where) => {
			if (where && 'slug' in where) {
				return entities.find((e) => e.slug === where.slug) ?? null;
			}
			return null;
		});
	}

	apiClient.fetchServersMetadata.mockResolvedValue([]);
	apiClient.fetchServersBySlugs.mockResolvedValue([]);
	apiClient.fetchAllServers.mockResolvedValue([notionMockServer, linearMockServer]);
	repository.upsertFetchedServers.mockResolvedValue();
	repository.readDbNow.mockResolvedValue(DB_NOW);

	const service = new McpRegistryService(
		logger,
		repository,
		apiClient,
		capabilities,
		instanceSettings,
		loadNodesAndCredentials,
		push,
		publisher,
		aiGatewayService,
	);

	return {
		service,
		logger,
		repository,
		apiClient,
		aiGatewayService,
		push,
		publisher,
		loadNodesAndCredentials,
	};
}

describe('McpRegistryService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('n8n Connect MCP servers', () => {
		/** Registry metadata that matches the default stored rows, so only the gateway changes. */
		const unchangedMetadata: McpRegistryServerMetadata[] = [notionMockServer, linearMockServer].map(
			({ slug, version, updatedAt }) => ({ slug, version, updatedAt }),
		);

		it('reads stored n8n Connect rows like registry rows', async () => {
			const { service } = createService({
				storedServers: [notionMockServer, n8nConnectMockServer],
			});

			expect(await service.getAll()).toEqual([notionMockServer, n8nConnectMockServer]);
			expect(await service.get(n8nConnectMockServer.slug)).toEqual(n8nConnectMockServer);
			expect(await service.getBySlugs([n8nConnectMockServer.slug])).toEqual([n8nConnectMockServer]);
		});

		it('hides stored n8n Connect rows while n8n Connect is off', async () => {
			const { service } = createService({
				storedServers: [notionMockServer, n8nConnectMockServer],
				aiGatewayEnabled: false,
			});

			expect(await service.getAll()).toEqual([notionMockServer]);
			expect(await service.get(n8nConnectMockServer.slug)).toBeUndefined();
			expect(await service.getBySlugs([n8nConnectMockServer.slug])).toEqual([]);
		});

		it('refreshFromApi stores a new n8n Connect server and publishes reload', async () => {
			const { service, apiClient, aiGatewayService, repository, publisher } = createService();
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);
			aiGatewayService.fetchN8nConnectMcpServers.mockResolvedValue([n8nConnectMockServer]);

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).toHaveBeenCalledWith(
				[toEntity(n8nConnectMockServer)],
				DB_NOW,
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
		});

		it('refreshFromApi skips the write when the n8n Connect servers are unchanged', async () => {
			const { service, apiClient, aiGatewayService, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, n8nConnectMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);
			aiGatewayService.fetchN8nConnectMcpServers.mockResolvedValue([n8nConnectMockServer]);

			await service.refreshFromApi();

			// The registry metadata does not list the gateway row, and it is not deprecated.
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
		});

		it('refreshFromApi updates an n8n Connect row whose content changed under the same version', async () => {
			const { service, apiClient, aiGatewayService, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, n8nConnectMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);
			const moved: McpRegistryServer = {
				...n8nConnectMockServer,
				remotes: [{ type: 'streamable-http', url: 'https://gateway.new/v1/gateway/mcp/notion' }],
			};
			aiGatewayService.fetchN8nConnectMcpServers.mockResolvedValue([moved]);

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).toHaveBeenCalledWith([toEntity(moved)], DB_NOW);
		});

		it('refreshFromApi treats an undefined field as absent, as the stored row has it', async () => {
			// Storing drops `undefined` fields, so the stored row lacks these keys.
			const { websiteUrl: _websiteUrl, tags: _tags, ...storedRow } = n8nConnectMockServer;
			const { service, apiClient, aiGatewayService, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, storedRow],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);
			aiGatewayService.fetchN8nConnectMcpServers.mockResolvedValue([
				{ ...storedRow, websiteUrl: undefined, tags: undefined },
			]);

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
		});

		it('refreshFromApi deprecates an n8n Connect row the gateway no longer lists', async () => {
			const { service, apiClient, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, n8nConnectMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);

			await service.refreshFromApi();

			const [[entities]] = repository.upsertFetchedServers.mock.calls;
			expect(entities).toEqual([
				expect.objectContaining({ slug: n8nConnectMockServer.slug, status: 'deprecated' }),
			]);
		});

		it('refreshFromApi leaves the n8n Connect rows alone while n8n Connect is off', async () => {
			const { service, apiClient, aiGatewayService, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, n8nConnectMockServer],
				aiGatewayEnabled: false,
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);

			await service.refreshFromApi();

			expect(aiGatewayService.fetchN8nConnectMcpServers).not.toHaveBeenCalled();
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
		});

		it('refreshFromApi rethrows a gateway failure and writes nothing', async () => {
			const { service, apiClient, aiGatewayService, repository } = createService();
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedMetadata);
			aiGatewayService.fetchN8nConnectMcpServers.mockRejectedValue(new Error('gateway down'));

			await expect(service.refreshFromApi()).rejects.toThrow('gateway down');
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
		});

		it('refreshFromApi saves the registry updates before it rethrows a gateway failure', async () => {
			const { service, apiClient, aiGatewayService, repository, publisher } = createService({
				storedServers: [notionMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue([
				...unchangedMetadata.slice(0, 1),
				{
					slug: linearMockServer.slug,
					version: linearMockServer.version,
					updatedAt: linearMockServer.updatedAt,
				},
			]);
			apiClient.fetchServersBySlugs.mockResolvedValue([linearMockServer]);
			aiGatewayService.fetchN8nConnectMcpServers.mockRejectedValue(new Error('gateway down'));

			await expect(service.refreshFromApi()).rejects.toThrow('gateway down');

			expect(repository.upsertFetchedServers).toHaveBeenCalledWith(
				[toEntity(linearMockServer)],
				DB_NOW,
			);
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
		});

		it('refreshFromApi drops a registry server that uses the reserved n8n Connect slug prefix', async () => {
			const { service, logger, apiClient, repository } = createService({ storedServers: null });
			apiClient.fetchAllServers.mockResolvedValue([
				notionMockServer,
				{ ...linearMockServer, slug: 'n8n-connect-linear' },
			]);

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).toHaveBeenCalledWith(
				[toEntity(notionMockServer)],
				DB_NOW,
			);
			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('reserved n8n Connect slug prefix'),
				{ slugs: ['n8n-connect-linear'] },
			);
		});
	});

	describe('getAll / get', () => {
		it('returns active servers by default', async () => {
			const deprecated: McpRegistryServer = {
				...notionMockServer,
				slug: 'old-notion',
				status: 'deprecated',
			};
			const { service } = createService({
				storedServers: [notionMockServer, linearMockServer, deprecated],
			});

			await service.init();
			const servers = await service.getAll();

			expect(servers).toEqual([notionMockServer, linearMockServer]);
		});

		it('includes deprecated servers when includeDeprecated is true', async () => {
			const deprecated: McpRegistryServer = {
				...notionMockServer,
				slug: 'old-notion',
				status: 'deprecated',
			};
			const { service } = createService({
				storedServers: [notionMockServer, linearMockServer, deprecated],
			});

			await service.init();
			const servers = await service.getAll({ includeDeprecated: true });

			expect(servers).toEqual([notionMockServer, linearMockServer, deprecated]);
		});

		it('returns server by slug and undefined for unknown slug', async () => {
			const { service } = createService();

			await service.init();
			const notion = await service.get('notion');
			const missing = await service.get('missing');

			expect(notion).toEqual(notionMockServer);
			expect(missing).toBeUndefined();
		});

		it('excludes servers that require an unsupported capability', async () => {
			const unsupportedServer: McpRegistryServer = {
				...linearMockServer,
				requiredCapabilities: ['unsupported-capability'],
			};
			const { service } = createService({
				storedServers: [notionMockServer, unsupportedServer],
			});

			expect(await service.getAll()).toEqual([notionMockServer]);
			expect(await service.get(unsupportedServer.slug)).toBeUndefined();
			expect(await service.getBySlugs([notionMockServer.slug, unsupportedServer.slug])).toEqual([
				notionMockServer,
			]);
		});

		it('returns empty array for getBySlugs when input is empty', async () => {
			const { service, repository } = createService();

			const servers = await service.getBySlugs([]);

			expect(servers).toEqual([]);
			expect(repository.findBy).not.toHaveBeenCalled();
		});

		it('returns mapped servers for getBySlugs', async () => {
			const { service, repository } = createService();

			const servers = await service.getBySlugs(['notion', 'linear']);

			expect(repository.findBy).toHaveBeenCalledWith([{ slug: 'notion' }, { slug: 'linear' }]);
			expect(servers).toEqual([notionMockServer, linearMockServer]);
		});

		it('maps resolveBySlugs into the same shape as search', async () => {
			const { service } = createService();

			const resolved = await service.resolveBySlugs(['notion']);
			const searched = await service.search(['notion']);

			expect(resolved).toEqual(searched);
		});

		it('omits unknown slugs from resolveBySlugs', async () => {
			const { service } = createService({ storedServers: [notionMockServer, linearMockServer] });

			const results = await service.resolveBySlugs(['notion', 'made-up']);

			expect(results.map((result) => result.slug)).toEqual(['notion']);
		});

		it('omits deprecated servers from resolveBySlugs, as search does', async () => {
			const { service } = createService({
				storedServers: [notionMockServer, { ...linearMockServer, status: 'deprecated' }],
			});

			const results = await service.resolveBySlugs(['notion', 'linear']);

			expect(results.map((result) => result.slug)).toEqual(['notion']);
		});
	});

	describe('refresh flow', () => {
		it('init loads the persisted registry without calling the API', async () => {
			const { service, apiClient } = createService();

			await service.init();

			expect(apiClient.fetchServersMetadata).not.toHaveBeenCalled();
			expect(apiClient.fetchAllServers).not.toHaveBeenCalled();
		});

		it('refreshFromApi skips write + notifications when metadata is unchanged', async () => {
			const metadata: McpRegistryServerMetadata[] = [
				{
					slug: notionMockServer.slug,
					version: notionMockServer.version,
					updatedAt: notionMockServer.updatedAt,
				},
				{
					slug: linearMockServer.slug,
					version: linearMockServer.version,
					updatedAt: linearMockServer.updatedAt,
				},
			];
			const { service, apiClient, repository, push, publisher } = createService();
			apiClient.fetchServersMetadata.mockResolvedValue(metadata);

			await service.refreshFromApi();

			expect(apiClient.fetchServersBySlugs).not.toHaveBeenCalled();
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});

		it('refreshFromApi deprecates servers missing from metadata', async () => {
			const metadata: McpRegistryServerMetadata[] = [
				{
					slug: notionMockServer.slug,
					version: notionMockServer.version,
					updatedAt: notionMockServer.updatedAt,
				},
			];
			const { service, apiClient, repository, push, publisher } = createService({
				storedServers: [notionMockServer, linearMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(metadata);

			await service.refreshFromApi();

			expect(apiClient.fetchServersBySlugs).not.toHaveBeenCalled();
			expect(repository.upsertFetchedServers).toHaveBeenCalledTimes(1);
			const upsertEntities = repository.upsertFetchedServers.mock.calls[0][0];
			expect(upsertEntities).toEqual([
				{
					...toEntity({
						...linearMockServer,
						status: 'deprecated',
					}),
					registryUpdatedAt: expect.any(Date),
				},
			]);
			expect(repository.upsertFetchedServers.mock.calls[0][1]).toBe(DB_NOW);
			expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
		});

		it('refreshFromApi fetches only changed servers and publishes reload', async () => {
			const staleNotion: McpRegistryServer = {
				...notionMockServer,
				version: '1.1.0',
				updatedAt: '2026-04-01T10:00:00.000Z',
			};
			const metadata: McpRegistryServerMetadata[] = [
				{
					slug: notionMockServer.slug,
					version: notionMockServer.version,
					updatedAt: notionMockServer.updatedAt,
				},
				{
					slug: linearMockServer.slug,
					version: linearMockServer.version,
					updatedAt: linearMockServer.updatedAt,
				},
			];
			const { service, apiClient, repository, push, publisher } = createService({
				storedServers: [staleNotion, linearMockServer],
			});
			apiClient.fetchServersMetadata.mockResolvedValue(metadata);
			apiClient.fetchServersBySlugs.mockResolvedValue([notionMockServer]);

			await service.refreshFromApi();

			expect(apiClient.fetchAllServers).not.toHaveBeenCalled();
			expect(apiClient.fetchServersBySlugs).toHaveBeenCalledWith(
				[notionMockServer.slug],
				undefined,
			);
			expect(repository.upsertFetchedServers).toHaveBeenCalledTimes(1);
			const upsertEntities = repository.upsertFetchedServers.mock.calls[0][0];
			expect(upsertEntities).toEqual([notionMockServer].map(toEntity));
			expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
		});

		it('refreshFromApi fetches all servers when no data is persisted', async () => {
			const { service, apiClient, repository } = createService({ storedServers: null });
			const unsupportedServer: McpRegistryServer = {
				...notionMockServer,
				requiredCapabilities: ['unsupported-capability'],
			};
			apiClient.fetchAllServers.mockResolvedValue([unsupportedServer]);

			await service.refreshFromApi();

			expect(apiClient.fetchAllServers).toHaveBeenCalledTimes(1);
			expect(apiClient.fetchServersMetadata).not.toHaveBeenCalled();
			expect(repository.upsertFetchedServers).toHaveBeenCalledWith(
				[toEntity(unsupportedServer)],
				DB_NOW,
			);
		});

		it('refreshFromApi stops before the write when the signal aborts during the fetch', async () => {
			const { service, apiClient, repository, push } = createService({ storedServers: null });
			const controller = new AbortController();
			apiClient.fetchAllServers.mockImplementation(async () => {
				controller.abort();
				return [notionMockServer];
			});

			await expect(service.refreshFromApi(controller.signal)).rejects.toThrow();

			expect(apiClient.fetchAllServers).toHaveBeenCalledWith(controller.signal);
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
		});

		it('refreshFromApi rethrows an API failure and writes nothing', async () => {
			const { service, apiClient, repository, push } = createService();
			apiClient.fetchServersMetadata.mockRejectedValue(new Error('api down'));

			await expect(service.refreshFromApi()).rejects.toThrow('api down');

			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
		});
	});

	describe('getConnection', () => {
		it('returns the connection from the registry node loader', async () => {
			const { service, loadNodesAndCredentials } = createService();
			const connection = resolveMcpRegistryConnection(notionMockServer);
			const loader = Object.create(McpRegistryNodeLoader.prototype) as McpRegistryNodeLoader;
			loader.getConnection = vi.fn().mockReturnValue(connection);
			loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME] = loader;

			await expect(service.getConnection('@n8n/mcp-registry.notion')).resolves.toEqual(connection);
			expect(loader.getConnection).toHaveBeenCalledWith('@n8n/mcp-registry.notion');
		});

		it('returns undefined when the registry loader is not registered', async () => {
			const { service } = createService();

			await expect(service.getConnection('@n8n/mcp-registry.notion')).resolves.toBeUndefined();
		});
	});

	describe('handleReloadMcpRegistry', () => {
		it('notifies the UI on the main instance', async () => {
			const { service, push } = createService({ instanceType: 'main' });

			await service.handleReloadMcpRegistry();

			expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
		});

		it('does not notify the UI on worker instances', async () => {
			const { service, push } = createService({ instanceType: 'worker' });

			await service.handleReloadMcpRegistry();

			expect(push.broadcast).not.toHaveBeenCalled();
		});
	});

	describe('Gateway credits routes', () => {
		const gatewayUrl = 'https://gateway.n8n.io/v1/gateway/mcp/notion';
		const gatewayNotion: McpRegistryServer = {
			...n8nConnectMockServer,
			remotes: [{ type: 'streamable-http', url: gatewayUrl }],
		};

		it('offers a registry server with its Gateway credits route, and hides the n8n Connect row', async () => {
			const { service } = createService({
				storedServers: [notionMockServer, linearMockServer, gatewayNotion],
			});

			const results = await service.list(10);

			expect(results.map(({ slug }) => slug)).toEqual(['notion', 'linear']);
			expect(results[0].gatewayCredits).toEqual({ authentication: 'none' });
			expect(results[1].gatewayCredits).toBeUndefined();
		});

		it('keeps an n8n Connect server that no registry server matches', async () => {
			const { service } = createService({
				storedServers: [
					notionMockServer,
					{ ...gatewayNotion, slug: 'n8n-connect-firecrawl', name: 'n8n-connect-firecrawl' },
				],
			});

			const results = await service.list(10);

			expect(results.map(({ slug }) => slug)).toEqual(['notion', 'n8n-connect-firecrawl']);
			expect(results[0].gatewayCredits).toBeUndefined();
		});

		it('adds no route while n8n Connect is off', async () => {
			const { service } = createService({
				storedServers: [notionMockServer, gatewayNotion],
				aiGatewayEnabled: false,
			});

			const results = await service.list(10);

			expect(results.map(({ slug }) => slug)).toEqual(['notion']);
			expect(results[0].gatewayCredits).toBeUndefined();
		});
	});
});
