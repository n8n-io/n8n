import type { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { WorkflowPublishedDataService } from '@/workflows/workflow-published-data.service';

import { WorkflowToolUnavailableError } from '../workflow-tool-unavailable-error';
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
		...overrides,
	} as unknown as WorkflowEntity;
}

function makeService({ useWorkflowPublicationService = false } = {}) {
	const workflowRepository = mock<WorkflowRepository>();
	const workflowPublishedDataService = mock<WorkflowPublishedDataService>();
	const service = new WorkflowToolWorkflowLoader(
		workflowRepository,
		{ useWorkflowPublicationService } as WorkflowsConfig,
		workflowPublishedDataService,
	);

	return { service, workflowRepository, workflowPublishedDataService };
}

describe('WorkflowToolWorkflowLoader', () => {
	it('loads the current draft without requiring a published version', async () => {
		const { service, workflowRepository } = makeService();
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(
			makeWorkflow({ versionId: 'draft-version' }),
		);

		const workflow = await service.loadWorkflow('project-1', reference);

		expect(workflowRepository.findOneByAgentToolReference).toHaveBeenCalledWith(
			'project-1',
			reference,
			{ withActiveVersion: false },
		);
		expect(workflow).toMatchObject({
			versionId: 'draft-version',
			nodes: [{ id: 'draft-node' }],
		});
		expect(workflow?.pinData).toBeUndefined();
	});

	it.each([
		['unshared', null],
		['archived', makeWorkflow({ isArchived: true })],
	] as const)('returns null when the workflow is %s', async (_label, workflow) => {
		const { service, workflowRepository } = makeService();
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(workflow);

		await expect(service.loadWorkflow('project-1', reference)).resolves.toBeNull();
	});

	it('loads the published version content for production runs', async () => {
		const { service, workflowRepository } = makeService();
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(
			makeWorkflow({
				activeVersion: {
					nodes: [{ id: 'published-node' }],
					connections: { Published: {} },
				},
			} as unknown as Partial<WorkflowEntity>),
		);

		const workflow = await service.loadWorkflow('project-1', reference, {
			usePublishedVersion: true,
		});

		expect(workflowRepository.findOneByAgentToolReference).toHaveBeenCalledWith(
			'project-1',
			reference,
			{ withActiveVersion: true },
		);
		expect(workflow).toMatchObject({
			nodes: [{ id: 'published-node' }],
			connections: { Published: {} },
		});
		expect(workflow?.pinData).toBeUndefined();
	});

	it('throws when a production run references a never-published workflow', async () => {
		const { service, workflowRepository } = makeService();
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(
			makeWorkflow({ activeVersion: null } as unknown as Partial<WorkflowEntity>),
		);

		const error = await service
			.loadWorkflow('project-1', reference, { usePublishedVersion: true })
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(WorkflowToolUnavailableError);
		expect(error).toMatchObject({
			reason: 'not_published',
			message:
				'Workflow "Workflow" is not published. Publish it so the published agent can use it.',
		});
	});

	it('reads the published version from the publication service when enabled', async () => {
		const { service, workflowRepository, workflowPublishedDataService } = makeService({
			useWorkflowPublicationService: true,
		});
		workflowRepository.findOneByAgentToolReference.mockResolvedValue(makeWorkflow());
		workflowPublishedDataService.getPublishedWorkflowData.mockResolvedValue({
			workflow: makeWorkflow(),
			publishedVersion: {
				nodes: [{ id: 'published-node' }],
				connections: { Published: {} },
			},
		} as never);

		const workflow = await service.loadWorkflow('project-1', reference, {
			usePublishedVersion: true,
		});

		expect(workflowPublishedDataService.getPublishedWorkflowData).toHaveBeenCalledWith(
			'workflow-1',
		);
		expect(workflow).toMatchObject({ nodes: [{ id: 'published-node' }] });
	});
});
