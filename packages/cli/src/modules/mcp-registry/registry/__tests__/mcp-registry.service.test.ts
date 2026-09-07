import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { resolveMcpRegistryConnection } from '../../mcp-registry-connection';
import { McpRegistryNodeLoader } from '../../mcp-registry-node-loader';
import { MCP_REGISTRY_PACKAGE_NAME } from '../../node-description-transform';
import type { McpRegistryApiClient, McpRegistryServerMetadata } from '../mcp-registry-api.client';
import type { McpRegistryServerEntity } from '../mcp-registry-server.entity';
import type { McpRegistryServerRepository } from '../mcp-registry-server.repository';
import { McpRegistryService } from '../mcp-registry.service';
import type { McpRegistryServer } from '../mcp-registry.types';
import { toEntity } from '../mcp-registry.types';
import { linearMockServer, notionMockServer } from '../mock-servers';

function toMockEntity(server: McpRegistryServer): McpRegistryServerEntity {
	const now = new Date();
	return { ...toEntity(server), createdAt: now, updatedAt: now } as McpRegistryServerEntity;
}

type CreateServiceOptions = {
	storedServers?: McpRegistryServer[] | null;
	instanceType?: 'main' | 'worker';
};

function createService(options: CreateServiceOptions = {}) {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const repository = mock<McpRegistryServerRepository>();
	const apiClient = mock<McpRegistryApiClient>();
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
	repository.upsert.mockResolvedValue({} as never);

	const service = new McpRegistryService(
		logger,
		repository,
		apiClient,
		instanceSettings,
		loadNodesAndCredentials,
		push,
		publisher,
	);

	return {
		service,
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
			expect(repository.upsert).not.toHaveBeenCalled();
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
			expect(repository.upsert).toHaveBeenCalledTimes(1);
			const upsertEntities = repository.upsert.mock.calls[0][0];
			expect(upsertEntities).toEqual([
				{
					...toEntity({
						...linearMockServer,
						status: 'deprecated',
					}),
					registryUpdatedAt: expect.any(Date),
				},
			]);
			expect(repository.upsert.mock.calls[0][1]).toEqual(['slug']);
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
			expect(repository.upsert).toHaveBeenCalledTimes(1);
			const upsertEntities = repository.upsert.mock.calls[0][0];
			expect(upsertEntities).toEqual([notionMockServer].map(toEntity));
			expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
		});

		it('refreshFromApi fetches all servers when no data is persisted', async () => {
			const { service, apiClient, repository } = createService({ storedServers: null });

			await service.refreshFromApi();

			expect(apiClient.fetchAllServers).toHaveBeenCalledTimes(1);
			expect(apiClient.fetchServersMetadata).not.toHaveBeenCalled();
			expect(repository.upsert).toHaveBeenCalledTimes(1);
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
			expect(repository.upsert).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
		});

		it('refreshFromApi rethrows an API failure and writes nothing', async () => {
			const { service, apiClient, repository, push } = createService();
			apiClient.fetchServersMetadata.mockRejectedValue(new Error('api down'));

			await expect(service.refreshFromApi()).rejects.toThrow('api down');

			expect(repository.upsert).not.toHaveBeenCalled();
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
});
