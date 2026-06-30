import type { Logger } from '@n8n/backend-common';
import type { WorkflowPublishedVersionRepository, WorkflowPublishedVersion } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';
import {
	WorkflowPublishedDataService,
	type PublishedWorkflowDataForExecution,
} from '@/workflows/workflow-published-data.service';

describe('WorkflowPublishedDataService', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const cacheService = mock<CacheService>();
	let service: WorkflowPublishedDataService;

	const cacheKey = 'workflow-published-data:wf-1';

	beforeEach(() => {
		vi.clearAllMocks();
		service = new WorkflowPublishedDataService(
			logger,
			workflowPublishedVersionRepository,
			cacheService,
		);
	});

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

	function makeCachedData(): PublishedWorkflowDataForExecution {
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
		};
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

			expect(result).toBe(cachedData);
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});
	});

	describe('getCachedPublishedWorkflowDataForExecution', () => {
		test('returns the cached value without touching the repository on a hit', async () => {
			const cached = makeCachedData();
			cacheService.get.mockResolvedValue(cached);

			const result = await service.getCachedPublishedWorkflowDataForExecution('wf-1');

			expect(result).toBe(cached);
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

			expect(result).toBe(cachedData);
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

			expect(result).toBe(cachedData);
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
