/* eslint-disable @typescript-eslint/unbound-method */
import type { CredentialsEntity, OperationContext, TransactionRunner } from '@n8n/db';
import type { DataSource, SelectQueryBuilder } from '@n8n/typeorm';
import { mock, type MockProxy } from 'vitest-mock-extended';

import { mockEntityManager } from '@test/mocking';

import { AgentCredentialDependency } from '../entities/agent-credential-dependency.entity';
import type { AgentHistory } from '../entities/agent-history.entity';
import { Agent } from '../entities/agent.entity';
import { AgentCredentialDependencyRepository } from '../repositories/agent-credential-dependency.repository';

const entityManager = mockEntityManager(AgentCredentialDependency);
const mockDataSource = { manager: entityManager };

const makeAgent = (): Agent =>
	({
		id: 'agent-1',
		schema: {
			name: 'Support Agent',
			model: 'openai/gpt-4.1-mini',
			instructions: 'Help the user',
			credential: 'credential-draft',
			memory: {
				enabled: true,
				storage: 'n8n',
				episodicMemory: { enabled: true, credential: 'credential-shared' },
			},
		},
		integrations: [{ type: 'slack', credentialId: 'credential-integration' }],
		activeVersionId: 'published-version-1',
	}) as Agent;

const makePublishedVersion = (): AgentHistory =>
	({
		versionId: 'published-version-1',
		agentId: 'agent-1',
		schema: {
			name: 'Support Agent',
			model: 'openai/gpt-4.1-mini',
			instructions: 'Help the user',
			credential: 'credential-published',
			tools: [
				{
					type: 'node',
					name: 'OpenAI tool',
					node: {
						nodeType: 'n8n-nodes-base.openAiTool',
						nodeTypeVersion: 1,
						nodeParameters: {},
						credentials: {
							openAiApi: { id: 'credential-shared', name: 'OpenAI account' },
						},
					},
				},
			],
		},
	}) as unknown as AgentHistory;

describe('AgentCredentialDependencyRepository', () => {
	let repository: AgentCredentialDependencyRepository;
	let txRunner: MockProxy<TransactionRunner>;
	let credentialQuery: MockProxy<SelectQueryBuilder<CredentialsEntity>>;

	beforeEach(() => {
		vi.clearAllMocks();
		Object.assign(entityManager.connection, { options: { type: 'sqlite' } });
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);
		credentialQuery = mock<SelectQueryBuilder<CredentialsEntity>>();
		credentialQuery.select.mockReturnValue(credentialQuery);
		credentialQuery.where.mockReturnValue(credentialQuery);
		entityManager.createQueryBuilder.mockReturnValue(credentialQuery);
		repository = new AgentCredentialDependencyRepository(
			mockDataSource as unknown as DataSource,
			txRunner,
		);
	});

	it('atomically rebuilds the union of draft and published credential references', async () => {
		const agent = makeAgent();
		const publishedVersion = makePublishedVersion();
		entityManager.findOne.mockImplementation(async (entity) => {
			if (entity === Agent) return agent;
			return publishedVersion;
		});
		credentialQuery.getMany.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'credential-draft' }),
			mock<CredentialsEntity>({ id: 'credential-shared' }),
			mock<CredentialsEntity>({ id: 'credential-integration' }),
			mock<CredentialsEntity>({ id: 'credential-published' }),
		]);

		await repository.refreshForAgent(agent.id);

		expect(entityManager.delete).toHaveBeenCalledWith(AgentCredentialDependency, {
			agentId: agent.id,
		});
		expect(entityManager.insert).toHaveBeenCalledWith(AgentCredentialDependency, [
			{
				agentId: agent.id,
				credentialId: 'credential-draft',
			},
			{
				agentId: agent.id,
				credentialId: 'credential-shared',
			},
			{
				agentId: agent.id,
				credentialId: 'credential-integration',
			},
			{
				agentId: agent.id,
				credentialId: 'credential-published',
			},
		]);
	});

	it('filters stale credential ids without failing the replacement', async () => {
		const agent = makeAgent();
		agent.activeVersionId = null;
		entityManager.findOne.mockResolvedValue(agent);
		credentialQuery.getMany.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'credential-draft' }),
		]);

		await repository.refreshForAgent(agent.id);

		expect(entityManager.insert).toHaveBeenCalledWith(AgentCredentialDependency, [
			{
				agentId: agent.id,
				credentialId: 'credential-draft',
			},
		]);
	});

	it('leaves the replacement empty when the agent no longer exists', async () => {
		entityManager.findOne.mockResolvedValue(null);

		await repository.refreshForAgent('deleted-agent');

		expect(entityManager.delete).toHaveBeenCalledWith(AgentCredentialDependency, {
			agentId: 'deleted-agent',
		});
		expect(entityManager.createQueryBuilder).not.toHaveBeenCalled();
		expect(entityManager.insert).not.toHaveBeenCalled();
	});

	it('locks the current agent and referenced credentials before replacing rows on Postgres', async () => {
		Object.assign(entityManager.connection, { options: { type: 'postgres' } });
		const agent = makeAgent();
		agent.activeVersionId = null;
		entityManager.findOne.mockResolvedValue(agent);
		credentialQuery.getMany.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'credential-draft' }),
		]);

		await repository.refreshForAgent(agent.id);

		expect(entityManager.findOne).toHaveBeenCalledWith(Agent, {
			where: { id: agent.id },
			lock: { mode: 'pessimistic_write' },
		});
		expect(credentialQuery.setLock).toHaveBeenCalledWith('pessimistic_write');
		expect(credentialQuery.getMany.mock.invocationCallOrder[0]).toBeLessThan(
			entityManager.delete.mock.invocationCallOrder[0],
		);
	});
});
