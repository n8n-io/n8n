import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJob } from '@n8n/db';
import type { EntityManager } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import type {
	DurableJobProvisioner,
	LinkedProvisionScope,
} from '@/scheduling/durable-job-provisioner';

import type { Agent } from '../../entities/agent.entity';
import type { AgentTaskSnapshot } from '../../entities/agent-task-snapshot.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentTaskScheduleRepository } from '../../repositories/agent-task-schedule.repository';
import type { AgentTaskSnapshotRepository } from '../../repositories/agent-task-snapshot.repository';
import { AGENT_TASK_TASK_TYPE } from '../agent-task-job';
import { AgentTaskJobRegistrar } from '../agent-task-job-registrar';

const AGENT_ID = 'agent-1';

describe('AgentTaskJobRegistrar', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const agentRepository = mock<AgentRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const taskScheduleRepository = mock<AgentTaskScheduleRepository>();
	const provisioner = mock<DurableJobProvisioner>();
	const manager = mock<EntityManager>();

	const makeRegistrar = (scheduler: Partial<GlobalConfig['scheduler']> = {}) =>
		new AgentTaskJobRegistrar(
			logger,
			mock<GlobalConfig>({
				scheduler: { enabled: true, enabledForAgentTasks: true, ...scheduler },
				generic: { timezone: 'UTC' },
			}),
			agentRepository,
			taskSnapshotRepository,
			taskScheduleRepository,
			provisioner,
		);

	const publishedAgent = (overrides: Partial<Agent> = {}): Agent =>
		mock<Agent>({ id: AGENT_ID, activeVersionId: 'version-1', ...overrides });

	const snapshot = (overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot =>
		mock<AgentTaskSnapshot>({
			versionId: 'version-1',
			taskId: 'task-1',
			enabled: true,
			cronExpression: '0 9 * * *',
			timezone: null,
			...overrides,
		});

	const provisionedScope = (): LinkedProvisionScope =>
		provisioner.provisionLinked.mock.calls[0][0] as LinkedProvisionScope;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		agentRepository.findById.mockResolvedValue(publishedAgent());
		agentRepository.findPublished.mockResolvedValue([publishedAgent()]);
		taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([snapshot()]);
		taskScheduleRepository.findJobIdsForAgent.mockResolvedValue([]);
		provisioner.provisionLinked.mockResolvedValue({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [],
		});
		provisioner.deprovisionJobs.mockResolvedValue({ removed: 0 });
		provisioner.deprovisionTaskType.mockResolvedValue({ removed: 0 });
	});

	describe('reconcile', () => {
		it('provisions enabled snapshots as skip-policy cron jobs owned by the agent', async () => {
			taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([
				snapshot(),
				snapshot({ taskId: 'task-2', cronExpression: '30 8 * * 1', timezone: 'Europe/Berlin' }),
			]);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(taskSnapshotRepository.findEnabledByVersionId).toHaveBeenCalledWith('version-1');
			const [scope, desired] = provisioner.provisionLinked.mock.calls[0];
			expect(scope).toMatchObject({
				taskType: AGENT_TASK_TASK_TYPE,
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
			});
			expect(desired).toEqual([
				{
					name: `agent-task:${AGENT_ID}:task-1`,
					schedule: { kind: 'cron', cronExpression: '0 9 * * *', timezone: null },
					firstRunAt: expect.any(Date),
					payload: { agentId: AGENT_ID, taskId: 'task-1' },
				},
				{
					name: `agent-task:${AGENT_ID}:task-2`,
					schedule: { kind: 'cron', cronExpression: '30 8 * * 1', timezone: 'Europe/Berlin' },
					firstRunAt: expect.any(Date),
					payload: { agentId: AGENT_ID, taskId: 'task-2' },
				},
			]);
		});

		it('builds ownership links from the job name', async () => {
			await makeRegistrar().reconcile(AGENT_ID);
			const scope = provisionedScope();

			await scope.linkInserted(manager, [{ id: 100, name: `agent-task:${AGENT_ID}:task-1` }]);
			expect(taskScheduleRepository.insertMany).toHaveBeenCalledWith(manager, [
				{ jobId: 100, agentId: AGENT_ID, taskId: 'task-1' },
			]);
		});

		it("reads existing jobs through the agent's link table", async () => {
			const existing = [mock<ScheduledJob>({ id: 10 })];
			taskScheduleRepository.findJobsForAgent.mockResolvedValue(existing);

			await makeRegistrar().reconcile(AGENT_ID);
			const scope = provisionedScope();

			await expect(scope.findExisting(manager)).resolves.toBe(existing);
			expect(taskScheduleRepository.findJobsForAgent).toHaveBeenCalledWith(
				manager,
				AGENT_ID,
				AGENT_TASK_TASK_TYPE,
			);
		});

		it('omits a snapshot with an invalid cron, warning instead of failing the reconcile', async () => {
			taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([
				snapshot({ taskId: 'bad-task', cronExpression: 'not a cron' }),
				snapshot(),
			]);

			await makeRegistrar().reconcile(AGENT_ID);

			const [, desired] = provisioner.provisionLinked.mock.calls[0];
			expect(desired).toHaveLength(1);
			expect(desired[0].name).toBe(`agent-task:${AGENT_ID}:task-1`);
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipping task with invalid cron',
				expect.objectContaining({ taskId: 'bad-task' }),
			);
		});

		it('falls back to the instance timezone when a snapshot carries an unknown one', async () => {
			taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([
				snapshot({ timezone: 'Neverland/Nowhere' }),
			]);

			await makeRegistrar().reconcile(AGENT_ID);

			const [, desired] = provisioner.provisionLinked.mock.calls[0];
			expect(desired[0].schedule).toEqual({
				kind: 'cron',
				cronExpression: '0 9 * * *',
				timezone: null,
			});
			expect(logger.warn).toHaveBeenCalledWith(
				'Task has unknown timezone, using instance timezone',
				expect.objectContaining({ timezone: 'Neverland/Nowhere' }),
			);
		});

		it.each([
			['deleted', null],
			['unpublished', mock<Agent>({ id: AGENT_ID, activeVersionId: null })],
		])('deprovisions the jobs the link table names when the agent is %s', async (_name, agent) => {
			agentRepository.findById.mockResolvedValue(agent);
			taskScheduleRepository.findJobIdsForAgent.mockResolvedValue([10, 11]);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(taskScheduleRepository.findJobIdsForAgent).toHaveBeenCalledWith(
				AGENT_ID,
				AGENT_TASK_TASK_TYPE,
			);
			expect(provisioner.deprovisionJobs).toHaveBeenCalledWith([10, 11]);
			expect(provisioner.provisionLinked).not.toHaveBeenCalled();
		});
	});

	describe('reconcileAll', () => {
		it('does nothing while the durable scheduler is off', async () => {
			await makeRegistrar({ enabled: false }).reconcileAll();

			expect(provisioner.deprovisionTaskType).not.toHaveBeenCalled();
			expect(provisioner.provisionLinked).not.toHaveBeenCalled();
			expect(agentRepository.findPublished).not.toHaveBeenCalled();
		});

		it('deletes all agent jobs when the agent-tasks flag is off, so no occurrences pile up', async () => {
			await makeRegistrar({ enabledForAgentTasks: false }).reconcileAll();

			expect(provisioner.deprovisionTaskType).toHaveBeenCalledWith(AGENT_TASK_TASK_TYPE);
			expect(provisioner.provisionLinked).not.toHaveBeenCalled();
		});

		it('reconciles every published agent, continuing past one that fails', async () => {
			agentRepository.findPublished.mockResolvedValue([
				publishedAgent({ id: 'agent-broken' }),
				publishedAgent(),
			]);
			const registrar = makeRegistrar();
			const reconcile = vi
				.spyOn(registrar, 'reconcile')
				.mockRejectedValueOnce(new Error('boom'))
				.mockResolvedValueOnce(undefined);

			await registrar.reconcileAll();

			expect(reconcile).toHaveBeenCalledTimes(2);
			expect(reconcile).toHaveBeenNthCalledWith(2, AGENT_ID);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to reconcile an agent’s durable jobs',
				expect.objectContaining({ agentId: 'agent-broken', error: 'boom' }),
			);
		});
	});
});
