/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import type { CronDefinition } from '@n8n/scheduler';
import type { CronExpression, INode, TriggerTime } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { DurableJobProvisioner } from '../../durable-job-provisioner';
import { PollTriggerJobRegistrar } from '../poll-trigger-job-registrar';
import { POLL_TRIGGER_TASK_TYPE } from '../poll-trigger-task';

// Monday. Deterministic clock so first-fire assertions are exact.
const NOW = new Date('2026-01-05T00:00:00.000Z');
const NEXT_NINE = new Date('2026-01-05T09:00:00.000Z');
const NEXT_TEN = new Date('2026-01-05T10:00:00.000Z');

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';
const TIMEZONE = 'UTC';

// Custom crons map straight through to `cron` schedules, so their first fire is exact.
const DAILY_AT_NINE: TriggerTime = { mode: 'custom', cronExpression: '0 0 9 * * *' };
const DAILY_AT_TEN: TriggerTime = { mode: 'custom', cronExpression: '0 0 10 * * *' };

const pollNode = mock<INode>({ id: NODE_ID, type: 'n8n-nodes-base.rssFeedReadTrigger' });

describe('PollTriggerJobRegistrar', () => {
	const jobProvisioner = mock<DurableJobProvisioner>();

	const makeRegistrar = ({
		schedulerEnabled = true,
		publicationEnabled = true,
		durablePollTriggers = true,
		// The Schedule Trigger's own mode flag; poll gating must not depend on it.
		triggerNodeMode = 'legacy' as 'legacy' | 'new',
	} = {}) =>
		new PollTriggerJobRegistrar(
			mockLogger(),
			mock<GlobalConfig>({
				scheduler: { enabled: schedulerEnabled, durablePollTriggers, triggerNodeMode },
				generic: { timezone: TIMEZONE },
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
			jobProvisioner,
		);

	/** The `schedules` argument of the most recent `provisionForNode` call. */
	const lastSchedules = () => jobProvisioner.provisionForNode.mock.calls.at(-1)![4];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		jobProvisioner.provisionForNode.mockResolvedValue({
			inserted: [],
			redefined: [],
			unchanged: [],
			removed: [],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('isActive', () => {
		it.each([
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				durablePollTriggers: true,
				triggerNodeMode: 'new',
				expected: true,
			},
			{
				schedulerEnabled: false,
				publicationEnabled: true,
				durablePollTriggers: true,
				triggerNodeMode: 'new',
				expected: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: false,
				durablePollTriggers: true,
				triggerNodeMode: 'new',
				expected: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				durablePollTriggers: false,
				triggerNodeMode: 'legacy',
				expected: false,
			},
			// Poll gating is independent of the Schedule Trigger's own mode flag:
			// poll on + schedule off stays active, poll off + schedule on stays inactive.
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				durablePollTriggers: true,
				triggerNodeMode: 'legacy',
				expected: true,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				durablePollTriggers: false,
				triggerNodeMode: 'new',
				expected: false,
			},
		] as const)(
			'is $expected for scheduler=$schedulerEnabled publication=$publicationEnabled durablePoll=$durablePollTriggers scheduleMode=$triggerNodeMode',
			({
				schedulerEnabled,
				publicationEnabled,
				durablePollTriggers,
				triggerNodeMode,
				expected,
			}) => {
				expect(
					makeRegistrar({
						schedulerEnabled,
						publicationEnabled,
						durablePollTriggers,
						triggerNodeMode,
					}).isActive(),
				).toBe(expected);
			},
		);
	});

	describe('register', () => {
		it('provisions one schedule per poll time, with the first fire planned', async () => {
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[DAILY_AT_NINE, DAILY_AT_TEN],
				TIMEZONE,
			);

			expect(jobProvisioner.provisionForNode).toHaveBeenCalledWith(
				WORKFLOW_ID,
				NODE_ID,
				POLL_TRIGGER_TASK_TYPE,
				{ workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				[
					{
						schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: TIMEZONE },
						firstRunAt: NEXT_NINE,
					},
					{
						schedule: { kind: 'cron', cronExpression: '0 0 10 * * *', timezone: TIMEZONE },
						firstRunAt: NEXT_TEN,
					},
				],
			);
		});

		it('maps a fixed-minute cadence to an interval schedule in `new` mode', async () => {
			await makeRegistrar({ triggerNodeMode: 'new' }).register(
				WORKFLOW_ID,
				pollNode,
				[{ mode: 'everyX', unit: 'minutes', value: 5 }],
				TIMEZONE,
			);

			const [{ schedule }] = lastSchedules();
			expect(schedule).toEqual({ kind: 'interval', intervalSeconds: 300 });
		});

		it('maps every-N-hours to a recurring_cron schedule', async () => {
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[{ mode: 'everyX', unit: 'hours', value: 3 }],
				TIMEZONE,
			);

			const [{ schedule }] = lastSchedules();
			expect(schedule).toMatchObject({
				kind: 'recurring_cron',
				recurrenceUnit: 'hours',
				recurrenceSize: 3,
			});
		});

		it('derives a stable schedule across re-activation for a generated cadence', async () => {
			// The B1 fix: the seconds field is seeded deterministically from
			// `${workflowId}:${nodeId}`, so re-activation produces the identical
			// schedule (hence the identical durable job identity), not a new one.
			const registrar = makeRegistrar();

			await registrar.register(WORKFLOW_ID, pollNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const first = lastSchedules()[0].schedule;

			await registrar.register(WORKFLOW_ID, pollNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const second = lastSchedules()[0].schedule;

			expect(second).toEqual(first);
		});

		it('fires the crons in the workflow timezone', async () => {
			// 09:00 Berlin is 08:00 UTC in January; a wrong timezone would move the fire.
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], 'Europe/Berlin');

			const [{ schedule, firstRunAt }] = lastSchedules();
			expect((schedule as CronDefinition).timezone).toBe('Europe/Berlin');
			expect(firstRunAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
		});

		it('provisions an empty schedule set for a node with no poll times', async () => {
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [], TIMEZONE);

			expect(jobProvisioner.provisionForNode).toHaveBeenCalledWith(
				WORKFLOW_ID,
				NODE_ID,
				POLL_TRIGGER_TASK_TYPE,
				{ workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				[],
			);
		});

		it('throws on an invalid cron expression', async () => {
			await expect(
				makeRegistrar().register(
					WORKFLOW_ID,
					pollNode,
					[{ mode: 'custom', cronExpression: '99 99 99 * * *' }],
					TIMEZONE,
				),
			).rejects.toThrow();
		});

		it.each(['DEFAULT', ''])(
			'resolves the %j timezone sentinel to the instance default without throwing',
			async (sentinel) => {
				await makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], sentinel);

				const [{ schedule, firstRunAt }] = lastSchedules();
				// TIMEZONE is the instance default (globalConfig.generic.timezone), so the
				// stored zone must be the resolved value, never the sentinel.
				expect((schedule as CronDefinition).timezone).toBe(TIMEZONE);
				expect(firstRunAt).toEqual(NEXT_NINE);
			},
		);

		it('normalises a 5-field custom cron to a valid 6-field schedule', async () => {
			// Legacy's cron lib accepted 5-field standard crons; the durable scheduler
			// requires 6 fields. `*/5 * * * *` (every 5 minutes) must not throw.
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[{ mode: 'custom', cronExpression: '*/5 * * * *' as CronExpression }],
				TIMEZONE,
			);

			const [{ schedule, firstRunAt }] = lastSchedules();
			expect((schedule as CronDefinition).cronExpression).toBe('0 */5 * * * *');
			expect(firstRunAt).toEqual(new Date('2026-01-05T00:05:00.000Z'));
			// 6-field passthrough is proven by the first `register` test above, which
			// asserts the stored cronExpression is the untouched 6-field custom cron.
		});
	});

	describe('remove', () => {
		it('removes the durable jobs of a deactivated node', async () => {
			await makeRegistrar().remove(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.deprovision).toHaveBeenCalledWith(WORKFLOW_ID, NODE_ID);
		});
	});

	describe('removeWorkflow', () => {
		it('removes the durable poll jobs of all nodes of a deactivated workflow', async () => {
			await makeRegistrar().removeWorkflow(WORKFLOW_ID);

			expect(jobProvisioner.deprovisionWorkflow).toHaveBeenCalledWith(
				WORKFLOW_ID,
				POLL_TRIGGER_TASK_TYPE,
			);
		});
	});

	describe('removeWorkflowInTransaction', () => {
		it('removes the durable poll jobs of a workflow within the given transaction', async () => {
			const manager = mock<EntityManager>();

			await makeRegistrar().removeWorkflowInTransaction(manager, WORKFLOW_ID);

			expect(jobProvisioner.deprovisionWorkflowInTransaction).toHaveBeenCalledWith(
				manager,
				WORKFLOW_ID,
				POLL_TRIGGER_TASK_TYPE,
			);
		});
	});

	describe('configuration warning', () => {
		// The registrar scopes its logger, so warnings land on the scoped instance.
		const construct = ({ schedulerEnabled = true, publicationEnabled = true } = {}) => {
			const scopedLogger = mockLogger();
			const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });
			new PollTriggerJobRegistrar(
				logger,
				mock<GlobalConfig>({
					scheduler: { enabled: schedulerEnabled, durablePollTriggers: true },
					generic: { timezone: TIMEZONE },
				}),
				mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
				jobProvisioner,
			);
			return scopedLogger;
		};

		it('warns when the durable scheduler is enabled but the publication service is off', () => {
			const logger = construct({ schedulerEnabled: true, publicationEnabled: false });

			expect(logger.warn).toHaveBeenCalledWith(
				expect.stringContaining('workflow publication service is disabled'),
			);
		});

		it('does not warn when both the durable scheduler and the publication service are on', () => {
			const logger = construct({ schedulerEnabled: true, publicationEnabled: true });

			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('does not warn when the durable scheduler is off', () => {
			const logger = construct({ schedulerEnabled: false, publicationEnabled: false });

			expect(logger.warn).not.toHaveBeenCalled();
		});
	});
});
