import { WorkflowRepository, WorkflowEntity } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import { AgentHitlWorkflowRepository } from '../../repositories/agent-hitl-workflow.repository';

it('creates one archived project owner for conversation approval executions', async () => {
	const workflows = mock<WorkflowRepository>();
	const repository = new AgentHitlWorkflowRepository(workflows);
	workflows.findOneByAgentToolReference.mockResolvedValue(null);
	const id = await repository.ensureExecutionOwner('project', 'agent');
	expect(workflows.createWorkflowWithOwner).toHaveBeenCalledWith(
		expect.objectContaining({
			id,
			isArchived: true,
			activeVersionId: null,
			nodes: [],
			connections: {},
		}),
		'project',
	);
	workflows.findOneByAgentToolReference.mockResolvedValue(mock<WorkflowEntity>({ id }));
	expect(await repository.ensureExecutionOwner('project', 'agent')).toBe(id);
	expect(workflows.createWorkflowWithOwner).toHaveBeenCalledOnce();
});
it('reuses the owner after another request creates it', async () => {
	const workflows = mock<WorkflowRepository>();
	const repository = new AgentHitlWorkflowRepository(workflows);
	workflows.findOneByAgentToolReference
		.mockResolvedValueOnce(null)
		.mockResolvedValueOnce(mock<WorkflowEntity>());
	workflows.createWorkflowWithOwner.mockRejectedValue(new Error('Concurrent create'));
	await expect(repository.ensureExecutionOwner('project', 'agent')).resolves.toMatch(/^hitl/);
});
it('preserves a create failure when no project owner exists', async () => {
	const workflows = mock<WorkflowRepository>();
	const repository = new AgentHitlWorkflowRepository(workflows);
	workflows.findOneByAgentToolReference.mockResolvedValue(null);
	workflows.createWorkflowWithOwner.mockRejectedValue(new Error('Create failed'));
	await expect(repository.ensureExecutionOwner('project', 'agent')).rejects.toThrow(
		'Create failed',
	);
});
