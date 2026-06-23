import type { WorkflowPublishedVersionRepository, WorkflowPublishedVersion } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';
import {
	WorkflowPublishedDataService,
	type PublishedWorkflowData,
} from '@/workflows/workflow-published-data.service';

describe('WorkflowPublishedDataService', () => {
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const cacheService = mock<CacheService>();
	let service: WorkflowPublishedDataService;

	const cacheKey = 'workflow-published-data:wf-1';

	beforeEach(() => {
		jest.clearAllMocks();
		service = new WorkflowPublishedDataService(workflowPublishedVersionRepository, cacheService);
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

	describe('getPublishedWorkflowData', () => {
		// Verifies that we hit the repository and return the data it provides.
		test('returns published data from the database on a cache miss', async () => {
			const { record, nodes, connections } = makeRecord();
			cacheService.get.mockResolvedValue(undefined);
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).not.toBeNull();
			expect(result!.workflow.name).toBe('Workflow Name');
			expect(result!.publishedVersion.nodes).toBe(nodes);
			expect(result!.publishedVersion.connections).toBe(connections);
		});

		test('does not populate the cache on a miss', async () => {
			const { record } = makeRecord();
			cacheService.get.mockResolvedValue(undefined);
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			await service.getPublishedWorkflowData('wf-1');

			expect(cacheService.set).not.toHaveBeenCalled();
		});

		test('returns the cached value without touching the repository on a hit', async () => {
			const cached = mock<PublishedWorkflowData>();
			cacheService.get.mockResolvedValue(cached);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).toBe(cached);
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});

		test('returns null when no record exists', async () => {
			cacheService.get.mockResolvedValue(undefined);
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).toBeNull();
		});

		test('returns null when the publishedVersion relation is missing', async () => {
			const record = mock<WorkflowPublishedVersion>();
			// Simulate unloaded relation — TypeORM returns undefined for unloaded relations
			Object.defineProperty(record, 'publishedVersion', { value: undefined });
			Object.defineProperty(record, 'workflow', { value: { name: 'Workflow Name' } });
			cacheService.get.mockResolvedValue(undefined);
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			const result = await service.getPublishedWorkflowData('wf-1');

			expect(result).toBeNull();
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
			const { record } = makeRecord();
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			await service.refreshCache('wf-1');

			expect(cacheService.set).toHaveBeenCalledWith(
				cacheKey,
				expect.objectContaining({ workflow: record.workflow }),
				0,
			);
		});

		test('deletes the entry when the workflow has no published version', async () => {
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);

			await service.refreshCache('wf-1');

			expect(cacheService.set).not.toHaveBeenCalled();
			expect(cacheService.delete).toHaveBeenCalledWith(cacheKey);
		});

		test('propagates cache failures so the publication is retried', async () => {
			const { record } = makeRecord();
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);
			cacheService.set.mockRejectedValueOnce(new Error('uncacheable'));

			await expect(service.refreshCache('wf-1')).rejects.toThrow('uncacheable');
		});
	});
});
