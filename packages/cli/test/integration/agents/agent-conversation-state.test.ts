import type { SerializableAgentState } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { AgentsConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { TransactionRunner } from '@n8n/db';
import { AgentMessageQueueRepository } from '@/modules/agents/repositories/agent-message-queue.repository';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

import { AgentConversationStateService } from '@/modules/agents/agent-conversation-state.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

const suspended: SerializableAgentState = {
	status: 'suspended',
	persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {},
};

describe('Agent conversation state', () => {
	let checkpoints: AgentCheckpointRepository;
	let executions: AgentExecutionRepository;
	let threads: AgentExecutionThreadRepository;
	let agents: AgentRepository;
	let storage: N8NCheckpointStorage;
	let inspector: AgentConversationStateService;
	let peer: DataSource;
	let peerStorage: N8NCheckpointStorage;
	let agent: Agent;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		checkpoints = Container.get(AgentCheckpointRepository);
		executions = Container.get(AgentExecutionRepository);
		threads = Container.get(AgentExecutionThreadRepository);
		agents = Container.get(AgentRepository);
		storage = Container.get(N8NCheckpointStorage);
		inspector = Container.get(AgentConversationStateService);
		peer = await new DataSource({
			...Container.get(DataSource).options,
			synchronize: false,
			migrationsRun: false,
			dropSchema: false,
		}).initialize();
		peerStorage = new N8NCheckpointStorage(
			new AgentCheckpointRepository(peer, Container.get(TransactionRunner)),
			Container.get(Logger),
			Container.get(AgentsConfig),
			Container.get(TransactionRunner),
			Container.get(AgentExecutionRepository),
			Container.get(AgentExecutionThreadRepository),
			Container.get(AgentMessageQueueRepository),
		);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		agent = await agents.save(
			agents.create({
				id: randomUUID(),
				name: 'Agent',
				projectId: project.id,
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
	});

	afterEach(async () => {
		await checkpoints.delete({});
		await executions.delete({});
		await threads.delete({});
		await agents.delete({});
	});

	afterAll(async () => {
		if (peer?.isInitialized) await peer.destroy();
		await testDb.terminate();
	});

	it('limits checkpoint reads to one agent and thread and selects the newest parent suspension', async () => {
		const otherAgent = await agents.save(agents.create({ ...agent, id: randomUUID() }));
		const parent = { ...suspended, iterationCount: 2 };
		const rows = [
			{ runId: 'older', state: JSON.stringify(suspended) },
			{ runId: 'parent', state: JSON.stringify(parent) },
			{
				runId: 'child',
				state: JSON.stringify({
					...suspended,
					persistence: { ...suspended.persistence, delegated: true },
				}),
			},
			{ runId: 'running', state: JSON.stringify({ ...suspended, status: 'running' }) },
			{ runId: 'cancelled', state: JSON.stringify({ ...suspended, status: 'cancelled' }) },
			{ runId: 'expired', state: JSON.stringify(suspended), expired: true },
			{ runId: 'other-agent', state: JSON.stringify(suspended), agentId: otherAgent.id },
			{ runId: 'other-thread', state: JSON.stringify(suspended), threadId: 'thread-2' },
		];
		await checkpoints.insert(
			rows.map((row, index) => ({
				agentId: agent.id,
				threadId: 'thread-1',
				expired: false,
				updatedAt: new Date(Date.now() - (rows.length - index) * 1000),
				...row,
			})),
		);

		expect(
			(await checkpoints.findActiveForThread(agent.id, 'thread-1', new Date(0))).map(
				({ runId }) => runId,
			),
		).toEqual(['cancelled', 'running', 'child', 'parent', 'older']);
		expect(await storage.findSuspendedForThread(agent.id, 'thread-1')).toEqual(parent);
	});

	it('keeps running and suspension facts independent of historical suspension', async () => {
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: false,
			suspendedCheckpoint: null,
		});
		await storage.save('run-1', suspended, agent.id);
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: false,
			suspendedCheckpoint: suspended,
		});

		await threads.save(
			threads.create({
				id: 'thread-1',
				agentId: agent.id,
				agentName: agent.name,
				projectId: agent.projectId,
				sessionNumber: 1,
			}),
		);
		await executions.save(
			executions.create({
				id: randomUUID(),
				threadId: 'thread-1',
				status: 'success',
				hitlStatus: 'suspended',
			}),
		);
		await storage.claimForResume('run-1', suspended, agent.id);
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: false,
			suspendedCheckpoint: null,
		});

		const running = await executions.save(
			executions.create({
				id: randomUUID(),
				threadId: 'thread-1',
				status: 'running',
			}),
		);
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: true,
			suspendedCheckpoint: null,
		});
		const resuspended = { ...suspended, iterationCount: 2 };
		await storage.save('run-1', resuspended, agent.id);
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: true,
			suspendedCheckpoint: resuspended,
		});
		await executions.update(running.id, { status: 'success' });
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: false,
			suspendedCheckpoint: resuspended,
		});

		await storage.cancelSuspended('run-1', resuspended, agent.id);
		expect(await inspector.inspect(agent.id, 'thread-1')).toEqual({
			running: false,
			suspendedCheckpoint: null,
		});
		expect(await storage.getStatus('run-1', agent.id)).toEqual({
			status: 'expired',
			checkpoint: resuspended,
		});
	});

	it('updates and clears the indexed key when a checkpoint is replaced', async () => {
		await storage.save('run-1', suspended, agent.id);
		await storage.save(
			'run-1',
			{
				...suspended,
				persistence: { threadId: 'thread-2', resourceId: 'resource-1' },
			},
			agent.id,
		);

		expect(await storage.findSuspendedForThread(agent.id, 'thread-1')).toBeNull();
		expect(
			(await storage.findSuspendedForThread(agent.id, 'thread-2'))?.persistence?.threadId,
		).toBe('thread-2');
		await storage.save('run-1', { ...suspended, persistence: undefined }, agent.id);
		expect(await storage.findSuspendedForThread(agent.id, 'thread-2')).toBeNull();
		expect((await checkpoints.findByRunId('run-1'))?.threadId).toBeNull();
	});

	it('allows one competing resume and rejects the old claim after another suspension', async () => {
		await storage.save('run-1', suspended, agent.id);
		const [first, second] = await Promise.all([
			storage.load('run-1', agent.id),
			peerStorage.load('run-1', agent.id),
		]);
		expect(first).toEqual(suspended);
		expect(second).toEqual(suspended);

		const claimed = await Promise.all([
			storage.claimForResume('run-1', first!, agent.id),
			peerStorage.claimForResume('run-1', second!, agent.id),
		]);
		expect(claimed.sort()).toEqual([false, true]);
		expect(await checkpoints.findByRunId('run-1')).toMatchObject({
			threadId: 'thread-1',
			expired: false,
			state: JSON.stringify({ ...suspended, status: 'running' }),
		});

		const resuspended = { ...suspended, iterationCount: 2 };
		await storage.save('run-1', resuspended, agent.id);
		expect(await peerStorage.claimForResume('run-1', second!, agent.id)).toBe(false);
		expect(await storage.findSuspendedForThread(agent.id, 'thread-1')).toEqual(resuspended);
	});
});
