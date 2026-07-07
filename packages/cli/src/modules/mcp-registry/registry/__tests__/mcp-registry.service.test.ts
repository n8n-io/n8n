import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

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
	isLeader?: boolean;
	instanceType?: 'main' | 'worker';
};

function createService(options: CreateServiceOptions = {}) {
	const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
	const repository = mock<McpRegistryServerRepository>();
	const apiClient = mock<McpRegistryApiClient>();
	const instanceSettings = mock<InstanceSettings>({
		isLeader: options.isLeader ?? false,
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
	};
}

describe('McpRegistryService', () => {
	afterEach(() => {
		vi.useRealTimers();
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
	});

	describe('refresh flow', () => {
		it('init does not start periodic refresh on followers', async () => {
			vi.useFakeTimers();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const { service, apiClient } = createService({ isLeader: false });

			await service.init();

			expect(setIntervalSpy).not.toHaveBeenCalled();
			expect(apiClient.fetchServersMetadata).not.toHaveBeenCalled();
		});

		it('init starts periodic refresh and kicks off startup refresh on leaders', async () => {
			vi.useFakeTimers();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
			const { service, apiClient } = createService({ isLeader: true });

			await service.init();
			await Promise.resolve();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(apiClient.fetchServersMetadata).toHaveBeenCalledTimes(1);

			service.shutdown();
		});

		it('onLeaderTakeover skips write + notifications when metadata is unchanged', async () => {
			vi.useFakeTimers();
			const setIntervalSpy = vi.spyOn(global, 'setInterval');
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

			await service.onLeaderTakeover();

			expect(apiClient.fetchServersBySlugs).not.toHaveBeenCalled();
			expect(repository.upsert).not.toHaveBeenCalled();
			expect(push.broadcast).not.toHaveBeenCalled();
			expect(publisher.publishCommand).not.toHaveBeenCalled();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);

			service.shutdown();
		});

		it('onLeaderTakeover deprecates servers missing from metadata', async () => {
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

			await service.onLeaderTakeover();

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

			service.shutdown();
		});

		it('onLeaderTakeover fetches only changed servers and publishes reload', async () => {
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

			await service.onLeaderTakeover();

			expect(apiClient.fetchAllServers).not.toHaveBeenCalled();
			expect(apiClient.fetchServersBySlugs).toHaveBeenCalledWith([notionMockServer.slug]);
			expect(repository.upsert).toHaveBeenCalledTimes(1);
			const upsertEntities = repository.upsert.mock.calls[0][0];
			expect(upsertEntities).toEqual([notionMockServer].map(toEntity));
			expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
			expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });

			service.shutdown();
		});

		it('onLeaderTakeover fetches all servers when no data is persisted', async () => {
			const { service, apiClient, repository } = createService({ storedServers: null });

			await service.onLeaderTakeover();

			expect(apiClient.fetchAllServers).toHaveBeenCalledTimes(1);
			expect(apiClient.fetchServersMetadata).not.toHaveBeenCalled();
			expect(repository.upsert).toHaveBeenCalledTimes(1);

			service.shutdown();
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
