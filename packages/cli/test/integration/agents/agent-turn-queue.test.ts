import type { StreamChunk } from '@n8n/agents';
import { createTeamProject, mockLogger, testDb, testModules } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { UserRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ErrorReporter, StorageConfig } from 'n8n-core';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '@/modules/agents/agent-chat-attachment.service';
import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import type { AgentExecutionUpdateBroadcaster } from '@/modules/agents/agent-execution-update-broadcaster';
import { AgentInterruptedExecutionSweeper } from '@/modules/agents/agent-interrupted-execution-sweeper';
import {
	AgentTurnQueueService,
	type AgentTurnSubmission,
} from '@/modules/agents/agent-turn-queue.service';
import type { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import { AgentWakeService } from '@/modules/agents/background/agent-wake.service';
import { ExecutionRecorder } from '@/modules/agents/execution-recorder';
import type { AgentExecutionLogStore } from '@/modules/agents/execution-log/agent-execution-log-store';
import type { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '@/modules/agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import type { Telemetry } from '@/telemetry';

import { createOwner } from '../shared/db/users';

describe('agent turn queue across independent runners', () => {
	let repository: AgentExecutionRepository;
	let threadRepository: AgentExecutionThreadRepository;
	let agentRepository: AgentRepository;
	let user: User;
	let projectId: string;
	let agentId: string;
	let threadId: string;
	const ran: Array<{ executionId: string; message: string; previewChat?: boolean }> = [];
	const wakeService = mock<AgentWakeService>();

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentExecutionRepository);
		threadRepository = Container.get(AgentExecutionThreadRepository);
		agentRepository = Container.get(AgentRepository);
		user = await createOwner();
		Container.set(AgentWakeService, wakeService);
	});

	beforeEach(async () => {
		// Control owner heartbeats without changing database or test timeouts.
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
		ran.length = 0;
		projectId = (await createTeamProject()).id;
		agentId = uuid();
		threadId = uuid();
		await agentRepository.save(
			agentRepository.create({
				id: agentId,
				projectId,
				name: 'Queue test agent',
				integrations: [],
				tools: {},
				skills: {},
			}),
		);
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				agentId,
				projectId,
				agentName: 'Queue test agent',
				title: 'Queue test',
				sessionNumber: 1,
			}),
		);
	});

	afterEach(async () => {
		vi.clearAllTimers();
		vi.useRealTimers();
		await repository.delete({});
		await threadRepository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => await testDb.terminate());

	function createRunner() {
		const logger = mockLogger();
		const executionService = new AgentExecutionService(
			logger,
			repository,
			threadRepository,
			mock<N8nMemory>(),
			mock<Telemetry>(),
			mock<AgentChatAttachmentService>(),
			mock<AgentExecutionLogStore>(),
			mock<StorageConfig>({ modeTag: 'db' }),
			mock<ErrorReporter>(),
			mock<AgentExecutionUpdateBroadcaster>(),
		);
		const orchestrator = mock<AgentExecutionOrchestratorService>();
		// Stub the model boundary. Admission, claims, finalization and recovery use the database.
		orchestrator.executeForChat.mockImplementation(
			async function* (config, claim): AsyncGenerator<StreamChunk> {
				ran.push({
					executionId: claim.executionId,
					message: config.message,
					previewChat: config.previewChat,
				});
				const recorder = new ExecutionRecorder();
				const finish = { type: 'finish', finishReason: 'stop' } as const;
				recorder.record(finish);
				yield finish;
				await executionService.finalizeExecution(claim.executionId, {
					agentId: config.agentId,
					projectId: config.projectId,
					threadId: config.memory.threadId,
					userMessage: config.message,
					record: recorder.getMessageRecord(),
				});
				await claim.release();
			},
		);
		const queue = new AgentTurnQueueService(
			logger,
			repository,
			threadRepository,
			executionService,
			agentRepository,
			Container.get(UserRepository),
			mock<N8NCheckpointStorage>(),
			orchestrator,
		);
		const sweeper = new AgentInterruptedExecutionSweeper(
			logger,
			repository,
			executionService,
			queue,
			mock<AgentBackgroundJobService>(),
			wakeService,
			mock<AgentsConfig>({ backgroundTasksEnabled: false }),
		);
		return { queue, sweeper };
	}

	function messageTurn(userMessage: string): AgentTurnSubmission {
		return {
			agentId,
			projectId,
			threadId,
			userMessage,
			resourceId: `draft-chat:${user.id}`,
			runContext: { kind: 'message', previewChat: false },
		};
	}

	it('allows only one runner to claim the same thread', async () => {
		const first = createRunner();
		const second = createRunner();

		const claims = await Promise.all([
			first.queue.tryRunNow(messageTurn('first')),
			second.queue.tryRunNow(messageTurn('second')),
		]);

		expect(claims.filter((claim) => claim !== null)).toHaveLength(1);
		const claim = claims.find((candidate) => candidate !== null);
		if (!claim) throw new Error('Expected a claimed turn');
		expect(await repository.findBy({ threadId })).toEqual([
			expect.objectContaining({ id: claim.executionId, status: 'running' }),
		]);
		await claim.fail(new Error('Run stopped'));
		expect(await repository.countBy({ threadId, status: 'running' })).toBe(0);
	});

	it('recovers waiting turns with a fresh runner without another incoming message', async () => {
		const owner = createRunner();
		const other = createRunner();
		const first = await owner.queue.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected a claimed turn');
		const second = await other.queue.submit(messageTurn('second'));
		const third = await owner.queue.submit({
			...messageTurn('third'),
			runContext: { kind: 'message' },
		});
		if (second.status !== 'queued' || third.status !== 'queued') {
			throw new Error('Expected waiting turns');
		}
		expect(ran).toEqual([]);

		// Simulate an owner that stopped sending heartbeats and never released its claim.
		vi.clearAllTimers();
		await repository.update(first.claim.executionId, {
			updatedAt: new Date(Date.now() - AgentExecutionService.livenessGraceMs - 1_000),
		});
		const recovered = createRunner();
		await recovered.sweeper.sweep();

		await vi.waitFor(async () => {
			const rows = await repository.find({
				where: { threadId },
				order: { enqueueSequence: 'ASC' },
			});
			expect(rows.map(({ id, status }) => ({ id, status }))).toEqual([
				{ id: first.claim.executionId, status: 'interrupted' },
				{ id: second.executionId, status: 'success' },
				{ id: third.executionId, status: 'success' },
			]);
		});
		expect(ran).toEqual([
			{ executionId: second.executionId, message: 'second', previewChat: false },
			{ executionId: third.executionId, message: 'third', previewChat: undefined },
		]);
	});
});
