import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { ScheduledJobOwnerType } from '@n8n/constants';
import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses } from '@n8n/scheduler';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import { AgentTaskService } from '@/modules/agents/agent-task.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import { AgentHistoryRepository } from '@/modules/agents/repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from '@/modules/agents/repositories/agent-task-snapshot.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { AGENT_TASK_TASK_TYPE } from '@/modules/agents/scheduling/agent-task-job';
import { AgentTaskJobRegistrar } from '@/modules/agents/scheduling/agent-task-job-registrar';
import { AgentTaskTaskHandler } from '@/modules/agents/scheduling/agent-task-task-handler';
import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

import { retryUntil } from '../shared/retry-until';
import { createDueJobFactory } from './shared/job-factory';

/**
 * Agent tasks on the durable scheduler, over one database and two scheduler
 * instances, the way two mains run in production. The registrar, provisioner
 * and handler are the production classes; only the run start is stubbed. The
 * generic multi-main suite proves the claim guarantees for any task type. This
 * proves the agent wiring on top of them: a publish on any main is a database
 * write that every main fires from, a due occurrence starts exactly one run,
 * a task unpublished after its occurrence was recorded does not run, and a
 * main with the flag off removes the agent-task jobs and nothing else.
 */
describe('agent tasks across two mains over one database', () => {
	let jobRepo: ScheduledJobRepository;
	let taskRepo: ScheduledTaskRepository;
	let agentRepo: AgentRepository;
	let historyRepo: AgentHistoryRepository;
	let snapshotRepo: AgentTaskSnapshotRepository;
	let registrar: AgentTaskJobRegistrar;
	let schedulerConfig: GlobalConfig['scheduler'];
	let projectId: string;

	const startScheduledRun = vi.fn<AgentTaskService['startScheduledRun']>();

	let mainA: Scheduler & SchedulerPasses;
	let mainB: Scheduler & SchedulerPasses;

	const buildMain = (hostId: string) => {
		const scheduler = createScheduler({
			hostId,
			materializerTransaction: buildMaterializerTransaction(
				Container.get(DataSource),
				jobRepo,
				taskRepo,
			),
			taskStore: taskRepo,
			executor: { leaseSeconds: 30, lookaheadSeconds: 5, batchSize: 5 },
		});
		const handler = Container.get(AgentTaskTaskHandler);
		scheduler.registerTaskHandler(handler.taskType, handler);
		return scheduler;
	};

	/** A published agent with one task on the given cron. */
	const publishAgentWithTask = async (cronExpression = '* * * * *') => {
		const versionId = uuid();
		// Task ids are capped at 32 characters.
		const taskId = uuid().replaceAll('-', '');
		const agent = await agentRepo.save(
			agentRepo.create({
				id: uuid(),
				name: 'Scheduled agent',
				projectId,
				schema: { name: 'Scheduled agent', model: 'm', instructions: 'i' },
				integrations: [],
				tools: {},
				skills: {},
				versionId,
				activeVersionId: null,
			} as Partial<Agent>),
		);
		await historyRepo.insert({
			versionId,
			agentId: agent.id,
			author: 'test',
			schema: null,
			tools: null,
			skills: null,
		});
		await snapshotRepo.saveForVersion([
			{
				versionId,
				taskId,
				enabled: true,
				name: 'Every minute',
				objective: 'Report',
				cronExpression,
				timezone: null,
			},
		]);
		await agentRepo.update({ id: agent.id }, { activeVersionId: versionId });
		return { agentId: agent.id, taskId };
	};

	/** Publishes the task's job and pulls its first occurrence into the past. */
	const provisionDueOccurrence = async (agentId: string) => {
		await registrar.reconcile(agentId);
		const job = await jobRepo.findOneByOrFail({ ownerId: agentId, taskType: AGENT_TASK_TASK_TYPE });
		await taskRepo.update({ jobId: job.id }, { runAt: new Date(Date.now() - 1000) });
		return job;
	};

	beforeAll(async () => {
		await testModules.loadModules(['agents']);
		await testDb.init();
		Container.set(AgentTaskService, mock<AgentTaskService>({ startScheduledRun }));
		schedulerConfig = Container.get(GlobalConfig).scheduler;
		schedulerConfig.enabled = true;
		schedulerConfig.enabledForAgentTasks = true;

		jobRepo = Container.get(ScheduledJobRepository);
		taskRepo = Container.get(ScheduledTaskRepository);
		agentRepo = Container.get(AgentRepository);
		historyRepo = Container.get(AgentHistoryRepository);
		snapshotRepo = Container.get(AgentTaskSnapshotRepository);
		registrar = Container.get(AgentTaskJobRegistrar);
		mainA = buildMain('main-a');
		mainB = buildMain('main-b');
	});

	beforeEach(async () => {
		startScheduledRun.mockReset();
		startScheduledRun.mockResolvedValue('started');
		schedulerConfig.enabledForAgentTasks = true;
		await testDb.truncate(['ScheduledTask', 'ScheduledJob']);
		await snapshotRepo.delete({});
		await historyRepo.delete({});
		await agentRepo.delete({});
		projectId = (await createTeamProject()).id;
	});

	afterAll(async () => {
		await mainA.stop();
		await mainB.stop();
		await testDb.terminate();
	});

	it('starts exactly one run for a due occurrence when both mains claim at once', async () => {
		const { agentId, taskId } = await publishAgentWithTask();
		const job = await provisionDueOccurrence(agentId);

		const [claimedA, claimedB] = await Promise.all([mainA.execute(), mainB.execute()]);

		expect(claimedA.length + claimedB.length).toBe(1);
		await retryUntil(async () => {
			const [occurrence] = await taskRepo.findBy({ jobId: job.id });
			expect(occurrence.status).toBe('succeeded');
		});
		expect(startScheduledRun).toHaveBeenCalledTimes(1);
		expect(startScheduledRun).toHaveBeenCalledWith(agentId, taskId);
	}, 15_000);

	it('removes the job of a task unpublished on another main once its occurrence fires stale', async () => {
		const { agentId } = await publishAgentWithTask();
		await provisionDueOccurrence(agentId);
		// The unpublish is a plain database write on some main; no pubsub reaches the
		// main that fires. The run path reports the task stale at fire time.
		await agentRepo.update({ id: agentId }, { activeVersionId: null });
		startScheduledRun.mockResolvedValue('stale');

		await Promise.all([mainA.execute(), mainB.execute()]);

		await retryUntil(async () =>
			expect(await jobRepo.countBy({ ownerId: agentId, taskType: AGENT_TASK_TASK_TYPE })).toBe(0),
		);
		expect(await taskRepo.countBy({ status: 'pending' })).toBe(0);
	}, 15_000);

	it('removes the agent-task jobs of every agent when the flag is off, and nothing else', async () => {
		const { agentId } = await publishAgentWithTask();
		const other = await publishAgentWithTask();
		const agentTaskJob = await provisionDueOccurrence(agentId);
		await provisionDueOccurrence(other.agentId);
		// A job the agent owns through another feature, outside this flag.
		const timerJob = await createDueJobFactory(
			jobRepo,
			'agent:test-timer',
			'timer',
		)({ ownerType: ScheduledJobOwnerType.Agent, ownerId: agentId, ownerMemberId: null });

		schedulerConfig.enabledForAgentTasks = false;
		await registrar.reconcileAll();

		expect(await jobRepo.countBy({ taskType: AGENT_TASK_TASK_TYPE })).toBe(0);
		expect(await taskRepo.countBy({ jobId: agentTaskJob.id })).toBe(0);
		expect(await jobRepo.findOneBy({ id: timerJob.id })).not.toBeNull();
	});
});
