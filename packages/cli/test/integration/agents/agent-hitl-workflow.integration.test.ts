import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { ExecutionRepository, WorkflowRepository, SharedWorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { AgentHitlWorkflowRepository } from '@/modules/agents/repositories/agent-hitl-workflow.repository';
import { AgentProjectDeletionRepository } from '@/modules/agents/repositories/agent-project-deletion.repository';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

async function createAgent(projectId: string) {
	const agents = Container.get(AgentRepository);
	return await agents.save(
		agents.create({
			id: generateNanoId(),
			name: 'Reviewer',
			projectId,
			integrations: [],
			tools: {},
			skills: {},
		}),
	);
}

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
		const agent = await createAgent(project.id);
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
		const firstAgent = await createAgent(first.id);
		const secondAgent = await createAgent(second.id);
		const owners = Container.get(AgentHitlWorkflowRepository);
		expect(await owners.ensureExecutionOwner(first.id, firstAgent.id)).not.toBe(
			await owners.ensureExecutionOwner(second.id, secondAgent.id),
		);
		await expect(owners.ensureExecutionOwner(second.id, firstAgent.id)).rejects.toThrow(
			'Agent not found',
		);
	});
	it('does not create an execution owner while its project is being deleted', async () => {
		const project = await createTeamProject();
		const agent = await createAgent(project.id);
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
		const agent = await createAgent(project.id);
		const owners = Container.get(AgentHitlWorkflowRepository);
		const ownerId = await owners.ensureExecutionOwner(project.id, agent.id);
		const agents = Container.get(AgentRepository);
		await expect(agents.removeAfterApprovalCleanup(agent.id, project.id)).rejects.toThrow(
			'approval started during cleanup',
		);
		expect(await agents.findOneBy({ id: agent.id })).not.toBeNull();
		await owners.deleteExecutionOwner(project.id, agent.id, ownerId);
		await agents.removeAfterApprovalCleanup(agent.id, project.id);
		expect(await agents.findOneBy({ id: agent.id })).toBeNull();
		await expect(owners.ensureExecutionOwner(project.id, agent.id)).rejects.toThrow(
			'Agent not found',
		);
	});

	it('keeps an Agent while an unconsumed decision workflow receipt exists', async () => {
		const project = await createTeamProject();
		const agent = await createAgent(project.id);
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
		await jobs.update(job.id, { status: 'cancelled', notifiedAt: new Date() });
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
});
