import type { Logger } from '@n8n/backend-common';
import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { McpRegistryRefreshTask } from '@/modules/mcp-registry/mcp-registry-refresh.task';
import type {
	McpRegistryApiClient,
	McpRegistryServerMetadata,
} from '@/modules/mcp-registry/registry/mcp-registry-api.client';
import { McpRegistryCapabilities } from '@/modules/mcp-registry/registry/mcp-registry-capabilities';
import { McpRegistryServerRepository } from '@/modules/mcp-registry/registry/mcp-registry-server.repository';
import { McpRegistryService } from '@/modules/mcp-registry/registry/mcp-registry.service';
import type { McpRegistryServer } from '@/modules/mcp-registry/registry/mcp-registry.types';
import { toEntity } from '@/modules/mcp-registry/registry/mcp-registry.types';
import {
	linearMockServer,
	notionMockServer,
	slackExtendingMockServer,
} from '@/modules/mcp-registry/registry/mock-servers';
import type { Push } from '@/push';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

const OVERLAPPING_RUNS = 4;

type StoredRow = Pick<McpRegistryServer, 'slug' | 'status' | 'version'>;

const row = ({ slug, status, version }: StoredRow): StoredRow => ({ slug, status, version });
const metadataOf = (servers: McpRegistryServer[]): McpRegistryServerMetadata[] =>
	servers.map(({ slug, version, updatedAt }) => ({ slug, version, updatedAt }));
const bySlug = (rows: StoredRow[]): StoredRow[] =>
	[...rows].sort((a, b) => a.slug.localeCompare(b.slug));

describe('McpRegistryRefreshTask', () => {
	const signal = new AbortController().signal;
	const apiClient = mock<McpRegistryApiClient>();
	const push = mock<Push>();
	const publisher = mock<Publisher>();
	let repository: McpRegistryServerRepository;
	let task: McpRegistryRefreshTask;

	beforeAll(async () => {
		await testModules.loadModules(['mcp-registry']);
		await testDb.init();
		repository = Container.get(McpRegistryServerRepository);
		const service = new McpRegistryService(
			mock<Logger>({ scoped: vi.fn().mockReturnThis() }),
			repository,
			apiClient,
			Container.get(McpRegistryCapabilities),
			mock<InstanceSettings>({ instanceType: 'main' }),
			mock<LoadNodesAndCredentials>({ loaders: {} }),
			push,
			publisher,
		);
		task = new McpRegistryRefreshTask(service);
	});

	beforeEach(() => {
		apiClient.fetchAllServers.mockReset();
		apiClient.fetchServersMetadata.mockReset();
		apiClient.fetchServersBySlugs.mockReset();
		push.broadcast.mockClear();
		publisher.publishCommand.mockClear();
	});

	afterEach(async () => {
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	function serveRemote(servers: McpRegistryServer[]): void {
		apiClient.fetchAllServers.mockResolvedValue(servers);
		apiClient.fetchServersMetadata.mockResolvedValue(metadataOf(servers));
		apiClient.fetchServersBySlugs.mockImplementation(async (slugs) =>
			servers.filter((server) => slugs.includes(server.slug)),
		);
	}

	async function seed(servers: McpRegistryServer[]): Promise<void> {
		await repository.insert(servers.map(toEntity));
	}

	async function storedRows(): Promise<StoredRow[]> {
		return bySlug((await repository.find()).map(row));
	}

	async function runOverlapping(): Promise<void> {
		await Promise.all(Array.from({ length: OVERLAPPING_RUNS }, async () => await task.run(signal)));
	}

	it('should store each fetched server once when runs overlap on an empty registry', async () => {
		const remote = [notionMockServer, linearMockServer, slackExtendingMockServer];
		serveRemote(remote);

		await runOverlapping();

		expect(await storedRows()).toEqual(bySlug(remote.map(row)));
		expect(push.broadcast).toHaveBeenCalledWith({ type: 'nodeDescriptionUpdated', data: {} });
		expect(publisher.publishCommand).toHaveBeenCalledWith({ command: 'reload-mcp-registry' });
	});

	it('should converge on the remote state when overlapping runs update and deprecate servers', async () => {
		const staleNotion: McpRegistryServer = {
			...notionMockServer,
			version: '1.1.0',
			updatedAt: '2026-04-01T10:00:00.000Z',
		};
		await seed([staleNotion, linearMockServer, slackExtendingMockServer]);
		serveRemote([notionMockServer, linearMockServer]);

		await runOverlapping();

		expect(await storedRows()).toEqual(
			bySlug([
				row(notionMockServer),
				row(linearMockServer),
				row({ ...slackExtendingMockServer, status: 'deprecated' }),
			]),
		);
		expect(apiClient.fetchAllServers).not.toHaveBeenCalled();
	});

	it('should write nothing on a run after the registry is current', async () => {
		serveRemote([notionMockServer, linearMockServer]);
		await task.run(signal);
		const upsert = vi.spyOn(repository, 'upsert');
		publisher.publishCommand.mockClear();

		await task.run(signal);

		expect(upsert).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('should reject and leave the registry unchanged when the remote API fails', async () => {
		await seed([notionMockServer, linearMockServer]);
		apiClient.fetchServersMetadata.mockRejectedValue(new Error('api down'));

		await expect(task.run(signal)).rejects.toThrow('api down');

		expect(await storedRows()).toEqual(bySlug([row(notionMockServer), row(linearMockServer)]));
		expect(push.broadcast).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});

	it('should reject and leave the registry unchanged when aborted during the fetch', async () => {
		await seed([notionMockServer, linearMockServer]);
		const controller = new AbortController();
		serveRemote([notionMockServer]);
		apiClient.fetchServersMetadata.mockImplementation(async () => {
			controller.abort();
			return metadataOf([notionMockServer]);
		});

		await expect(task.run(controller.signal)).rejects.toThrow();

		expect(await storedRows()).toEqual(bySlug([row(notionMockServer), row(linearMockServer)]));
		expect(push.broadcast).not.toHaveBeenCalled();
		expect(publisher.publishCommand).not.toHaveBeenCalled();
	});
});
