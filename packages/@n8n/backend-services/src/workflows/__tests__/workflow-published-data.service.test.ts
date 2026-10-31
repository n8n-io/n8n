import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type {
	PublishedVersionForExecution,
	WorkflowPublishedVersionRepository,
	WorkflowPublishedVersion,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '../../services/cache/cache.service';
import { WorkflowPublishedDataService } from '../workflow-published-data.service';
import { WorkflowVersionedSettings } from '../workflow-versioned-settings.service';

describe('WorkflowPublishedDataService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const cacheService = mock<CacheService>();
	const moduleRegistry = mock<ModuleRegistry>();
	let service: WorkflowPublishedDataService;

	const cacheKey = 'workflow-published-data:wf-1';

	beforeEach(() => {
		vi.clearAllMocks();
		moduleRegistry.isActive.mockReturnValue(false);
		service = new WorkflowPublishedDataService(
			logger,
			workflowPublishedVersionRepository,
			cacheService,
			new WorkflowVersionedSettings(moduleRegistry),
		);
	});

	const enableEngineV2Module = () =>
		moduleRegistry.isActive.mockImplementation((name) => name === 'engine-v2');

	function makeRecord() {
		const nodes = [
			{
				id: 'node-1',
				name: 'Test',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		];
		const connections = {};

		const record = mock<WorkflowPublishedVersion>();
		Object.defineProperty(record, 'publishedVersion', {
			value: { nodes, connections, name: 'v1' },
		});
		Object.defineProperty(record, 'workflow', {
			value: { name: 'Workflow Name', staticData: undefined, settings: {}, shared: [] },
		});
		return { record, nodes, connections };
	}

	function makeCachedData(): PublishedVersionForExecution {
		return {
			id: 'wf-1',
			name: 'Workflow Name',
			description: null,
			active: true,
			isArchived: false,
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-02T00:00:00.000Z'),
			settings: {},
			staticData: undefined,
			activeVersionId: 'v1',
			versionCounter: 1,
			versionId: 'v1',
			nodes: [],
			connections: {},
			nodeGroups: [],
			versionSettings: null,
		};
	}

	/** The run data that the service returns for a record: the record without `versionSettings`. */
	function toRunData({ versionSettings: _, ...data }: PublishedVersionForExecution) {
		return data;
	}

	describe('getPublishedWorkflowData', () => {
		// The default read goes straight to the database, never the cache.
		test('returns published data from the repository', async () => {
			const { record, nodes, connections } = makeRecord();
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).not.toBeNull();
			expect(result!.workflow.name).toBe('Workflow Name');
			expect(result!.publishedVersion.nodes).toBe(nodes);
			expect(result!.publishedVersion.connections).toBe(connections);
			expect(cacheService.get).not.toHaveBeenCalled();
		});

		test('returns null when no record exists', async () => {
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).toBeNull();
		});

		test('returns null when the publishedVersion relation is missing', async () => {
			const record = mock<WorkflowPublishedVersion>();
			// Simulate unloaded relation — TypeORM returns undefined for unloaded relations
			Object.defineProperty(record, 'publishedVersion', { value: undefined });
			Object.defineProperty(record, 'workflow', { value: { name: 'Workflow Name' } });
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).toBeNull();
		});
	});

	describe('getPublishedWorkflowDataForExecution', () => {
		test('returns the slim published data projection from the repository', async () => {
			const cachedData = makeCachedData();
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				cachedData,
			);

			const result = await service.getPublishedWorkflowDataForExecution('wf-1');

			expect(result).toEqual(toRunData(cachedData));
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});
	});

	describe('settings of a production run', () => {
		const record = (): PublishedVersionForExecution => ({
			...makeCachedData(),
			settings: { engineType: 'v2', timezone: 'Europe/Berlin' },
			versionSettings: { engineType: 'v1' },
		});

		test('uses the engine of the published version with the engine-v2 module', async () => {
			enableEngineV2Module();
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				record(),
			);

			const result = await service.getPublishedWorkflowDataForExecution('wf-1');

			expect(result?.settings).toEqual({ engineType: 'v1', timezone: 'Europe/Berlin' });
			expect(result).not.toHaveProperty('versionSettings');
		});

		test('runs on the default engine when the published version has no engine', async () => {
			enableEngineV2Module();
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue({
				...record(),
				versionSettings: null,
			});

			const result = await service.getPublishedWorkflowDataForExecution('wf-1');

			expect(result?.settings?.engineType).toBeUndefined();
		});

		test('uses the workflow settings without the engine-v2 module', async () => {
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				record(),
			);

			const result = await service.getPublishedWorkflowDataForExecution('wf-1');

			expect(result?.settings).toEqual({ engineType: 'v2', timezone: 'Europe/Berlin' });
		});

		test('applies the published engine to a cached entry', async () => {
			enableEngineV2Module();
			cacheService.get.mockResolvedValue(record());

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(result?.settings).toEqual({ engineType: 'v1', timezone: 'Europe/Berlin' });
		});

		test('reads from the database when a cached entry has no version settings', async () => {
			enableEngineV2Module();
			const { versionSettings: _, ...oldEntry } = record();
			cacheService.get.mockResolvedValue(oldEntry);
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				record(),
			);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(
				workflowPublishedVersionRepository.getPublishedVersionForExecution,
			).toHaveBeenCalledWith('wf-1');
			expect(result?.settings).toEqual({ engineType: 'v1', timezone: 'Europe/Berlin' });
		});

		test('uses a cached entry without version settings when the engine-v2 module is off', async () => {
			const { versionSettings: _, ...oldEntry } = record();
			cacheService.get.mockResolvedValue(oldEntry);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(
				workflowPublishedVersionRepository.getPublishedVersionForExecution,
			).not.toHaveBeenCalled();
			expect(result?.settings).toEqual({ engineType: 'v2', timezone: 'Europe/Berlin' });
		});
	});

	describe('getCachedPublishedWorkflowDataForExecution', () => {
		test('returns the cached value without touching the repository on a hit', async () => {
			const cached = makeCachedData();
			cacheService.get.mockResolvedValue(cached);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(result).toEqual(toRunData(cached));
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
			expect(
				workflowPublishedVersionRepository.getPublishedVersionForExecution,
			).not.toHaveBeenCalled();
		});

		test('reads from the database on a miss without populating the cache', async () => {
			const cachedData = makeCachedData();
			cacheService.get.mockResolvedValue(undefined);
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				cachedData,
			);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(result).toEqual(toRunData(cachedData));
			expect(cacheService.set).not.toHaveBeenCalled();
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});

		test('falls back to the database when the cache read fails', async () => {
			const cachedData = makeCachedData();
			cacheService.get.mockRejectedValueOnce(new Error('redis down'));
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				cachedData,
			);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(result).toEqual(toRunData(cachedData));
			expect(result!.name).toBe('Workflow Name');
			expect(logger.warn).toHaveBeenCalled();
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});
	});

	describe('invalidateCache', () => {
		test('deletes the workflow cache entry', async () => {
			await service.invalidateCache('wf-1');

			expect(cacheService.delete).toHaveBeenCalledWith(cacheKey);
		});

		test('propagates cache failures so the publication is retried', async () => {
			cacheService.delete.mockRejectedValueOnce(new Error('redis down'));

			await expect(service.invalidateCache('wf-1')).rejects.toThrow('redis down');
		});
	});

	describe('refreshCache', () => {
		test('reloads from the database and caches the result without expiry', async () => {
			const cachedData = makeCachedData();
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				cachedData,
			);

			await service.refreshCache('wf-1');

			expect(cacheService.set).toHaveBeenCalledWith(cacheKey, cachedData, 0);
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});

		test('deletes the entry when the workflow has no published version', async () => {
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(null);

			await service.refreshCache('wf-1');

			expect(cacheService.set).not.toHaveBeenCalled();
			expect(cacheService.delete).toHaveBeenCalledWith(cacheKey);
		});

		test('propagates cache failures so the publication is retried', async () => {
			const cachedData = makeCachedData();
			workflowPublishedVersionRepository.getPublishedVersionForExecution.mockResolvedValue(
				cachedData,
			);
			cacheService.set.mockRejectedValueOnce(new Error('uncacheable'));

			await expect(service.refreshCache('wf-1')).rejects.toThrow('uncacheable');
		});
	});
});
