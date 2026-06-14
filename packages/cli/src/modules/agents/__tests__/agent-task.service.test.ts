import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ProjectRelationRepository } from '@n8n/db';
import { CronJob } from 'cron';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentTaskService } from '../agent-task.service';
import type { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentTask } from '../entities/agent-task.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type {
	AgentTaskRunLockHandle,
	AgentTaskRunLockRepository,
} from '../repositories/agent-task-run-lock.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';

// Keep cron validation + next-occurrence real; only the live CronJob is mocked.
jest.mock('cron', () => {
	const actual = jest.requireActual('cron');
	return { ...actual, CronJob: jest.fn() };
});

const CronJobMock = CronJob as unknown as jest.Mock;
const AGENT_ID = 'agent-1';

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

async function runTaskOf(service: AgentTaskService, taskId: string): Promise<void> {
	await (service as unknown as { runTask(id: string): Promise<void> }).runTask(taskId);
}

async function runScheduledTaskOf(service: AgentTaskService, taskId: string): Promise<void> {
	await (service as unknown as { runScheduledTask(id: string): Promise<void> }).runScheduledTask(
		taskId,
	);
}

async function flushAsyncWork(): Promise<void> {
	await new Promise((resolve) => setImmediate(resolve));
}

/** Seed the live jobs map so `runTask` can resolve the agentId without registering. */
function seedJob(service: AgentTaskService, taskId: string, agentId: string): { stop: jest.Mock } {
	const job = { stop: jest.fn() };
	(
		service as unknown as { jobs: Map<string, { agentId: string; job: { stop: jest.Mock } }> }
	).jobs.set(taskId, { agentId, job });
	return job;
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
	let projectRelationRepository: ReturnType<typeof mock<ProjectRelationRepository>>;
	let agentsService: ReturnType<typeof mock<AgentsService>>;
	let publisher: ReturnType<typeof mock<Publisher>>;
	let txManager: { save: jest.Mock; remove: jest.Mock };
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
			projectRelationRepository,
			agentsService,
			mock<InstanceSettings>({ isLeader }),
			publisher,
		);
	}

	beforeEach(() => {
		jest.clearAllMocks();
		setMultiMain(false);
		CronJobMock.mockImplementation(() => ({ start: jest.fn(), stop: jest.fn() }));
		taskRepository = mock<AgentTaskRepository>();
		taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
		taskRunLockRepository = mock<AgentTaskRunLockRepository>();
		taskRunLockRepository.acquire.mockResolvedValue(makeRunLock());
		taskRunLockRepository.renew.mockResolvedValue(true);
		taskRunLockRepository.release.mockResolvedValue(undefined);
		// `create` fills the body so `save`/`toDto` see a complete entity.
		(taskRepository.create as unknown as jest.Mock).mockImplementation((data: Partial<AgentTask>) =>
			makeTask(data),
		);
		agentRepository = mock<AgentRepository>();
		// `manager` is a TypeORM getter, not auto-mocked; run transaction callbacks
		// against a manager that records save/remove.
		txManager = {
			save: jest.fn(async (e: unknown) => e),
			remove: jest.fn(async (e: unknown) => e),
		};
		(agentRepository as unknown as { manager: unknown }).manager = {
			transaction: jest.fn(
				async (cb: (m: typeof txManager) => Promise<unknown>) => await cb(txManager),
			),
		};
		projectRelationRepository = mock<ProjectRelationRepository>();
		agentsService = mock<AgentsService>();
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
			(agentRepository.findOne as jest.Mock).mockResolvedValue(agent);

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
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
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

			expect(CronJobMock).not.toHaveBeenCalled();
		});
	});

	describe('list', () => {
		it('maps task bodies to DTOs', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ id: 't1' }),
				makeTask({ id: 't2' }),
			]);

			const result = await service.list(AGENT_ID);

			expect(result.map((task) => task.id)).toEqual(['t1', 't2']);
		});

		it('serializes timestamps to ISO strings', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([makeTask()]);

			const [dto] = await service.list(AGENT_ID);

			expect(dto.createdAt).toBe('2026-01-01T08:00:00.000Z');
			expect(dto.updatedAt).toBe('2026-01-02T08:00:00.000Z');
		});
	});

	describe('update', () => {
		it('updates body fields without registering a cron (publish-driven)', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			const dto = await service.update(AGENT_ID, 'task-1', { cronExpression: '0 10 * * *' });

			expect(dto.cronExpression).toBe('0 10 * * *');
			expect(task.cronExpression).toBe('0 10 * * *');
			expect(txManager.save).toHaveBeenCalled();
			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('is a no-op when no field changes (skips the agent write)', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);

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
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.update(AGENT_ID, 'missing', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('delete', () => {
		it('throws NotFoundError when the task is missing', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.delete(AGENT_ID, 'missing')).rejects.toThrow(NotFoundError);
			expect(txManager.remove).not.toHaveBeenCalled();
		});

		it('removes the body and drops its config ref', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			const agent = makeAgent({
				schema: {
					name: 'a',
					model: 'm',
					instructions: 'i',
					tasks: [{ type: 'task', id: 'task-1', enabled: true }],
				},
			} as Partial<Agent>);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(agent);

			await service.delete(AGENT_ID, 'task-1');

			expect(txManager.remove).toHaveBeenCalledWith(task);
			expect(agent.schema?.tasks).toEqual([]);
		});

		it('does not stop a live cron job until the next publish reconcile', async () => {
			const task = makeTask();
			const job = seedJob(service, 'task-1', AGENT_ID);
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			await service.delete(AGENT_ID, 'task-1');

			expect(job.stop).not.toHaveBeenCalled();
		});
	});

	describe('registerEnabledForAgent', () => {
		it('registers a cron job for each enabled published task snapshot', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([
				makeSnapshot(),
			]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).toHaveBeenCalledWith(
				'0 9 * * *',
				expect.any(Function),
				null,
				true,
				'UTC',
			);
		});

		it('does not register tasks disabled in the published config', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: false }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('registers nothing when the agent is unpublished', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('does not register cron jobs on a follower (leader owns the cron)', async () => {
			const follower = buildService(false);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([
				makeSnapshot(),
			]);

			await follower.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('skips a cron tick while the same task is already running', async () => {
			let finishRun!: () => void;
			// eslint-disable-next-line require-yield
			async function* blockingStream(): AsyncGenerator<never> {
				await new Promise<void>((resolve) => {
					finishRun = resolve;
				});
			}
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([
				makeSnapshot(),
			]);
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			taskRunLockRepository.acquire
				.mockResolvedValueOnce(makeRunLock())
				.mockResolvedValueOnce(null)
				.mockResolvedValueOnce(makeRunLock({ holderId: 'holder-2' }));
			(agentsService.executeForTaskPublished as jest.Mock)
				.mockReturnValueOnce(blockingStream())
				.mockReturnValueOnce(emptyStream());

			await service.registerEnabledForAgent(AGENT_ID);
			const onTick = CronJobMock.mock.calls[0][1] as () => void;

			onTick();
			await flushAsyncWork();
			onTick();
			await flushAsyncWork();

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledTimes(1);
			expect(logger.info).toHaveBeenCalledWith(
				'[AgentTaskService] Skipping task because previous run is still active',
				expect.objectContaining({ taskId: 'task-1', agentId: AGENT_ID }),
			);

			finishRun();
			await flushAsyncWork();
			onTick();
			await flushAsyncWork();

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledTimes(2);
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
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([
				makeSnapshot(),
			]);
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			taskRunLockRepository.acquire
				.mockResolvedValueOnce(makeRunLock({ holderId: 'old-leader' }))
				.mockResolvedValueOnce(null);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValueOnce(blockingStream());

			await previousLeader.registerEnabledForAgent(AGENT_ID);
			const previousLeaderTick = CronJobMock.mock.calls[0][1] as () => void;
			previousLeaderTick();
			await flushAsyncWork();

			await nextLeader.registerEnabledForAgent(AGENT_ID);
			const nextLeaderTick = CronJobMock.mock.calls[1][1] as () => void;
			nextLeaderTick();
			await flushAsyncWork();

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledTimes(1);
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
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await service.requestReconcile(AGENT_ID);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'agent-tasks-changed',
				payload: { agentId: AGENT_ID },
			});
		});

		it('does not broadcast in single-main mode', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await service.requestReconcile(AGENT_ID);

			expect(publisher.publishCommand).not.toHaveBeenCalled();
		});
	});

	describe('handleTasksChanged', () => {
		it('reconciles the agent so the leader registers its enabled tasks', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock).mockResolvedValue([
				makeSnapshot(),
			]);

			await service.handleTasksChanged({ agentId: AGENT_ID });

			expect(CronJobMock).toHaveBeenCalledWith(
				'0 9 * * *',
				expect.any(Function),
				null,
				true,
				'UTC',
			);
		});
	});

	describe('deregisterAgentTasks', () => {
		it("stops only the matching agent's jobs", async () => {
			(agentRepository.findOne as jest.Mock)
				.mockResolvedValueOnce(
					makePublishedAgent([{ id: 'a-task', enabled: true }], { id: 'agent-a' }),
				)
				.mockResolvedValueOnce(
					makePublishedAgent([{ id: 'b-task', enabled: true }], { id: 'agent-b' }),
				);
			(taskSnapshotRepository.findEnabledByVersionId as jest.Mock)
				.mockResolvedValueOnce([makeSnapshot({ taskId: 'a-task' })])
				.mockResolvedValueOnce([makeSnapshot({ taskId: 'b-task' })]);

			await service.registerEnabledForAgent('agent-a');
			await service.registerEnabledForAgent('agent-b');
			const jobA = CronJobMock.mock.results[0].value;
			const jobB = CronJobMock.mock.results[1].value;

			service.deregisterAgentTasks('agent-a');

			expect(jobA.stop).toHaveBeenCalled();
			expect(jobB.stop).not.toHaveBeenCalled();
		});
	});

	describe('runTask', () => {
		const publishedAgentWithTask = (enabled: boolean) =>
			makePublishedAgent([{ id: 'task-1', enabled }]);

		it('runs the published agent with the objective', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(emptyStream());

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledWith(
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
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makePublishedAgent([{ id: 'task-1', enabled: true }]),
			);
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot({ objective: 'Published objective' }),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(emptyStream());

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledWith(
				expect.objectContaining({ message: expect.stringContaining('Published objective') }),
			);
			// The scheduled path never reads the live draft body.
			expect(taskRepository.findOne).not.toHaveBeenCalled();
		});

		it('skips when the agent is unpublished', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('skips when no project member is available', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue([]);

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
			expect(taskRepository.update).not.toHaveBeenCalled();
		});

		it('skips when the published task snapshot is not enabled', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot({ enabled: false }),
			);

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('logs when execution throws', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(throwingStream());

			await runTaskOf(service, 'task-1');

			expect(taskRepository.update).not.toHaveBeenCalled();
			expect(logger.error).toHaveBeenCalledWith(
				'[AgentTaskService] Task run failed',
				expect.objectContaining({ taskId: 'task-1' }),
			);
		});

		it('allows a later scheduled run after a failed execution completes', async () => {
			seedJob(service, 'task-1', AGENT_ID);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
				makeSnapshot(),
			);
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock)
				.mockReturnValueOnce(throwingStream())
				.mockReturnValueOnce(emptyStream());

			await runScheduledTaskOf(service, 'task-1');
			await runScheduledTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledTimes(2);
			expect(taskRunLockRepository.release).toHaveBeenCalledTimes(2);
		});

		it('renews the task run lock while a scheduled run is active', async () => {
			jest.useFakeTimers();
			try {
				let finishRun!: () => void;
				// eslint-disable-next-line require-yield
				async function* blockingStream(): AsyncGenerator<never> {
					await new Promise<void>((resolve) => {
						finishRun = resolve;
					});
				}
				seedJob(service, 'task-1', AGENT_ID);
				(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
				(taskSnapshotRepository.findByVersionAndTaskId as jest.Mock).mockResolvedValue(
					makeSnapshot(),
				);
				(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue([
					'user-1',
				]);
				(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(blockingStream());

				const run = runScheduledTaskOf(service, 'task-1');
				await Promise.resolve();
				await Promise.resolve();

				await jest.advanceTimersByTimeAsync(60_000);

				expect(taskRunLockRepository.renew).toHaveBeenCalledWith(
					expect.objectContaining({ agentId: AGENT_ID, taskId: 'task-1' }),
					expect.any(Number),
				);

				finishRun();
				await run;
			} finally {
				jest.useRealTimers();
			}
		});
	});

	describe('stopAll', () => {
		it('stops local cron jobs without touching distributed run locks', async () => {
			const job = seedJob(service, 'task-1', AGENT_ID);

			service.stopAll();

			expect(job.stop).toHaveBeenCalled();
			expect(taskRunLockRepository.release).not.toHaveBeenCalled();
		});
	});

	describe('runNow', () => {
		it('runs the task immediately as the requesting user even when unpublished', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);
			(agentsService.executeForTaskNow as jest.Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', 'user-9');

			expect(agentsService.executeForTaskNow).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					projectId: 'project-1',
					userId: 'user-9',
					taskId: 'task-1',
					message: expect.stringContaining('Summarize messages'),
					memory: expect.objectContaining({ resourceId: 'task:task-1' }),
				}),
			);
		});

		it('throws NotFoundError when the task does not exist', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);

			await expect(service.runNow(AGENT_ID, 'missing', 'user-9')).rejects.toThrow(NotFoundError);
			expect(agentsService.executeForTaskNow).not.toHaveBeenCalled();
		});

		it('does not write the task row after a manual run', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());
			(agentsService.executeForTaskNow as jest.Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', 'user-9');
			await new Promise((resolve) => setImmediate(resolve));

			expect(taskRepository.update).not.toHaveBeenCalled();
		});
	});
});
