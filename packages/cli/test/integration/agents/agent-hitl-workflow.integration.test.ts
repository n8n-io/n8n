import { createTeamProject, testDb } from '@n8n/backend-test-utils';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { AgentHitlWorkflowRepository } from '@/modules/agents/repositories/agent-hitl-workflow.repository';

describe('Conversation approval execution ownership', () => {
	beforeAll(async () => {
		await testDb.init();
	});
	afterAll(async () => {
		await testDb.terminate();
	});

	it('keeps a durable execution under a reusable archived project workflow', async () => {
		const project = await createTeamProject();
		const owners = Container.get(AgentHitlWorkflowRepository);
		const id = await owners.ensureExecutionOwner(project.id, 'agent');
		const workflow = await Container.get(WorkflowRepository).findOneByAgentToolReference(
			project.id,
			{ workflowId: id, workflowName: 'Agent approvals' },
		);
		expect(workflow).toMatchObject({ id, isArchived: true, nodes: [] });
		const executions = Container.get(ExecutionRepository);
		const inserted = await executions.insert({
			workflowId: id,
			status: 'waiting',
			finished: false,
			mode: 'integrated',
			createdAt: new Date(),
			waitTill: new Date('9999-12-31'),
		});
		expect(await executions.findOneBy({ id: String(inserted.identifiers[0].id) })).toMatchObject({
			workflowId: id,
			status: 'waiting',
		});
		expect(await owners.ensureExecutionOwner(project.id, 'agent')).toBe(id);
	});

	it('uses a different workflow owner for another project', async () => {
		const first = await createTeamProject();
		const second = await createTeamProject();
		const owners = Container.get(AgentHitlWorkflowRepository);
		expect(await owners.ensureExecutionOwner(first.id, 'agent')).not.toBe(
			await owners.ensureExecutionOwner(second.id, 'agent'),
		);
	});
});
