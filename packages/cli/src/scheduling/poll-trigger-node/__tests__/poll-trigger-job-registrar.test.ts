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

const NOW = new Date('2026-01-05T00:00:00.000Z');
const NEXT_NINE = new Date('2026-01-05T09:00:00.000Z');
const NEXT_TEN = new Date('2026-01-05T10:00:00.000Z');

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';
const TIMEZONE = 'UTC';

// Custom crons map straight through to `cron` schedules, so their first fire is exact.
const DAILY_AT_NINE: TriggerTime = { mode: 'custom', cronExpression: '0 0 9 * * *' };
const DAILY_AT_TEN: TriggerTime = { mode: 'custom', cronExpression: '0 0 10 * * *' };

/** `<workflowId>:<nodeId>:<definition fingerprint>:<occurrence>` */
const jobNamePattern = new RegExp(`^${WORKFLOW_ID}:${NODE_ID}:[0-9a-f]{16}:\\d+$`);

const pollNode = mock<INode>({ id: NODE_ID, type: 'n8n-nodes-base.rssFeedReadTrigger' });

describe('PollTriggerJobRegistrar', () => {
	const jobProvisioner = mock<DurableJobProvisioner>();

	const makeRegistrar = ({
		schedulerEnabled = true,
		publicationEnabled = true,
		enabledForPollTriggers = true,
	} = {}) =>
		new PollTriggerJobRegistrar(
			mockLogger(),
			mock<GlobalConfig>({
				scheduler: { enabled: schedulerEnabled, enabledForPollTriggers },
				generic: { timezone: TIMEZONE },
			}),
			mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
			jobProvisioner,
		);

	const lastDesired = () => jobProvisioner.provision.mock.calls.at(-1)![4];

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

	describe('isActive', () => {
		it.each([
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				enabledForPollTriggers: true,
				expected: true,
			},
			{
				schedulerEnabled: false,
				publicationEnabled: true,
				enabledForPollTriggers: true,
				expected: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: false,
				enabledForPollTriggers: true,
				expected: false,
			},
			{
				schedulerEnabled: true,
				publicationEnabled: true,
				enabledForPollTriggers: false,
				expected: false,
			},
		] as const)(
			'is $expected for scheduler=$schedulerEnabled publication=$publicationEnabled pollTriggers=$enabledForPollTriggers',
			({ schedulerEnabled, publicationEnabled, enabledForPollTriggers, expected }) => {
				expect(
					makeRegistrar({
						schedulerEnabled,
						publicationEnabled,
						enabledForPollTriggers,
					}).isActive(),
				).toBe(expected);
			},
		);
	});

	describe('register', () => {
		it('provisions one scheduler job per poll time, named by its definition, with the first fire planned', async () => {
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[DAILY_AT_NINE, DAILY_AT_TEN],
				TIMEZONE,
			);

			expect(jobProvisioner.provision).toHaveBeenCalledWith(
				WORKFLOW_ID,
				NODE_ID,
				POLL_TRIGGER_TASK_TYPE,
				{ workflowId: WORKFLOW_ID, nodeId: NODE_ID },
				[
					{
						name: expect.stringMatching(jobNamePattern),
						schedule: { kind: 'cron', cronExpression: '0 0 9 * * *', timezone: TIMEZONE },
						firstRunAt: NEXT_NINE,
					},
					{
						name: expect.stringMatching(jobNamePattern),
						schedule: { kind: 'cron', cronExpression: '0 0 10 * * *', timezone: TIMEZONE },
						firstRunAt: NEXT_TEN,
					},
				],
			);
		});

		it('seeds a generated cadence deterministically, so re-activation keeps the same job identity', async () => {
			// The seconds field is derived from `${workflowId}:${nodeId}`, not
			// randomised, so re-activation reproduces the same cron. Two separate
			// instances stand in for a fresh-process re-activation.
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const first = lastDesired()[0];

			await makeRegistrar().register(WORKFLOW_ID, pollNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const second = lastDesired()[0];

			expect(second.name).toBe(first.name);
			expect((second.schedule as CronDefinition).cronExpression).toBe(
				(first.schedule as CronDefinition).cronExpression,
			);
			// A minute cadence with a fixed (not wildcard) seconds field: never sub-minute.
			expect((first.schedule as CronDefinition).cronExpression).toMatch(
				/^[0-9]{1,2} \* \* \* \* \*$/,
			);
		});

		// Locks the field order and per-mode mapping. The node-seeded fields are
		// matched loosely (`\d{1,2}`); every other field must map to the poll time
		// verbatim.
		it.each([
			[{ mode: 'everyHour', minute: 11 }, /^\d{1,2} 11 \* \* \* \*$/],
			[{ mode: 'everyX', unit: 'minutes', value: 5 }, /^\d{1,2} \*\/5 \* \* \* \*$/],
			[{ mode: 'everyX', unit: 'hours', value: 3 }, /^\d{1,2} \d{1,2} \*\/3 \* \* \*$/],
			[{ mode: 'everyDay', hour: 13, minute: 17 }, /^\d{1,2} 17 13 \* \* \*$/],
			[{ mode: 'everyWeek', hour: 13, minute: 17, weekday: 4 }, /^\d{1,2} 17 13 \* \* 4$/],
			[{ mode: 'everyMonth', hour: 13, minute: 17, dayOfMonth: 12 }, /^\d{1,2} 17 13 12 \* \*$/],
		] as Array<[TriggerTime, RegExp]>)(
			'maps a %o poll time to its cron fields',
			async (pollTime, pattern) => {
				await makeRegistrar().register(WORKFLOW_ID, pollNode, [pollTime], TIMEZONE);

				expect((lastDesired()[0].schedule as CronDefinition).cronExpression).toMatch(pattern);
			},
		);

		it.each([
			{ inserted: [{ id: 1, name: 'wf-1:node-1:abc:0' }], expected: true },
			{ inserted: [], expected: false },
		])(
			'reports {inserted: $expected} when the provisioner inserted $inserted.length row(s)',
			async ({ inserted, expected }) => {
				jobProvisioner.provision.mockResolvedValueOnce({
					inserted,
					redefined: [],
					unchanged: [],
					removed: [],
				});

				await expect(
					makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], TIMEZONE),
				).resolves.toEqual({ inserted: expected });
			},
		);

		it("spreads a generated cadence's seeded seconds across different nodes, to avoid a thundering herd", async () => {
			const registrar = makeRegistrar();

			await registrar.register(WORKFLOW_ID, pollNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const first = lastDesired()[0];

			const otherNode = mock<INode>({ id: 'node-2', type: pollNode.type });
			await registrar.register(WORKFLOW_ID, otherNode, [{ mode: 'everyMinute' }], TIMEZONE);
			const second = lastDesired()[0];

			expect((second.schedule as CronDefinition).cronExpression).not.toBe(
				(first.schedule as CronDefinition).cronExpression,
			);
		});

		it("keeps each job's name stable when poll times are inserted before it or reordered", async () => {
			const registrar = makeRegistrar();

			await registrar.register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], TIMEZONE);
			const firstNames = lastDesired().map((job) => job.name);

			await registrar.register(WORKFLOW_ID, pollNode, [DAILY_AT_TEN, DAILY_AT_NINE], TIMEZONE);
			const secondNames = lastDesired().map((job) => job.name);

			// DAILY_AT_NINE moved from index 0 to index 1, but its name is unchanged.
			expect(secondNames[1]).toBe(firstNames[0]);
			expect(secondNames[0]).not.toBe(firstNames[0]);
		});

		it('gives identical duplicate poll times distinct names, stable by occurrence', async () => {
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[DAILY_AT_NINE, DAILY_AT_NINE],
				TIMEZONE,
			);

			const [first, second] = lastDesired().map((job) => job.name);
			expect(first).not.toBe(second);
			// Same definition, so same fingerprint: only the occurrence ordinal differs.
			expect(first.replace(/:\d+$/, '')).toBe(second.replace(/:\d+$/, ''));
			expect(first.endsWith(':0')).toBe(true);
			expect(second.endsWith(':1')).toBe(true);
		});

		it('fires the crons in the workflow timezone', async () => {
			// 09:00 Berlin is 08:00 UTC in January; a wrong timezone would move the fire.
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], 'Europe/Berlin');

			const [{ schedule, firstRunAt }] = lastDesired();
			expect((schedule as CronDefinition).timezone).toBe('Europe/Berlin');
			expect(firstRunAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
		});

		it('provisions an empty desired set for a node with no poll times', async () => {
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [], TIMEZONE);

			expect(jobProvisioner.provision).toHaveBeenCalledWith(
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

				const [{ schedule, firstRunAt }] = lastDesired();
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

			const [{ schedule, firstRunAt }] = lastDesired();
			expect((schedule as CronDefinition).cronExpression).toBe('0 */5 * * * *');
			expect(firstRunAt).toEqual(new Date('2026-01-05T00:05:00.000Z'));
		});
	});

	describe('remove', () => {
		it('removes the scheduler jobs of a deactivated node', async () => {
			await makeRegistrar().remove(WORKFLOW_ID, NODE_ID);

			expect(jobProvisioner.deprovision).toHaveBeenCalledWith(WORKFLOW_ID, NODE_ID);
		});
	});

	describe('removeWorkflow', () => {
		it('removes the poll jobs of all nodes of a deactivated workflow', async () => {
			await makeRegistrar().removeWorkflow(WORKFLOW_ID);

			expect(jobProvisioner.deprovisionWorkflow).toHaveBeenCalledWith(
				WORKFLOW_ID,
				POLL_TRIGGER_TASK_TYPE,
			);
		});
	});

	describe('removeWorkflowInTransaction', () => {
		it('removes the poll jobs of a workflow within the given transaction', async () => {
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
		const construct = ({ schedulerEnabled = true, publicationEnabled = true } = {}) => {
			const scopedLogger = mockLogger();
			const logger = mock<Logger>({ scoped: vi.fn().mockReturnValue(scopedLogger) });
			new PollTriggerJobRegistrar(
				logger,
				mock<GlobalConfig>({
					scheduler: { enabled: schedulerEnabled, enabledForPollTriggers: true },
					generic: { timezone: TIMEZONE },
				}),
				mock<WorkflowsConfig>({ useWorkflowPublicationService: publicationEnabled }),
				jobProvisioner,
			);
			return scopedLogger;
		};

		it.each([
			{
				schedulerEnabled: true,
				publicationEnabled: false,
				warnSubstring: 'workflow publication service is disabled',
			},
			{ schedulerEnabled: true, publicationEnabled: true, warnSubstring: null },
			{ schedulerEnabled: false, publicationEnabled: false, warnSubstring: null },
		])(
			'scheduler=$schedulerEnabled publication=$publicationEnabled',
			({ schedulerEnabled, publicationEnabled, warnSubstring }) => {
				const logger = construct({ schedulerEnabled, publicationEnabled });

				if (warnSubstring) {
					expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(warnSubstring));
				} else {
					expect(logger.warn).not.toHaveBeenCalled();
				}
			},
		);
	});
});
