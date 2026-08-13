import type { WorkflowsConfig } from '@n8n/config';
import type {
	PublishedWorkflowDataForExecution,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import { WorkflowToolWorkflowLoader } from '../workflow-tool-workflow-loader.service';

const reference = { workflowId: 'workflow-1', workflowName: 'Workflow' };

function makeWorkflow(overrides: Partial<WorkflowEntity> = {}) {
	return {
		id: 'workflow-1',
		name: 'Workflow',
		isArchived: false,
		nodes: [{ id: 'draft-node' }],
		connections: {},
		pinData: { Draft: [{ json: { pinned: true } }] },
		activeVersion: null,
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeService(useWorkflowPublicationService: boolean) {
	const workflowsConfig = mock<WorkflowsConfig>({ useWorkflowPublicationService });
	const workflowRepository = mock<WorkflowRepository>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const service = new WorkflowToolWorkflowLoader(
		workflowsConfig,
		workflowRepository,
		workflowPublishedDataService,
	);

	return { service, workflowRepository, workflowPublishedDataService };
}

describe('WorkflowToolWorkflowLoader', () => {
	it('loads the current publication directly from the database when publication service is enabled', async () => {
		const { service, workflowRepository, workflowPublishedDataService } = makeService(true);
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(makeWorkflow());
		workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue({
			...makeWorkflow(),
			versionId: 'published-version-2',
			nodes: [{ id: 'published-node' }],
		} as unknown as PublishedWorkflowDataForExecution);

		const workflow = await service.loadPublishedWorkflow('project-1', reference);

		expect(workflowRepository.findOneByAgentToolReference).toHaveBeenCalledWith(
			'project-1',
			reference,
		);
		expect(workflowPublishedDataService.getPublishedWorkflowDataForExecution).toHaveBeenCalledWith(
			'workflow-1',
		);
		expect(
			workflowPublishedDataService.getCachedPublishedWorkflowDataForExecution,
		).not.toHaveBeenCalled();
		expect(workflow).toMatchObject({
			versionId: 'published-version-2',
			nodes: [{ id: 'published-node' }],
		});
		expect(workflow?.pinData).toBeUndefined();
	});

	it('loads activeVersion when publication service is disabled', async () => {
		const { service, workflowRepository, workflowPublishedDataService } = makeService(false);
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(makeWorkflow());
		workflowRepository.findById.mockResolvedValue(
			makeWorkflow({
				activeVersion: {
					versionId: 'active-version-3',
					nodes: [{ id: 'active-node' }],
					connections: { Trigger: { main: [[]] } },
					nodeGroups: [],
				} as unknown as NonNullable<WorkflowEntity['activeVersion']>,
			}),
		);

		const workflow = await service.loadPublishedWorkflow('project-1', reference);

		expect(
			workflowPublishedDataService.getPublishedWorkflowDataForExecution,
		).not.toHaveBeenCalled();
		expect(workflow).toMatchObject({
			versionId: 'active-version-3',
			nodes: [{ id: 'active-node' }],
			connections: { Trigger: { main: [[]] } },
		});
		expect(workflow?.pinData).toBeUndefined();
	});

	it.each([
		['unshared', null, makeWorkflow()],
		['unpublished', makeWorkflow(), null],
	] as const)('returns null when the workflow is %s', async (_label, accessible, published) => {
		const { service, workflowRepository, workflowPublishedDataService } = makeService(true);
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(accessible);
		workflowPublishedDataService.getPublishedWorkflowDataForExecution.mockResolvedValue(
			published as PublishedWorkflowDataForExecution | null,
		);

		await expect(service.loadPublishedWorkflow('project-1', reference)).resolves.toBeNull();
	});
});
