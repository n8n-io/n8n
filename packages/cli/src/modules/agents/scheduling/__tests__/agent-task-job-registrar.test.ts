import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { ScheduledJobMisfirePolicy } from '@n8n/constants';
import type { ScheduledJobRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { AgentScheduledJobOwner } from '@/scheduling/agent-scheduled-job-owner';
import type { DurableJobProvisioner } from '@/scheduling/durable-job-provisioner';

import type { AgentTaskSnapshot } from '../../entities/agent-task-snapshot.entity';
import type { Agent } from '../../entities/agent.entity';
import type { AgentTaskSnapshotRepository } from '../../repositories/agent-task-snapshot.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import { AGENT_TASK_TASK_TYPE } from '../agent-task-job';
import { AgentTaskJobRegistrar } from '../agent-task-job-registrar';

const AGENT_ID = 'agent-1';
const owner = (taskId: string) => ({
	ownerType: 'agent',
	ownerId: AGENT_ID,
	ownerMemberId: taskId,
});
const OWNER_REF = { ownerType: 'agent', ownerId: AGENT_ID };

describe('AgentTaskJobRegistrar', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const agentRepository = mock<AgentRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const scheduledJobRepository = mock<ScheduledJobRepository>();
	const provisioner = mock<DurableJobProvisioner>();
	// The real owner, because the assertions below are about the owner shape that it produces.
	const agentOwner = new AgentScheduledJobOwner(mock());

	const makeRegistrar = (scheduler: Partial<GlobalConfig['scheduler']> = {}) =>
		new AgentTaskJobRegistrar(
			logger,
			mock<GlobalConfig>({
				scheduler: {
					enabled: true,
					enabledForAgentTasks: true,
					ownerReconciliationBatchSize: 500,
					...scheduler,
				},
				generic: { timezone: 'UTC' },
			}),
			agentRepository,
			taskSnapshotRepository,
			scheduledJobRepository,
			provisioner,
			agentOwner,
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

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		agentRepository.findById.mockResolvedValue(publishedAgent());
		agentRepository.findPublished.mockResolvedValue([publishedAgent()]);
		taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([snapshot()]);
		scheduledJobRepository.findOwnerMemberIds.mockResolvedValue([]);
		scheduledJobRepository.findOwnerIds.mockResolvedValue([]);
		provisioner.provision.mockResolvedValue({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [],
		});
		provisioner.deprovisionOwner.mockResolvedValue({ removed: 0 });
		provisioner.deprovisionOwnerMember.mockResolvedValue({ removed: 0 });
	});

	describe('reconcile', () => {
		it('provisions each enabled snapshot as a skip-policy cron job owned by the agent through the task', async () => {
			taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([
				snapshot(),
				snapshot({ taskId: 'task-2', cronExpression: '30 8 * * 1', timezone: 'Europe/Berlin' }),
			]);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(taskSnapshotRepository.findEnabledByVersionId).toHaveBeenCalledWith('version-1');
			expect(provisioner.provision).toHaveBeenCalledTimes(2);
			expect(provisioner.provision).toHaveBeenNthCalledWith(1, {
				owner: owner('task-1'),
				taskType: AGENT_TASK_TASK_TYPE,
				payload: { agentId: AGENT_ID, taskId: 'task-1' },
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				desired: [
					{
						name: `agent-task:${AGENT_ID}:task-1`,
						schedule: { kind: 'cron', cronExpression: '0 9 * * *', timezone: null },
						firstRunAt: expect.any(Date),
					},
				],
			});
			expect(provisioner.provision).toHaveBeenNthCalledWith(2, {
				owner: owner('task-2'),
				taskType: AGENT_TASK_TASK_TYPE,
				payload: { agentId: AGENT_ID, taskId: 'task-2' },
				misfirePolicy: ScheduledJobMisfirePolicy.Skip,
				desired: [
					{
						name: `agent-task:${AGENT_ID}:task-2`,
						schedule: { kind: 'cron', cronExpression: '30 8 * * 1', timezone: 'Europe/Berlin' },
						firstRunAt: expect.any(Date),
					},
				],
			});
		});

		it('removes the jobs of tasks that left the published config, keeping the ones still enabled', async () => {
			scheduledJobRepository.findOwnerMemberIds.mockResolvedValue(['task-1', 'task-gone']);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(scheduledJobRepository.findOwnerMemberIds).toHaveBeenCalledWith(
				OWNER_REF,
				AGENT_TASK_TASK_TYPE,
			);
			expect(provisioner.deprovisionOwnerMember).toHaveBeenCalledTimes(1);
			expect(provisioner.deprovisionOwnerMember).toHaveBeenCalledWith(owner('task-gone'));
		});

		it('provisions no job for a snapshot with an invalid cron, warning instead of failing the reconcile', async () => {
			taskSnapshotRepository.findEnabledByVersionId.mockResolvedValue([
				snapshot({ taskId: 'bad-task', cronExpression: 'not a cron' }),
				snapshot(),
			]);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(provisioner.provision).toHaveBeenCalledTimes(2);
			expect(provisioner.provision.mock.calls[0][0]).toMatchObject({
				owner: owner('bad-task'),
				desired: [],
			});
			expect(provisioner.provision.mock.calls[1][0].desired).toHaveLength(1);
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

			expect(provisioner.provision.mock.calls[0][0].desired[0].schedule).toEqual({
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
		])('deprovisions every job the agent holds when the agent is %s', async (_name, agent) => {
			agentRepository.findById.mockResolvedValue(agent);

			await makeRegistrar().reconcile(AGENT_ID);

			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith(OWNER_REF);
			expect(provisioner.provision).not.toHaveBeenCalled();
		});
	});

	describe('reconcileAll', () => {
		it('does nothing while the durable scheduler is off', async () => {
			await makeRegistrar({ enabled: false }).reconcileAll();

			expect(scheduledJobRepository.findOwnerIds).not.toHaveBeenCalled();
			expect(provisioner.deprovisionOwner).not.toHaveBeenCalled();
			expect(provisioner.provision).not.toHaveBeenCalled();
			expect(agentRepository.findPublished).not.toHaveBeenCalled();
		});

		it('deletes every agent’s jobs when the agent-tasks flag is off, so no occurrences pile up', async () => {
			scheduledJobRepository.findOwnerIds
				.mockResolvedValueOnce(['agent-a', 'agent-b'])
				.mockResolvedValueOnce([]);
			provisioner.deprovisionOwner.mockResolvedValue({ removed: 2 });

			await makeRegistrar({ enabledForAgentTasks: false }).reconcileAll();

			expect(scheduledJobRepository.findOwnerIds).toHaveBeenNthCalledWith(
				1,
				'agent',
				expect.any(Date),
				500,
				undefined,
			);
			expect(scheduledJobRepository.findOwnerIds).toHaveBeenNthCalledWith(
				2,
				'agent',
				expect.any(Date),
				500,
				'agent-b',
			);
			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith({
				ownerType: 'agent',
				ownerId: 'agent-a',
			});
			expect(provisioner.deprovisionOwner).toHaveBeenCalledWith({
				ownerType: 'agent',
				ownerId: 'agent-b',
			});
			expect(provisioner.provision).not.toHaveBeenCalled();
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
