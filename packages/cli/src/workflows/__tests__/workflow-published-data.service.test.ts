import type { WorkflowsConfig } from '@n8n/config';
import type {
	WorkflowPublishedVersionRepository,
	WorkflowPublishedVersion,
	WorkflowEntity,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

describe('WorkflowPublishedDataService', () => {
	const workflowPublishedVersionRepository = mock<WorkflowPublishedVersionRepository>();
	const errorReporter = mock<ErrorReporter>();
	const workflowsConfig = mock<WorkflowsConfig>();
	let service: WorkflowPublishedDataService;

	beforeEach(() => {
		jest.clearAllMocks();
		workflowsConfig.useWorkflowPublicationService = false;
		service = new WorkflowPublishedDataService(
			errorReporter,
			workflowPublishedVersionRepository,
			workflowsConfig,
		);
	});

	// Verifies that we hit the repository and return the data it provides.
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
			value: { nodes, connections, name: 'v1' },
		});
		Object.defineProperty(record, 'workflow', {
			value: { name: 'Workflow Name', staticData: undefined, settings: {}, shared: [] },
		});
		workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

		const result = await service.getPublishedWorkflowData('wf-1');

		expect(result).not.toBeNull();
		expect(result!.workflow.name).toBe('Workflow Name');
		expect(result!.publishedVersion.nodes).toBe(nodes);
		expect(result!.publishedVersion.connections).toBe(connections);
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

	describe('resolveProductionVersion', () => {
		const activeVersionNodes = [
			{
				id: 'a',
				name: 'A',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		];
		const mappingNodes = [
			{
				id: 'm',
				name: 'M',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		];

		test('returns null when the workflow has no published version', async () => {
			const workflow = mock<WorkflowEntity>({ activeVersionId: null });

			const result = await service.resolveProductionVersion(workflow, 'wf-1');

			expect(result).toBeNull();
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});

		test('reads from the activeVersion relation when the flag is off', async () => {
			const workflow = mock<WorkflowEntity>({ activeVersionId: 'v1' });
			Object.defineProperty(workflow, 'activeVersion', {
				value: { nodes: activeVersionNodes, connections: { A: {} } },
			});

			const result = await service.resolveProductionVersion(workflow, 'wf-1');

			expect(result).toEqual({ nodes: activeVersionNodes, connections: { A: {} } });
			expect(
				workflowPublishedVersionRepository.getPublishedVersionWithRelations,
			).not.toHaveBeenCalled();
		});

		test('reads from the published_version mapping when the flag is on', async () => {
			workflowsConfig.useWorkflowPublicationService = true;
			const workflow = mock<WorkflowEntity>({ activeVersionId: 'v1' });
			const record = mock<WorkflowPublishedVersion>();
			Object.defineProperty(record, 'publishedVersion', {
				value: { nodes: mappingNodes, connections: { M: {} } },
			});
			Object.defineProperty(record, 'workflow', { value: { id: 'wf-1' } });
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(record);

			const result = await service.resolveProductionVersion(workflow, 'wf-1');

			expect(result).toEqual({ nodes: mappingNodes, connections: { M: {} } });
		});

		test('returns null when the flag is on and the mapping is missing', async () => {
			workflowsConfig.useWorkflowPublicationService = true;
			const workflow = mock<WorkflowEntity>({ activeVersionId: 'v1' });
			workflowPublishedVersionRepository.getPublishedVersionWithRelations.mockResolvedValue(null);

			const result = await service.resolveProductionVersion(workflow, 'wf-1');

			expect(result).toBeNull();
		});
	});
});
