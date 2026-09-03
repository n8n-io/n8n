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

	it('returns all pending rows but wakes only rows with parent identity', async () => {
		await insertJob({ id: uuid(), parentThreadId: 'thread-1' });
		await insertJob({
			id: uuid(),
			parentThreadId: 'thread-1',
			parentResourceId: null,
			parentPrincipalHash: null,
		});

		const pending = await repository.count({ where: { parentThreadId: 'thread-1' } });
		const wakeable = await repository.findWakeableUnconsumedSettled('thread-1');

		expect(pending).toBe(2);
		expect(wakeable).toHaveLength(1);
		expect(wakeable[0]?.parentResourceId).toBe('draft-chat:user-1');
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

		await expect(repository.markMailConsumed('thread-1', [selectedId, runningId])).resolves.toBe(1);

		const selected = await repository.findById(selectedId);
		const other = await repository.findById(otherId);
		const running = await repository.findById(runningId);
		expect(selected?.notifiedAt).toBeInstanceOf(Date);
		expect(other?.notifiedAt).toBeNull();
		expect(running?.notifiedAt).toBeNull();
	});

	it('returns each wakeable thread once and accepts a 255-character resource id', async () => {
		const resourceId = 'r'.repeat(255);
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-1', parentResourceId: resourceId });
		await insertJob({ id: uuid(), parentThreadId: 'thread-2', parentResourceId: resourceId });
		await insertJob({
			id: uuid(),
			parentThreadId: 'legacy-thread',
			parentResourceId: null,
			parentPrincipalHash: null,
		});

		const threadIds = await repository.findThreadsWithUnconsumedMail();
		expect(threadIds.sort()).toEqual(['thread-1', 'thread-2']);
		const [job] = await repository.findWakeableUnconsumedSettled('thread-1');
		expect(job?.parentResourceId).toHaveLength(255);
	});

	it('settles, debounces, retries, and consumes the same durable row', async () => {
		vi.useFakeTimers();
		try {
			const jobId = uuid();
			// An owner passes the wake's agent:execute check through its global role.
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
