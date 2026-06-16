import type {
	WorkflowPublishedVersionRepository,
	WorkflowPublishedVersion,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

describe('WorkflowPublishedDataService', () => {
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const workflowRepository = mock<WorkflowRepository>();
	let service: WorkflowPublishedDataService;

	beforeEach(() => {
		jest.clearAllMocks();
		service = new WorkflowPublishedDataService(
			workflowPublishedVersionRepository,
			workflowRepository,
		);
	});

	// Verifies that we hit the repository and return the data it provides.
	test('returns the published data when a mapping record exists', async () => {
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
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

		const result = await service.getPublishedWorkflowData('wf-1');

		if (typeof result === 'string') throw new Error(`expected data, got "${result}"`);
		expect(result.workflow.name).toBe('Workflow Name');
		expect(result.publishedVersion.nodes).toBe(nodes);
		expect(result.publishedVersion.connections).toBe(connections);
		expect(workflowRepository.existsBy).not.toHaveBeenCalled();
	});

	test("returns 'no-published-version' when there is no mapping but the workflow exists", async () => {
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);
		workflowRepository.existsBy.mockResolvedValue(true);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).toBe('no-published-version');
	});

	test("returns 'workflow-not-found' when there is no mapping and the workflow does not exist", async () => {
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);
		workflowRepository.existsBy.mockResolvedValue(false);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).toBe('workflow-not-found');
	});

	test('falls back to an existence check when the publishedVersion relation is missing', async () => {
		const record = mock<WorkflowPublishedVersion>();
		// Simulate unloaded relation — TypeORM returns undefined for unloaded relations
		Object.defineProperty(record, 'publishedVersion', { value: undefined });
		Object.defineProperty(record, 'workflow', { value: { name: 'Workflow Name' } });
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);
		workflowRepository.existsBy.mockResolvedValue(true);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).toBe('no-published-version');
	});
});
