/* eslint-disable @typescript-eslint/unbound-method */
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { CronDefinition } from '@n8n/scheduler';
import type { Cron, CronExpression, INode, Workflow } from 'n8n-workflow';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DurableJobProvisioner } from '../../durable-job-provisioner';
import { ScheduleTriggerJobRegistrar } from '../schedule-trigger-job-registrar';
import { SCHEDULE_TRIGGER_TASK_TYPE } from '../schedule-trigger-task';

// Monday. Deterministic clock so first-fire assertions are exact.
const NOW = new Date('2026-01-05T00:00:00.000Z');
const NEXT_NINE = new Date('2026-01-05T09:00:00.000Z');

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';

const workflow = { id: WORKFLOW_ID, settings: {} } as unknown as Workflow;
const scheduleNode = mock<INode>({ id: NODE_ID, type: SCHEDULE_TRIGGER_NODE_TYPE });

const dailyAtNine: Cron = {
	expression: '0 0 9 * * *' as CronExpression,
	recurrence: { activated: false },
};
const everyThreeWeeksMonday: Cron = {
	expression: '0 0 9 * * 1' as CronExpression,
	recurrence: { activated: true, index: 1, intervalSize: 3, typeInterval: 'weeks' },
};

describe('ScheduleTriggerJobRegistrar', () => {
	const jobProvisioner = mock<DurableJobProvisioner>();

	const makeRegistrar = ({ schedulerEnabled = true, publicationEnabled = true } = {}) =>
		new ScheduleTriggerJobRegistrar(
			mockLogger(),
			mock<GlobalConfig>({
				scheduler: { enabled: schedulerEnabled },
				generic: { timezone: 'UTC' },
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
			jobProvisioner,
		);

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		jobProvisioner.provision.mockResolvedValue({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('interceptsNode', () => {
		it('intercepts a schedule trigger node when the durable scheduler and publication path are on', () => {
			expect(makeRegistrar().interceptsNode(scheduleNode)).toBe(true);
		});

		it('does not intercept when the durable scheduler is off', () => {
			expect(makeRegistrar({ schedulerEnabled: false }).interceptsNode(scheduleNode)).toBe(false);
		});

		it('does not intercept on the legacy activation path', () => {
			expect(makeRegistrar({ publicationEnabled: false }).interceptsNode(scheduleNode)).toBe(false);
		});

		it('does not intercept other node types', () => {
			const other = mock<INode>({ id: NODE_ID, type: 'n8n-nodes-base.gmailTrigger' });
			expect(makeRegistrar().interceptsNode(other)).toBe(false);
		});
	});

	describe('collect and commit', () => {
		it('provisions one desired job per rule, named by rule index, with the first fire planned', async () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());
			collector.registerCron(everyThreeWeeksMonday, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.provision).toHaveBeenCalledWith(
				WORKFLOW_ID,
				NODE_ID,
				SCHEDULE_TRIGGER_TASK_TYPE,
				{ workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				[
					{
						name: `${WORKFLOW_ID}:${NODE_ID}:0`,
						schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: null },
						firstRunAt: NEXT_NINE,
					},
					{
						name: `${WORKFLOW_ID}:${NODE_ID}:1`,
						schedule: {
							kind: 'recurring_cron',
							cronExpression: '0 0 9 * * 1',
							timezone: null,
							recurrenceUnit: 'weeks',
							recurrenceSize: 3,
						},
						// The first fire is ungated: the very next Monday.
						firstRunAt: NEXT_NINE,
					},
				],
			);
		});

		it("passes the workflow's own timezone, and null for the instance default", async () => {
			const registrar = makeRegistrar();
			const zoned = {
				id: WORKFLOW_ID,
				settings: { timezone: 'Europe/Berlin' },
			} as unknown as Workflow;
			const collector = registrar.createCollector(zoned, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect((desired[0].schedule as CronDefinition).timezone).toBe('Europe/Berlin');
			// 09:00 Berlin (UTC+1 in January).
			expect(desired[0].firstRunAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
		});

		it("treats the 'DEFAULT' timezone sentinel as the instance default", async () => {
			const registrar = makeRegistrar();
			const defaulted = {
				id: WORKFLOW_ID,
				settings: { timezone: 'DEFAULT' },
			} as unknown as Workflow;
			const collector = registrar.createCollector(defaulted, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect((desired[0].schedule as CronDefinition).timezone).toBeNull();
		});

		it('resolves a null (instance-default) timezone for the first-run math, but stores it as null', async () => {
			// Instance default is not UTC, so a wrong resolution (e.g. falling back
			// to UTC) would show up in firstRunAt rather than being masked by it.
			const registrar = new ScheduleTriggerJobRegistrar(
				mockLogger(),
				mock<GlobalConfig>({
					scheduler: { enabled: true },
					generic: { timezone: 'Europe/Berlin' },
				}),
				mock<WorkflowsConfig>({ useWorkflowPublicationService: true }),
				jobProvisioner,
			);
			const defaulted = { id: WORKFLOW_ID, settings: {} } as unknown as Workflow;
			const collector = registrar.createCollector(defaulted, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect((desired[0].schedule as CronDefinition).timezone).toBeNull();
			// 09:00 Berlin (UTC+1 in January) — would be 09:00 UTC if the default
			// weren't resolved.
			expect(desired[0].firstRunAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
		});

		it('throws synchronously from registerCron on an invalid cron expression', () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);

			expect(() =>
				collector.registerCron({ expression: '99 99 99 * * *' as CronExpression }, vi.fn()),
			).toThrow();
		});

		it('mirrors a never-firing legacy rule (zero interval) as a job with no next run', async () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);
			collector.registerCron(
				{
					expression: '0 0 9 * * 1' as CronExpression,
					recurrence: { activated: true, index: 0, intervalSize: 0, typeInterval: 'weeks' },
				},
				vi.fn(),
			);

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect(desired[0].firstRunAt).toBeNull();
			expect((desired[0].schedule as CronDefinition).kind).toBe('cron');
		});

		it('provisions a negative-interval rule as a live plain-cron job, matching legacy fire-every-tick', async () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);
			collector.registerCron(
				{
					expression: '0 0 9 * * 1' as CronExpression,
					recurrence: { activated: true, index: 0, intervalSize: -1, typeInterval: 'weeks' },
				},
				vi.fn(),
			);

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			// Legacy fires a negative-stride rule on every candidate tick, so it must
			// stay a live plain-cron job with a real first run, not a clock-dead row.
			expect((desired[0].schedule as CronDefinition).kind).toBe('cron');
			expect(desired[0].firstRunAt).toEqual(NEXT_NINE);
		});

		it('is a no-op for a node that collected nothing', async () => {
			await makeRegistrar().commit(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.provision).not.toHaveBeenCalled();
		});

		it('provisions a node with no rules left as an empty desired set', async () => {
			const registrar = makeRegistrar();
			registrar.createCollector(workflow, scheduleNode);

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.provision).toHaveBeenCalledWith(
				WORKFLOW_ID,
				NODE_ID,
				SCHEDULE_TRIGGER_TASK_TYPE,
				{ workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				[],
			);
		});

		it('consumes the collected rules: a second commit is a no-op', async () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);
			await registrar.commit(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.provision).toHaveBeenCalledTimes(1);
		});

		it('discard drops collected rules so a failed activation persists nothing', async () => {
			const registrar = makeRegistrar();
			const collector = registrar.createCollector(workflow, scheduleNode);
			collector.registerCron(dailyAtNine, vi.fn());

			registrar.discard(WORKFLOW_ID, NODE_ID);
			await registrar.commit(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.provision).not.toHaveBeenCalled();
		});

		it('a fresh collector replaces the rules of a previous failed attempt', async () => {
			const registrar = makeRegistrar();
			registrar.createCollector(workflow, scheduleNode).registerCron(dailyAtNine, vi.fn());
			// The retry collects anew; only its rules must persist.
			const retry = registrar.createCollector(workflow, scheduleNode);
			retry.registerCron(everyThreeWeeksMonday, vi.fn());

			await registrar.commit(WORKFLOW_ID, NODE_ID);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect(desired).toHaveLength(1);
			expect((desired[0].schedule as CronDefinition).cronExpression).toBe('0 0 9 * * 1');
		});
	});

	describe('remove', () => {
		it('removes the durable jobs of a deactivated node', async () => {
			await makeRegistrar().remove(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.deprovision).toHaveBeenCalledWith(WORKFLOW_ID, NODE_ID);
		});

		it('never touches the store while the durable scheduler is off', async () => {
			await makeRegistrar({ schedulerEnabled: false }).remove(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.deprovision).not.toHaveBeenCalled();
		});
	});
});
