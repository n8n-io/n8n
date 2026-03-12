import { mockLogger } from '@n8n/backend-test-utils';
import type { WorkflowPublishedVersionRepository, WorkflowPublishedVersion } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

describe('WorkflowPublishedDataService', () => {
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	let service: WorkflowPublishedDataService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new WorkflowPublishedDataService(mockLogger(), workflowPublishedVersionRepository);
	});

	test('should return published data when record exists', async () => {
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
			value: { nodes, connections, name: 'Published Name' },
		});
		Object.defineProperty(record, 'workflow', {
			value: { name: 'Workflow Name', staticData: undefined, settings: {}, shared: [] },
		});
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).not.toBeNull();
		expect(result!.id).toBe('wf-1');
		expect(result!.name).toBe('Published Name');
		expect(result!.nodes).toBe(nodes);
		expect(result!.connections).toBe(connections);
	});

	test('should use workflow name when published version has no name', async () => {
		const record = mock<WorkflowPublishedVersion>();
		Object.defineProperty(record, 'publishedVersion', {
			value: { nodes: [], connections: {}, name: null },
		});
		Object.defineProperty(record, 'workflow', {
			value: { name: 'Workflow Name', staticData: undefined, settings: {}, shared: [] },
		});
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result!.name).toBe('Workflow Name');
	});

	test('should return null when no record exists', async () => {
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).toBeNull();
	});

	test('should return null when publishedVersion relation is missing', async () => {
		const record = mock<WorkflowPublishedVersion>();
		// Simulate unloaded relation — TypeORM returns undefined for unloaded relations
		Object.defineProperty(record, 'publishedVersion', { value: undefined });
		Object.defineProperty(record, 'workflow', { value: { name: 'Workflow Name' } });
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).toBeNull();
	});
});
