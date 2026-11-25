import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, WorkflowRepository, SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { AgentHitlWorkflowRepository } from '@/modules/agents/repositories/agent-hitl-workflow.repository';
import { AgentProjectDeletionRepository } from '@/modules/agents/repositories/agent-project-deletion.repository';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createAgent } from '../shared/db/agents';

describe('Private approval execution ownership', () => {
	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
	});
	afterAll(async () => {
		await testDb.terminate();
	});

	it('reuses an unshared owner without changing the Agent revision', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		const owners = Container.get(AgentHitlWorkflowRepository);
		const id = await owners.ensureExecutionOwner(project.id, agent.id);
		expect(await Container.get(WorkflowRepository).findOneBy({ id })).toMatchObject({
			id,
			isArchived: true,
			nodes: [],
		});
		expect(await Container.get(SharedWorkflowRepository).countBy({ workflowId: id })).toBe(0);
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
		expect(await owners.ensureExecutionOwner(project.id, agent.id)).toBe(id);
		expect(await Container.get(AgentRepository).findOneBy({ id: agent.id })).toMatchObject({
			updatedAt: agent.updatedAt,
		});
	});

	it('scopes ownership to each Agent and rejects a different project', async () => {
		const first = await createTeamProject();
		const second = await createTeamProject();
		const firstAgent = await createAgent({ projectId: first.id });
		const secondAgent = await createAgent({ projectId: second.id });
		const owners = Container.get(AgentHitlWorkflowRepository);
		const firstOwner = await owners.ensureExecutionOwner(first.id, firstAgent.id);
		const secondOwner = await owners.ensureExecutionOwner(second.id, secondAgent.id);
		expect(firstOwner).not.toBe(secondOwner);
		const workflows = Container.get(WorkflowRepository);
		expect((await workflows.findOneByOrFail({ id: firstOwner })).name).not.toBe(
			(await workflows.findOneByOrFail({ id: secondOwner })).name,
		);
		await expect(owners.ensureExecutionOwner(second.id, firstAgent.id)).rejects.toThrow(
			'Agent not found',
		);
	});
	it('does not create an execution owner while its project is being deleted', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		await Container.get(AgentProjectDeletionRepository).beginDeletion(project.id);
		await expect(
			Container.get(AgentHitlWorkflowRepository).ensureExecutionOwner(project.id, agent.id),
		).rejects.toThrow('project is being deleted');
		expect(await Container.get(AgentRepository).findOneBy({ id: agent.id })).toHaveProperty(
			'approvalWorkflowId',
			null,
		);
	});
	it('keeps an Agent when a private execution owner appears after cleanup', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		const owners = Container.get(AgentHitlWorkflowRepository);
		const ownerId = await owners.ensureExecutionOwner(project.id, agent.id);
		const agents = Container.get(AgentRepository);
		await expect(agents.removeAfterApprovalCleanup(agent.id, project.id)).rejects.toThrow(
			'approval started during cleanup',
		);
		expect(await agents.findOneBy({ id: agent.id })).not.toBeNull();
		await owners.detachExecutionOwner(project.id, agent.id, ownerId);
		await owners.deleteDetachedExecutionOwner(ownerId);
		await agents.removeAfterApprovalCleanup(agent.id, project.id);
		expect(await agents.findOneBy({ id: agent.id })).toBeNull();
		await expect(owners.ensureExecutionOwner(project.id, agent.id)).rejects.toThrow(
			'Agent not found',
		);
	});

	it('keeps an Agent while an unconsumed decision workflow receipt exists', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		const jobs = Container.get(AgentBackgroundJobRepository);
		const job = await jobs.save(
			jobs.create({
				kind: 'approval',
				status: 'running',
				parentAgentId: agent.id,
				parentThreadId: 'thread',
				parentResourceId: 'resource',
				parentPrincipalHash: 'principal',
				title: 'Review',
			}),
		);
		const agents = Container.get(AgentRepository);
		await expect(agents.removeAfterApprovalCleanup(agent.id, project.id)).rejects.toThrow(
			'approval started during cleanup',
		);
		expect(await agents.findOneBy({ id: agent.id })).not.toBeNull();
		await jobs.update(job.id, { status: 'cancelled' });
		await expect(agents.removeAfterApprovalCleanup(agent.id, project.id)).rejects.toThrow(
			'approval started during cleanup',
		);
		expect(await agents.findOneBy({ id: agent.id })).not.toBeNull();
		await jobs.update(job.id, { notifiedAt: new Date() });
		await agents.removeAfterApprovalCleanup(agent.id, project.id);
		expect(await agents.findOneBy({ id: agent.id })).toBeNull();
		await expect(
			jobs.save(
				jobs.create({
					kind: 'approval',
					status: 'running',
					parentAgentId: agent.id,
					parentThreadId: 'thread',
					parentResourceId: 'resource',
					parentPrincipalHash: 'principal',
					title: 'Late review',
				}),
			),
		).rejects.toThrow();
	});

	it('stops resolving a detached owner and deletes it only after detachment', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		const owners = Container.get(AgentHitlWorkflowRepository);
		const ownerId = await owners.ensureExecutionOwner(project.id, agent.id);
		expect(await owners.findExecutionProject(ownerId)).toMatchObject({ id: project.id });

		await owners.deleteDetachedExecutionOwner(ownerId);
		expect(await Container.get(WorkflowRepository).findOneBy({ id: ownerId })).not.toBeNull();

		await owners.detachExecutionOwner(project.id, agent.id, ownerId);
		expect(await owners.findExecutionProject(ownerId)).toBeUndefined();
		expect(await Container.get(AgentRepository).findOneBy({ id: agent.id })).toMatchObject({
			approvalWorkflowId: null,
			updatedAt: agent.updatedAt,
		});

		await owners.deleteDetachedExecutionOwner(ownerId);
		expect(await Container.get(WorkflowRepository).findOneBy({ id: ownerId })).toBeNull();
	});

	it('consumes only the settled approval receipts with the given ids', async () => {
		const project = await createTeamProject();
		const agent = await createAgent({ projectId: project.id });
		const jobs = Container.get(AgentBackgroundJobRepository);
		const create = async (status: 'running' | 'completed' | 'failed', title: string) =>
			await jobs.save(
				jobs.create({
					kind: 'approval',
					status,
					parentAgentId: agent.id,
					parentThreadId: 'thread',
					parentResourceId: 'resource',
					parentPrincipalHash: 'principal',
					title,
				}),
			);
		const completed = await create('completed', 'Completed review');
		const active = await create('running', 'Active review');
		const other = await create('failed', 'Other review');

		await jobs.consumeSettledApprovals([completed.id, active.id]);

		expect(await jobs.findById(completed.id)).toMatchObject({ notifiedAt: expect.any(Date) });
		expect(await jobs.findById(active.id)).toMatchObject({ notifiedAt: null });
		expect(await jobs.findById(other.id)).toMatchObject({ notifiedAt: null });
	});
});
