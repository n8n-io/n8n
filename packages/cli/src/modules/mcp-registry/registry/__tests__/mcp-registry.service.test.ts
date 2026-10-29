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
import { toEntity } from '../mcp-registry.types';
import {
	braveSearchAiGatewayMockServer,
	firecrawlAiGatewayMockServer,
	firecrawlMockServer,
	linearMockServer,
	notionMockServer,
} from '../mock-servers';

const DB_NOW = new Date('2026-05-01T00:00:00.000Z');

function toMockEntity(server: McpRegistryServer): McpRegistryServerEntity {
	const now = new Date();
	return { ...toEntity(server), createdAt: now, updatedAt: now } as McpRegistryServerEntity;
}

type CreateServiceOptions = {
	storedServers?: McpRegistryServer[] | null;
	instanceType?: 'main' | 'worker';
	aiGateway?: { enabled: boolean; servers?: McpRegistryServer[]; error?: Error };
};

function createService(options: CreateServiceOptions = {}) {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const repository = mock<McpRegistryServerRepository>();
	const apiClient = mock<McpRegistryApiClient>();
	const globalConfig = mock<GlobalConfig>({
		deployment: { type: 'default' },
	});
	const aiGatewayService = mock<AiGatewayService>({
		isEnabled: () => options.aiGateway?.enabled ?? false,
	});
	if (options.aiGateway?.error) {
		aiGatewayService.fetchAiGatewayMcpServers.mockRejectedValue(options.aiGateway.error);
	} else {
		aiGatewayService.fetchAiGatewayMcpServers.mockResolvedValue(options.aiGateway?.servers ?? []);
	}
	const capabilities = new McpRegistryCapabilities(globalConfig, aiGatewayService);
	const instanceSettings = mock<InstanceSettings>({
		instanceType: options.instanceType ?? 'main',
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>({ loaders: {} });
	const push = mock<Push>({ broadcast: vi.fn() });
	const publisher = mock<Publisher>({ publishCommand: vi.fn().mockResolvedValue(undefined) });

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
		aiGatewayService,
		repository,
		apiClient,
		push,
		publisher,
		loadNodesAndCredentials,
	};
}

describe('McpRegistryService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('AI Gateway pairs', () => {
		function createPairingService(storedServers: McpRegistryServer[]) {
			const created = createService({ storedServers, aiGateway: { enabled: true } });
			const loader = Object.create(McpRegistryNodeLoader.prototype) as McpRegistryNodeLoader;
			loader.isSupportedCredentialType = vi.fn().mockReturnValue(true);
			created.loadNodesAndCredentials.loaders[MCP_REGISTRY_PACKAGE_NAME] = loader;
			return created;
		}

		it('pairs the rows that getAll returns, and keeps a gateway-only row', async () => {
			const { service } = createPairingService([
				firecrawlMockServer,
				firecrawlAiGatewayMockServer,
				braveSearchAiGatewayMockServer,
			]);

			const servers = await service.getAll();

			expect(
				servers.map(({ slug, aiGateway, pairedSlug }) => ({
					slug,
					pairedWith: aiGateway?.slug ?? pairedSlug,
				})),
			).toEqual([
				{ slug: 'firecrawl', pairedWith: 'n8n-connect-firecrawl' },
				{ slug: 'n8n-connect-firecrawl', pairedWith: 'firecrawl' },
				{ slug: 'n8n-connect-brave-search', pairedWith: undefined },
			]);
		});

		it('reads the pair partner of a requested row, and returns only the requested rows', async () => {
			const { service } = createPairingService([
				firecrawlMockServer,
				linearMockServer,
				firecrawlAiGatewayMockServer,
			]);

			const firecrawl = await service.get('firecrawl');
			const bySlugs = await service.getBySlugs(['firecrawl']);

			expect(firecrawl?.aiGateway?.slug).toBe('n8n-connect-firecrawl');
			expect(bySlugs.map(({ slug, aiGateway }) => ({ slug, paired: !!aiGateway }))).toEqual([
				{ slug: 'firecrawl', paired: true },
			]);
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

	describe('refresh with the AI Gateway source', () => {
		const unchangedRegistryMetadata: McpRegistryServerMetadata[] = [
			notionMockServer,
			linearMockServer,
		].map(({ slug, version, updatedAt }) => ({ slug, version, updatedAt }));
		const savedRows = (repository: { upsertFetchedServers: { mock: { calls: unknown[][] } } }) =>
			(
				repository.upsertFetchedServers.mock.calls[0]?.[0] as McpRegistryServerEntity[] | undefined
			)?.map(({ slug, status }) => ({ slug, status }));

		it.each([
			{
				case: 'saves a new row',
				stored: [notionMockServer, linearMockServer],
				aiGateway: { enabled: true, servers: [firecrawlAiGatewayMockServer] },
				saved: [{ slug: 'n8n-connect-firecrawl', status: 'active' }],
			},
			{
				case: 'does not save an unchanged row',
				stored: [notionMockServer, linearMockServer, firecrawlAiGatewayMockServer],
				aiGateway: { enabled: true, servers: [firecrawlAiGatewayMockServer] },
				saved: undefined,
			},
			{
				case: 'saves a row whose content changed',
				stored: [notionMockServer, linearMockServer, firecrawlAiGatewayMockServer],
				aiGateway: {
					enabled: true,
					servers: [{ ...firecrawlAiGatewayMockServer, tools: [{ name: 'firecrawl_map' }] }],
				},
				saved: [{ slug: 'n8n-connect-firecrawl', status: 'active' }],
			},
			{
				case: 'deprecates a row that the AI Gateway no longer lists',
				stored: [notionMockServer, linearMockServer, firecrawlAiGatewayMockServer],
				aiGateway: { enabled: true, servers: [] },
				saved: [{ slug: 'n8n-connect-firecrawl', status: 'deprecated' }],
			},
			{
				case: 'changes nothing while Gateway credits are off',
				stored: [notionMockServer, linearMockServer, firecrawlAiGatewayMockServer],
				aiGateway: { enabled: false },
				saved: undefined,
			},
		])('$case', async ({ stored, aiGateway, saved }) => {
			const { service, apiClient, repository } = createService({
				storedServers: stored,
				aiGateway,
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedRegistryMetadata);

			await service.refreshFromApi();

			expect(savedRows(repository)).toEqual(saved);
		});

		it('stops before the AI Gateway write when the signal aborts during the fetch', async () => {
			const { service, apiClient, aiGatewayService, repository } = createService({
				aiGateway: { enabled: true },
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedRegistryMetadata);
			const controller = new AbortController();
			aiGatewayService.fetchAiGatewayMcpServers.mockImplementation(async () => {
				controller.abort();
				return [firecrawlAiGatewayMockServer];
			});

			await expect(service.refreshFromApi(controller.signal)).rejects.toThrow();

			expect(aiGatewayService.fetchAiGatewayMcpServers).toHaveBeenCalledWith(controller.signal);
			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
		});

		it('saves the registry updates when the AI Gateway fails, then throws', async () => {
			const { service, apiClient, repository } = createService({
				aiGateway: { enabled: true, error: new Error('gateway down') },
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedRegistryMetadata.slice(0, 1));

			await expect(service.refreshFromApi()).rejects.toThrow('gateway down');

			expect(savedRows(repository)).toEqual([{ slug: 'linear', status: 'deprecated' }]);
		});

		it('saves the updates of both sources together, and reloads once', async () => {
			const { service, apiClient, repository, publisher } = createService({
				aiGateway: { enabled: true, servers: [firecrawlAiGatewayMockServer] },
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedRegistryMetadata.slice(0, 1));

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).toHaveBeenCalledTimes(1);
			expect(savedRows(repository)).toEqual([
				{ slug: 'linear', status: 'deprecated' },
				{ slug: 'n8n-connect-firecrawl', status: 'active' },
			]);
			expect(publisher.publishCommand).toHaveBeenCalledTimes(1);
		});

		it('keeps AI Gateway rows out of the registry diff', async () => {
			const { service, apiClient, repository } = createService({
				storedServers: [notionMockServer, linearMockServer, firecrawlAiGatewayMockServer],
				aiGateway: { enabled: true, servers: [firecrawlAiGatewayMockServer] },
			});
			apiClient.fetchServersMetadata.mockResolvedValue(unchangedRegistryMetadata);

			await service.refreshFromApi();

			expect(repository.upsertFetchedServers).not.toHaveBeenCalled();
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
});
