import type { Mock } from 'vitest';
import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings, ScheduledTaskManager } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { AgentTask } from '../entities/agent-task.entity';
import type { Agent } from '../entities/agent.entity';
import type {
	AgentTaskRunLockHandle,
	AgentTaskRunLockRepository,
} from '../repositories/agent-task-run-lock.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const AGENT_ID = 'agent-1';

const agentTaskGroup = (id = AGENT_ID) => ({ type: 'agent-task', id });

function makeTask(overrides: Partial<AgentTask> = {}): AgentTask {
	return {
		id: 'task-1',
		agentId: AGENT_ID,
		name: 'Daily summary',
		objective: 'Summarize messages',
		cronExpression: '0 9 * * *',
		createdAt: new Date('2026-01-01T08:00:00.000Z'),
		updatedAt: new Date('2026-01-02T08:00:00.000Z'),
		...overrides,
	} as AgentTask;
}

/**
 * `tasks` are the PUBLISHED config refs (on `activeVersion.schema`) and the DRAFT
 * refs (on `schema`). Pass refs via overrides to exercise scheduling.
 */
function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: AGENT_ID,
		projectId: 'project-1',
		versionId: 'ver-1',
		activeVersionId: 'ver-1',
		activeVersion: { versionId: 'ver-1', publishedById: 'user-1', schema: { tasks: [] } },
		schema: { name: 'A', model: 'anthropic/x', instructions: 'do', tasks: [] },
		...overrides,
	} as Agent;
}

function makePublishedAgent(
	refs: Array<{ id: string; enabled: boolean }>,
	overrides: Partial<Agent> = {},
): Agent {
	return makeAgent({
		activeVersion: {
			versionId: 'ver-1',
			publishedById: 'user-1',
			schema: { tasks: refs.map((ref) => ({ type: 'task', id: ref.id, enabled: ref.enabled })) },
		},
		...overrides,
	} as Partial<Agent>);
}

function makeSnapshot(overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot {
	return {
		versionId: 'ver-1',
		taskId: 'task-1',
		enabled: true,
		name: 'Daily summary',
		objective: 'Summarize messages',
		cronExpression: '0 9 * * *',
		createdAt: new Date('2026-01-01T08:00:00.000Z'),
		updatedAt: new Date('2026-01-02T08:00:00.000Z'),
		...overrides,
	} as AgentTaskSnapshot;
}

function makeRunLock(overrides: Partial<AgentTaskRunLockHandle> = {}): AgentTaskRunLockHandle {
	return {
		agentId: AGENT_ID,
		taskId: 'task-1',
		holderId: 'holder-1',
		heldUntil: new Date('2026-01-01T08:05:00.000Z'),
		...overrides,
	};
}

async function* emptyStream(): AsyncGenerator<never> {}

// eslint-disable-next-line require-yield
async function* throwingStream(): AsyncGenerator<never> {
	throw new Error('execution failed');
}

async function runTaskOf(
	service: AgentTaskService,
	agentId: string,
	taskId: string,
): Promise<void> {
	await (service as unknown as { runTask(agentId: string, taskId: string): Promise<void> }).runTask(
		agentId,
		taskId,
	);
}

async function runScheduledTaskOf(
	service: AgentTaskService,
	agentId: string,
	taskId: string,
): Promise<void> {
	await (
		service as unknown as { runScheduledTask(agentId: string, taskId: string): Promise<void> }
	).runScheduledTask(agentId, taskId);
}

async function flushAsyncWork(): Promise<void> {
	await new Promise((resolve) => setImmediate(resolve));
}

describe('AgentTaskService', () => {
	const logger = mock<Logger>();
	const globalConfig = {
		generic: { timezone: 'UTC' },
		multiMainSetup: { enabled: false },
	} as unknown as GlobalConfig;
	let taskRepository: ReturnType<typeof mock<AgentTaskRepository>>;
	let taskSnapshotRepository: ReturnType<typeof mock<AgentTaskSnapshotRepository>>;
	let taskRunLockRepository: ReturnType<typeof mock<AgentTaskRunLockRepository>>;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let agentExecutionOrchestratorService: ReturnType<typeof mock<AgentExecutionOrchestratorService>>;
	let agentTaskScheduler: ReturnType<typeof mock<ScheduledTaskManager>>;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let txManager: { save: Mock; remove: Mock };
	let service: AgentTaskService;

	function setMultiMain(enabled: boolean): void {
		(globalConfig.multiMainSetup as { enabled: boolean }).enabled = enabled;
	}

	/** Build a service with a specific leadership role — cron registration is leader-only. */
	function buildService(isLeader: boolean): AgentTaskService {
		return new AgentTaskService(
			logger,
			globalConfig,
			taskRepository,
			taskSnapshotRepository,
			taskRunLockRepository,
			agentRepository,
			agentExecutionOrchestratorService,
			mock<InstanceSettings>({ isLeader }),
			agentTaskScheduler,
			publisher,
		);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		setMultiMain(false);
		taskRepository = mock<AgentTaskRepository>();
		taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
		taskRunLockRepository = mock<AgentTaskRunLockRepository>();
		taskRunLockRepository.acquire.mockResolvedValue(makeRunLock());
		taskRunLockRepository.renew.mockResolvedValue(true);
		taskRunLockRepository.release.mockResolvedValue(undefined);
		// `create` fills the body so `save`/`toDto` see a complete entity.
		(taskRepository.create as unknown as Mock).mockImplementation((data: Partial<AgentTask>) =>
			makeTask(data),
		);
		agentRepository = mock<AgentRepository>();
		// `manager` is a TypeORM getter, not auto-mocked; run transaction callbacks
		// against a manager that records save/remove.
		txManager = {
			save: vi.fn(async (e: unknown) => e),
			remove: vi.fn(async (e: unknown) => e),
		};
		(agentRepository as unknown as { manager: unknown }).manager = {
			transaction: vi.fn(
				async (cb: (m: typeof txManager) => Promise<unknown>) => await cb(txManager),
			),
		};
		agentExecutionOrchestratorService = mock<AgentExecutionOrchestratorService>();
		agentTaskScheduler = mock<ScheduledTaskManager>();
		agentTaskScheduler.register.mockReturnValue(true);
		agentTaskScheduler.getTargetIds.mockReturnValue([]);
		agentTaskScheduler.hasTarget.mockReturnValue(false);
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue(undefined);
		// Default to the leader so existing registration assertions hold.
		service = buildService(true);
	});

	describe('create', () => {
		it('creates the body and attaches a config ref enabled', async () => {
			const agent = makeAgent({
				schema: { name: 'a', model: 'm', instructions: 'i', tasks: [] },
			} as Partial<Agent>);
			(agentRepository.findOne as Mock).mockResolvedValue(agent);

			const dto = await service.create(AGENT_ID, {
				name: 'Daily',
				objective: 'Do X',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(dto.id).toMatch(/^task_/);
			expect(dto.name).toBe('Daily');
			expect(taskRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringMatching(/^task_/),
					agentId: AGENT_ID,
					name: 'Daily',
					objective: 'Do X',
					cronExpression: '0 9 * * *',
				}),
			);
			expect(agent.schema?.tasks).toEqual([
				{ type: 'task', id: expect.stringMatching(/^task_/), enabled: true },
			]);
			expect(txManager.save).toHaveBeenCalled();
		});

		it('rejects an invalid cron without creating', async () => {
			await expect(
				service.create(AGENT_ID, {
					name: 'x',
					objective: 'y',
					cronExpression: 'not-a-cron',
					enabled: true,
				}),
			).rejects.toThrow(BadRequestError);
			expect(taskRepository.create).not.toHaveBeenCalled();
		});

		it('does not register a cron job on create (scheduling follows publish)', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makeAgent({
					schema: { name: 'a', model: 'm', instructions: 'i', tasks: [] },
				} as Partial<Agent>),
			);

			await service.create(AGENT_ID, {
				name: 'x',
				objective: 'y',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(agentTaskScheduler.register).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('maps task bodies to DTOs', async () => {
			(taskRepository.findByAgentId as Mock).mockResolvedValue([
				makeTask({ id: 't1' }),
				makeTask({ id: 't2' }),
			]);

			const result = await service.list(AGENT_ID);

			expect(result.map((task) => task.id)).toEqual(['t1', 't2']);
		});

		it('serializes timestamps to ISO strings', async () => {
			(taskRepository.findByAgentId as Mock).mockResolvedValue([makeTask()]);

			const [dto] = await service.list(AGENT_ID);

			expect(dto.createdAt).toBe('2026-01-01T08:00:00.000Z');
			expect(dto.updatedAt).toBe('2026-01-02T08:00:00.000Z');
		});
	});

	describe('update', () => {
		it('updates body fields without registering a cron (publish-driven)', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(task);
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent());

			const dto = await service.update(AGENT_ID, 'task-1', { cronExpression: '0 10 * * *' });

			expect(dto.cronExpression).toBe('0 10 * * *');
			expect(task.cronExpression).toBe('0 10 * * *');
			expect(txManager.save).toHaveBeenCalled();
			expect(agentTaskScheduler.register).not.toHaveBeenCalled();
		});

		it('is a no-op when no field changes (skips the agent write)', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(task);

			const dto = await service.update(AGENT_ID, 'task-1', {
				name: task.name,
				objective: task.objective,
				cronExpression: task.cronExpression,
			});

			expect(dto.cronExpression).toBe(task.cronExpression);
			expect(agentRepository.findOne).not.toHaveBeenCalled();
			expect(txManager.save).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when updating a missing task', async () => {
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(null);
			await expect(service.update(AGENT_ID, 'missing', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('delete', () => {
		it('throws NotFoundError when the task is missing', async () => {
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(null);
			await expect(service.delete(AGENT_ID, 'missing')).rejects.toThrow(NotFoundError);
			expect(txManager.remove).not.toHaveBeenCalled();
		});

		it('removes the body and drops its config ref', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(task);
			const agent = makeAgent({
				schema: {
					name: 'a',
					model: 'm',
					instructions: 'i',
					tasks: [{ type: 'task', id: 'task-1', enabled: true }],
				},
			} as Partial<Agent>);
			(agentRepository.findOne as Mock).mockResolvedValue(agent);

			await service.delete(AGENT_ID, 'task-1');

			expect(txManager.remove).toHaveBeenCalledWith(task);
			expect(agent.schema?.tasks).toEqual([]);
		});

		it('does not stop a live cron job until the next publish reconcile', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(task);
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent());

			await service.delete(AGENT_ID, 'task-1');

			expect(agentTaskScheduler.deregisterTarget).not.toHaveBeenCalled();
		});
	});

	describe('registerEnabledForAgent', () => {
		it('registers a cron job for each enabled published task snapshot', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(agentTaskScheduler.register).toHaveBeenCalledWith(
				{
					group: agentTaskGroup(),
					targetId: 'task-1',
					expression: '0 9 * * *',
					timezone: 'UTC',
				},
				expect.any(Function),
			);
		});

		it('does not register tasks disabled in the published config', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: false }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(agentTaskScheduler.register).not.toHaveBeenCalled();
		});

		it('registers nothing when the agent is unpublished', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent({ activeVersionId: null }));

			await service.registerEnabledForAgent(AGENT_ID);

			expect(agentTaskScheduler.register).not.toHaveBeenCalled();
		});

		it('does not register cron jobs on a follower (leader owns the cron)', async () => {
			const follower = buildService(false);
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);

			await follower.registerEnabledForAgent(AGENT_ID);

			expect(agentTaskScheduler.register).not.toHaveBeenCalled();
		});

		it('deregisters tasks missing from the enabled published snapshots', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);
			agentTaskScheduler.getTargetIds.mockReturnValue(['task-1', 'stale-task']);
			agentTaskScheduler.hasTarget.mockImplementation((_group, taskId) => taskId === 'stale-task');

			await service.registerEnabledForAgent(AGENT_ID);

			expect(agentTaskScheduler.deregisterTarget).toHaveBeenCalledWith(
				agentTaskGroup(),
				'stale-task',
			);
			expect(agentTaskScheduler.deregisterTarget).not.toHaveBeenCalledWith(
				agentTaskGroup(),
				'task-1',
			);
		});

		it('skips a cron tick while the same task is already running', async () => {
			let finishRun!: () => void;
			// eslint-disable-next-line require-yield
			async function* blockingStream(): AsyncGenerator<never> {
				await new Promise<void>((resolve) => {
					finishRun = resolve;
				});
			}
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
			taskRunLockRepository.acquire
				.mockResolvedValueOnce(makeRunLock())
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(makeRunLock({ holderId: 'holder-2' }));
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock)
				.mockReturnValueOnce(blockingStream())
				.mockReturnValueOnce(emptyStream());

			await service.registerEnabledForAgent(AGENT_ID);
			const onTick = agentTaskScheduler.register.mock.calls[0][1] as () => void;

			onTick();
			await flushAsyncWork();
			onTick();
			await flushAsyncWork();

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith(
				'[AgentTaskService] Skipping task because previous run is still active',
				expect.objectContaining({ taskId: 'task-1', agentId: AGENT_ID }),
			);

			finishRun();
			await flushAsyncWork();
			onTick();
			await flushAsyncWork();

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledTimes(2);
			expect(taskRunLockRepository.release).toHaveBeenCalledTimes(2);
		});

		it('uses the shared lock to skip a tick after leader handoff while a previous leader run is active', async () => {
			let finishRun!: () => void;
			// eslint-disable-next-line require-yield
			async function* blockingStream(): AsyncGenerator<never> {
				await new Promise<void>((resolve) => {
					finishRun = resolve;
				});
			}
			const previousLeader = service;
			const nextLeader = buildService(true);
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
			taskRunLockRepository.acquire
				.mockResolvedValueOnce(makeRunLock({ holderId: 'old-leader' }))
				.mockResolvedValueOnce(null);
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock).mockReturnValueOnce(
				blockingStream(),
			);

			await previousLeader.registerEnabledForAgent(AGENT_ID);
			const previousLeaderTick = agentTaskScheduler.register.mock.calls[0][1] as () => void;
			previousLeaderTick();
			await flushAsyncWork();

			await nextLeader.registerEnabledForAgent(AGENT_ID);
			const nextLeaderTick = agentTaskScheduler.register.mock.calls[1][1] as () => void;
			nextLeaderTick();
			await flushAsyncWork();

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith(
				'[AgentTaskService] Skipping task because previous run is still active',
				expect.objectContaining({ taskId: 'task-1', agentId: AGENT_ID }),
			);

			finishRun();
			await flushAsyncWork();
		});
	});

	describe('requestReconcile', () => {
		it('broadcasts a task reconcile in multi-main mode', async () => {
			setMultiMain(true);
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent({ activeVersionId: null }));

			await service.requestReconcile(AGENT_ID);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-tasks-changed',
				payload: { agentId: AGENT_ID },
			});
		});

		it('does not broadcast in single-main mode', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent({ activeVersionId: null }));

			await service.requestReconcile(AGENT_ID);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('handleTasksChanged', () => {
		it('reconciles the agent so the leader registers its enabled tasks', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as Mock).mockResolvedValue([makeSnapshot()]);

			await service.handleTasksChanged({ agentId: AGENT_ID });

			expect(agentTaskScheduler.register).toHaveBeenCalledWith(
				{
					group: agentTaskGroup(),
					targetId: 'task-1',
					expression: '0 9 * * *',
					timezone: 'UTC',
				},
				expect.any(Function),
			);
		});
	});

	describe('deregisterAgentTasks', () => {
		it("stops only the matching agent's jobs", async () => {
			agentTaskScheduler.getTargetIds
				.mockReturnValueOnce([])
				.mockReturnValueOnce([])
				.mockReturnValueOnce(['a-task']);
			agentTaskScheduler.deregisterGroup.mockReturnValue(true);
			(agentRepository.findOne as Mock)
				.mockResolvedValueOnce(
					makePublishedAgent([{ id: 'a-task', enabled: true }], { id: 'agent-a' }),
				)
				.mockResolvedValueOnce(
					makePublishedAgent([{ id: 'b-task', enabled: true }], { id: 'agent-b' }),
				);
			(taskSnapshotRepository.findEnabledByVersionId as Mock)
				.mockResolvedValueOnce([makeSnapshot({ taskId: 'a-task' })])
				.mockResolvedValueOnce([makeSnapshot({ taskId: 'b-task' })]);

			await service.registerEnabledForAgent('agent-a');
			await service.registerEnabledForAgent('agent-b');

			service.deregisterAgentTasks('agent-a');

			expect(agentTaskScheduler.deregisterGroup).toHaveBeenCalledWith(agentTaskGroup('agent-a'));
			expect(agentTaskScheduler.deregisterGroup).not.toHaveBeenCalledWith(
				agentTaskGroup('agent-b'),
			);
		});
	});

	describe('runTask', () => {
		const publishedAgentWithTask = (enabled: boolean) =>
			makePublishedAgent([{ id: 'task-1', enabled }]);

		it('runs the published agent with the objective', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock).mockReturnValue(
				emptyStream(),
			);

			await runTaskOf(service, AGENT_ID, 'task-1');

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					projectId: 'project-1',
					taskId: 'task-1',
					taskVersionId: 'ver-1',
					message: expect.stringContaining('Summarize messages'),
					memory: expect.objectContaining({ resourceId: 'task:task-1' }),
				}),
			);
			expect(taskRepository.update).not.toHaveBeenCalled();
		});

		it('uses the published snapshot body, not the live draft row', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(
				makeSnapshot({ objective: 'Published objective' }),
			);
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock).mockReturnValue(
				emptyStream(),
			);

			await runTaskOf(service, AGENT_ID, 'task-1');

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('Published objective') }),
			);
			// The scheduled path never reads the live draft body.
			expect(taskRepository.findOne).not.toHaveBeenCalled();
		});

		it('skips when the agent is unpublished', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent({ activeVersionId: null }));

			await runTaskOf(service, AGENT_ID, 'task-1');

			expect(agentExecutionOrchestratorService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('skips when the published task snapshot is not enabled', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(
				makeSnapshot({ enabled: false }),
			);

			await runTaskOf(service, AGENT_ID, 'task-1');

			expect(agentExecutionOrchestratorService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('logs when execution throws', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock).mockReturnValue(
				throwingStream(),
			);

			await runTaskOf(service, AGENT_ID, 'task-1');

			expect(taskRepository.update).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				'[AgentTaskService] Task run failed',
				expect.objectContaining({ taskId: 'task-1' }),
			);
		});

		it('allows a later scheduled run after a failed execution completes', async () => {
			(agentRepository.findOne as Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
			(agentExecutionOrchestratorService.executeForTaskPublished as Mock)
				.mockReturnValueOnce(throwingStream())
				.mockReturnValueOnce(emptyStream());

			await runScheduledTaskOf(service, AGENT_ID, 'task-1');
			await runScheduledTaskOf(service, AGENT_ID, 'task-1');

			expect(agentExecutionOrchestratorService.executeForTaskPublished).toHaveBeenCalledTimes(2);
			expect(taskRunLockRepository.release).toHaveBeenCalledTimes(2);
		});

		it('renews the task run lock while a scheduled run is active', async () => {
			vi.useFakeTimers();
			try {
				let finishRun!: () => void;
				// eslint-disable-next-line require-yield
				async function* blockingStream(): AsyncGenerator<never> {
					await new Promise<void>((resolve) => {
						finishRun = resolve;
					});
				}
				(agentRepository.findOne as Mock).mockResolvedValue(publishedAgentWithTask(true));
				(taskSnapshotRepository.findByVersionAndTaskId as Mock).mockResolvedValue(makeSnapshot());
				(agentExecutionOrchestratorService.executeForTaskPublished as Mock).mockReturnValue(
					blockingStream(),
				);

				const run = runScheduledTaskOf(service, AGENT_ID, 'task-1');
				await Promise.resolve();
				await Promise.resolve();

				await vi.advanceTimersByTimeAsync(60_000);

				expect(taskRunLockRepository.renew).toHaveBeenCalledWith(
					expect.objectContaining({ agentId: AGENT_ID, taskId: 'task-1' }),
					expect.any(Number),
				);

				finishRun();
				await run;
			} finally {
				vi.useRealTimers();
			}
		});
	});

	describe('stopAll', () => {
		it('stops local cron jobs without touching distributed run locks', async () => {
			service.stopAll();

			expect(agentTaskScheduler.deregisterGroups).toHaveBeenCalledWith('agent-task');
			expect(taskRunLockRepository.release).not.toHaveBeenCalled();
		});
	});

	describe('runNow', () => {
		const requestingUser = mock<User>({ id: 'user-9' });

		it('runs the task immediately as the requesting user even when unpublished', async () => {
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent({ activeVersionId: null }));
			(agentExecutionOrchestratorService.executeForTaskNow as Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', requestingUser);

			expect(agentExecutionOrchestratorService.executeForTaskNow).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					projectId: 'project-1',
					user: requestingUser,
					taskId: 'task-1',
					message: expect.stringContaining('Summarize messages'),
					memory: expect.objectContaining({ resourceId: 'task:task-1' }),
				}),
			);
		});

		it('throws NotFoundError when the task does not exist', async () => {
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(null);

			await expect(service.runNow(AGENT_ID, 'missing', requestingUser)).rejects.toThrow(
				NotFoundError,
			);
			expect(agentExecutionOrchestratorService.executeForTaskNow).not.toHaveBeenCalled();
		});

		it('does not write the task row after a manual run', async () => {
			(taskRepository.findByIdAndAgentId as Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as Mock).mockResolvedValue(makeAgent());
			(agentExecutionOrchestratorService.executeForTaskNow as Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', requestingUser);
			await new Promise((resolve) => setImmediate(resolve));

			expect(taskRepository.update).not.toHaveBeenCalled();
		});
	});
});
