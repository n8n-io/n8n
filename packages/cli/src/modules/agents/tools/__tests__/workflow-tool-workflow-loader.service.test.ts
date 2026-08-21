import type { WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

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

function makeService() {
	const workflowRepository = mock<WorkflowRepository>();
	const service = new WorkflowToolWorkflowLoader(workflowRepository);

	return { service, workflowRepository };
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
});
