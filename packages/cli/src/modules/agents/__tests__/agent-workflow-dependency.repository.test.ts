/* eslint-disable @typescript-eslint/unbound-method */
import { type OperationContext, type TransactionRunner, WorkflowEntity } from '@n8n/db';
import { type DataSource, In, type SelectQueryBuilder } from '@n8n/typeorm';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import type { AgentHistory } from '../entities/agent-history.entity';
import { AgentWorkflowDependency } from '../entities/agent-workflow-dependency.entity';
import { Agent } from '../entities/agent.entity';
import { AgentWorkflowDependencyRepository } from '../repositories/agent-workflow-dependency.repository';

const entityManager = mockEntityManager(AgentWorkflowDependency);
const mockDataSource = { manager: entityManager };

const makeAgent = (): Agent =>
	({
		id: 'agent-1',
		projectId: 'project-1',
		schema: {
			name: 'Tool Agent',
			model: 'openai/gpt-4.1-mini',
			instructions: 'Help the user',
			tools: [
				{ type: 'workflow', workflow: 'Draft WF', workflowId: 'wf-draft' },
				{ type: 'workflow', workflow: 'Legacy WF' },
			],
		},
		activeVersionId: 'published-version-1',
	}) as Agent;

const makePublishedVersion = (): AgentHistory =>
	({
		versionId: 'published-version-1',
		agentId: 'agent-1',
		schema: {
			name: 'Tool Agent',
			model: 'openai/gpt-4.1-mini',
			instructions: 'Help the user',
			tools: [{ type: 'workflow', workflow: 'Published WF', workflowId: 'wf-published' }],
		},
	}) as unknown as AgentHistory;

const workflows = (...ids: string[]) => ids.map((id) => mock<WorkflowEntity>({ id }));

describe('AgentWorkflowDependencyRepository', () => {
	let repository: AgentWorkflowDependencyRepository;
	let txRunner: MockProxy<TransactionRunner>;
	let lockQuery: MockProxy<SelectQueryBuilder<WorkflowEntity>>;

	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(entityManager.connection, { options: { type: 'sqlite' } });
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);
		lockQuery = mock<SelectQueryBuilder<WorkflowEntity>>();
		lockQuery.select.mockReturnValue(lockQuery);
		lockQuery.where.mockReturnValue(lockQuery);
		lockQuery.orderBy.mockReturnValue(lockQuery);
		lockQuery.setLock.mockReturnValue(lockQuery);
		entityManager.createQueryBuilder.mockReturnValue(lockQuery);
		repository = new AgentWorkflowDependencyRepository(
			mockDataSource as unknown as DataSource,
			txRunner,
		);
	});

	it('rebuilds the union of draft and published workflow references, by id and by legacy name', async () => {
		const agent = makeAgent();
		entityManager.findOne.mockImplementation(async (entity) => {
			if (entity === Agent) return agent;
			return makePublishedVersion();
		});
		entityManager.find.mockResolvedValue(workflows('wf-draft', 'wf-legacy', 'wf-published'));

		await repository.refreshForAgent(agent.id);

		expect(entityManager.find).toHaveBeenCalledWith(WorkflowEntity, {
			where: [
				{ id: In(['wf-draft', 'wf-published']), shared: { projectId: 'project-1' } },
				{ name: In(['Legacy WF']), shared: { projectId: 'project-1' } },
			],
			select: ['id'],
		});
		expect(entityManager.delete).toHaveBeenCalledWith(AgentWorkflowDependency, {
			agentId: agent.id,
		});
		expect(entityManager.insert).toHaveBeenCalledWith(AgentWorkflowDependency, [
			{ agentId: agent.id, workflowId: 'wf-draft' },
			{ agentId: agent.id, workflowId: 'wf-legacy' },
			{ agentId: agent.id, workflowId: 'wf-published' },
		]);
	});

	it('only inserts rows for workflows that resolve inside the agent project', async () => {
		const agent = makeAgent();
		agent.activeVersionId = null;
		entityManager.findOne.mockResolvedValue(agent);
		entityManager.find.mockResolvedValue(workflows('wf-draft'));

		await repository.refreshForAgent(agent.id);

		expect(entityManager.insert).toHaveBeenCalledWith(AgentWorkflowDependency, [
			{ agentId: agent.id, workflowId: 'wf-draft' },
		]);
	});

	it('leaves the replacement empty when the agent no longer exists', async () => {
		entityManager.findOne.mockResolvedValue(null);

		await repository.refreshForAgent('deleted-agent');

		expect(entityManager.delete).toHaveBeenCalledWith(AgentWorkflowDependency, {
			agentId: 'deleted-agent',
		});
		expect(entityManager.find).not.toHaveBeenCalled();
		expect(entityManager.insert).not.toHaveBeenCalled();
	});

	it('locks the agent and the resolved workflows before replacing rows on Postgres', async () => {
		Object.assign(entityManager.connection, { options: { type: 'postgres' } });
		const agent = makeAgent();
		agent.activeVersionId = null;
		entityManager.findOne.mockResolvedValue(agent);
		entityManager.find.mockResolvedValue(workflows('wf-draft'));
		lockQuery.getMany.mockResolvedValue(workflows('wf-draft'));

		await repository.refreshForAgent(agent.id);

		expect(entityManager.findOne).toHaveBeenCalledWith(Agent, {
			where: { id: agent.id },
			lock: { mode: 'pessimistic_write' },
		});
		expect(lockQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
		expect(lockQuery.getMany.mock.invocationCallOrder[0]).toBeLessThan(
			entityManager.delete.mock.invocationCallOrder[0],
		);
		expect(entityManager.insert).toHaveBeenCalledWith(AgentWorkflowDependency, [
			{ agentId: agent.id, workflowId: 'wf-draft' },
		]);
	});
});
