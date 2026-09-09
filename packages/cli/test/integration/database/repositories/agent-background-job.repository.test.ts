import { LockService, type Logger } from '@n8n/backend-common';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { InstanceSettings } from 'n8n-core';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import type { ExecutionPersistence } from '@/executions/execution-persistence';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import { AgentBackgroundJobService } from '@/modules/agents/background/agent-background-job.service';
import { AgentWakeService, WAKE_DEBOUNCE_MS } from '@/modules/agents/background/agent-wake.service';
import type { AgentBackgroundJob } from '@/modules/agents/entities/agent-background-job.entity';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import type { ChatIntegrationRegistry } from '@/modules/agents/integrations/agent-chat-integration';
import { AgentBackgroundJobRepository } from '@/modules/agents/repositories/agent-background-job.repository';
import type { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createOwner } from '../../shared/db/users';

describe('AgentBackgroundJobRepository', () => {
	let repository: AgentBackgroundJobRepository;
	let agentRepository: AgentRepository;
	let agentId: string;

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		repository = Container.get(AgentBackgroundJobRepository);
		agentRepository = Container.get(AgentRepository);
	});

	beforeEach(async () => {
		const project = await createTeamProject();
		const agent = agentRepository.create({
			id: uuid(),
			name: 'Test Agent',
			projectId: project.id,
			integrations: [],
			tools: {},
			skills: {},
		} as Partial<Agent>);
		await agentRepository.save(agent);
		agentId = agent.id;
	});

	afterEach(async () => {
		await repository.delete({});
		await agentRepository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function insertJob(
		overrides: Partial<AgentBackgroundJob> & { id: string; parentThreadId: string },
	) {
		await repository.insert({
			kind: 'subagent',
			status: 'completed',
			parentAgentId: agentId,
			parentResourceId: 'draft-chat:user-1',
			parentPrincipalHash: 'principal-hash',
			title: 'Research',
			subAgentId: uuid(),
			childThreadId: uuid(),
			settledAt: new Date(),
			...overrides,
		});
	}

	it('returns unconsumed settled rows of one thread, oldest settlement first', async () => {
		const olderId = uuid();
		const newerId = uuid();
		await insertJob({ id: newerId, parentThreadId: 'thread-1', settledAt: new Date() });
		await insertJob({
			id: olderId,
			parentThreadId: 'thread-1',
			settledAt: new Date(Date.now() - 60_000),
		});
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', notifiedAt: new Date() });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', status: 'running', settledAt: null });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2' });

		const pending = await repository.findWakeableUnconsumedSettled('thread-1');

		expect(pending.map((job) => job.id)).toEqual([olderId, newerId]);
	});

	it('consumes only selected settled rows from the requested thread', async () => {
		const selectedId = uuid();
		const otherId = uuid();
		const runningId = uuid();
		await insertJob({ id: selectedId, parentThreadId: 'thread-1' });
		await insertJob({ id: otherId, parentThreadId: 'thread-1' });
		await insertJob({
			id: runningId,
			parentThreadId: 'thread-1',
			status: 'running',
			settledAt: null,
		});

		const foreignId = uuid();
		await insertJob({ id: foreignId, parentThreadId: 'thread-2' });

		await expect(repository.markMailConsumed('thread-1', [])).resolves.toBe(0);
		await expect(
			repository.markMailConsumed('thread-1', [selectedId, runningId, foreignId]),
		).resolves.toBe(1);

		const selected = await repository.findById(selectedId);
		const other = await repository.findById(otherId);
		const running = await repository.findById(runningId);
		const foreign = await repository.findById(foreignId);
		expect(selected?.notifiedAt).toBeInstanceOf(Date);
		expect(other?.notifiedAt).toBeNull();
		expect(running?.notifiedAt).toBeNull();
		expect(foreign?.notifiedAt).toBeNull();
	});

	it('deletes old settled jobs only if their results are marked as delivered', async () => {
		const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
		const consumedId = uuid();
		const pendingId = uuid();
		const recentId = uuid();
		await insertJob({
			id: consumedId,
			parentThreadId: 'thread-1',
			settledAt: old,
			notifiedAt: old,
		});
		await insertJob({ id: pendingId, parentThreadId: 'thread-1', settledAt: old });
		await insertJob({ id: recentId, parentThreadId: 'thread-1', notifiedAt: new Date() });

		await repository.deleteSettledBefore(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

		expect(await repository.findById(consumedId)).toBeNull();
		expect(await repository.findById(pendingId)).not.toBeNull();
		expect(await repository.findById(recentId)).not.toBeNull();
	});

	it('returns each thread with unconsumed mail once and accepts a 255-character resource id', async () => {
		const resourceId = 'r'.repeat(255);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'consumed-thread', notifiedAt: new Date() });

		const threadIds = await repository.findThreadsWithUnconsumedMail();
		expect(threadIds.sort()).toEqual(['thread-1', 'thread-2']);
		const [job] = await repository.findWakeableUnconsumedSettled('thread-1');
		expect(job?.parentResourceId).toHaveLength(255);
	});

	it('settles a job, delays its wake, retries delivery, and marks the result as delivered', async () => {
		vi.useFakeTimers();
		try {
			const jobId = uuid();
			// The owner role grants the agent:execute permission required for a wake.
			const user = await createOwner();
			const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: user.id });
			await insertJob({
				id: jobId,
				parentThreadId: 'thread-1',
				status: 'running',
				settledAt: null,
				parentResourceId: `draft-chat:${user.id}`,
				parentPrincipalHash: principalHash,
			});

			const executionRepository = mock<AgentExecutionRepository>();
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			const checkpointStorage = mock<N8NCheckpointStorage>();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			const orchestrator = mock<AgentExecutionOrchestratorService>();
			let firstWakeStarted!: () => void;
			const firstWake = new Promise<void>((resolve) => (firstWakeStarted = resolve));
			orchestrator.executeForWake.mockImplementationOnce(async () => {
				firstWakeStarted();
				throw new Error('model unavailable');
			});
			const lockService = Container.get(LockService);
			const publisher = mock<Publisher>();
			const agentsConfig = mock<AgentsConfig>({ backgroundTasksEnabled: true });
			const logger = mock<Logger>();
			logger.scoped.mockReturnValue(logger);
			const userRepository = mock<UserRepository>();
			userRepository.findByIdWithRole.mockResolvedValue(user);
			const markMailConsumed = repository.markMailConsumed.bind(repository);
			let mailConsumed!: () => void;
			const consumed = new Promise<void>((resolve) => (mailConsumed = resolve));
			vi.spyOn(repository, 'markMailConsumed').mockImplementation(async (...args) => {
				const affected = await markMailConsumed(...args);
				mailConsumed();
				return affected;
			});
			const wakeService = new AgentWakeService(
				repository,
				executionRepository,
				agentRepository,
				userRepository,
				checkpointStorage,
				mock<ChatIntegrationRegistry>(),
				orchestrator,
				lockService,
				publisher,
				mock<InstanceSettings>({ isWorker: false }),
				agentsConfig,
				logger,
			);
			Container.set(AgentWakeService, wakeService);
			const jobService = new AgentBackgroundJobService(
				repository,
				executionRepository,
				mock<ExecutionPersistence>(),
				publisher,
				logger,
				agentsConfig,
			);

			await jobService.settle(jobId, { status: 'completed', result: 'Done' });
			await vi.advanceTimersByTimeAsync(WAKE_DEBOUNCE_MS);
			await firstWake;
			expect((await repository.findById(jobId))?.notifiedAt).toBeNull();

			let secondWakeStarted!: () => void;
			const secondWake = new Promise<void>((resolve) => (secondWakeStarted = resolve));
			orchestrator.executeForWake.mockImplementationOnce(async () => secondWakeStarted());
			await wakeService.requestWake('thread-1');
			await vi.advanceTimersByTimeAsync(WAKE_DEBOUNCE_MS);
			await secondWake;
			await consumed;

			expect(orchestrator.executeForWake).toHaveBeenCalledTimes(2);
			expect((await repository.findById(jobId))?.notifiedAt).toBeInstanceOf(Date);
		} finally {
			vi.restoreAllMocks();
			vi.useRealTimers();
		}
	});
});
