/* eslint-disable @typescript-eslint/unbound-method */
import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig, WorkflowsConfig } from '@n8n/config';
import type { EntityManager } from '@n8n/db';
import type { CronDefinition } from '@n8n/scheduler';
import type { CronExpression, INode } from 'n8n-workflow';
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

const DAILY_AT_NINE = '0 0 9 * * *';
const DAILY_AT_TEN = '0 0 10 * * *';

/** `<workflowId>:<nodeId>:<definition fingerprint>:<occurrence>` */
const jobNamePattern = new RegExp(`^${WORKFLOW_ID}:${NODE_ID}:[0-9a-f]{16}:\\d+$`);

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
		it('provisions one durable job per cron, named by its definition, with the first fire planned', async () => {
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
						schedule: { kind: 'cron', cronExpression: DAILY_AT_NINE, timezone: TIMEZONE },
						firstRunAt: NEXT_NINE,
					},
					{
						name: expect.stringMatching(jobNamePattern),
						schedule: { kind: 'cron', cronExpression: DAILY_AT_TEN, timezone: TIMEZONE },
						firstRunAt: NEXT_TEN,
					},
				],
			);
		});

		it('fires the crons in the workflow timezone', async () => {
			// 09:00 Berlin is 08:00 UTC in January; a wrong timezone would move the fire.
			await makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], 'Europe/Berlin');

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect((desired[0].schedule as CronDefinition).timezone).toBe('Europe/Berlin');
			expect(desired[0].firstRunAt).toEqual(new Date('2026-01-05T08:00:00.000Z'));
		});

		it("keeps each cron's name stable when other crons are inserted before it or reordered", async () => {
			// A positional name would shift here and needlessly redefine the job,
			// restarting its clock; the definition-derived name must not move.
			const registrar = makeRegistrar();

			await registrar.register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], TIMEZONE);
			const firstNames = jobProvisioner.provision.mock.calls.at(-1)![4].map((job) => job.name);

			await registrar.register(WORKFLOW_ID, pollNode, [DAILY_AT_TEN, DAILY_AT_NINE], TIMEZONE);
			const secondNames = jobProvisioner.provision.mock.calls.at(-1)![4].map((job) => job.name);

			// DAILY_AT_NINE moved from index 0 to index 1, but its name is unchanged.
			expect(secondNames[1]).toBe(firstNames[0]);
			expect(secondNames[0]).not.toBe(firstNames[0]);
		});

		it('gives identical duplicate crons distinct names, stable by occurrence', async () => {
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				[DAILY_AT_NINE, DAILY_AT_NINE],
				TIMEZONE,
			);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			const [first, second] = desired.map((job) => job.name);
			expect(first).not.toBe(second);
			// Same definition, so same fingerprint: only the occurrence ordinal differs.
			expect(first.replace(/:\d+$/, '')).toBe(second.replace(/:\d+$/, ''));
			expect(first.endsWith(':0')).toBe(true);
			expect(second.endsWith(':1')).toBe(true);
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
				makeRegistrar().register(WORKFLOW_ID, pollNode, ['99 99 99 * * *'], TIMEZONE),
			).rejects.toThrow();
		});

		it.each(['DEFAULT', ''])(
			'resolves the %j timezone sentinel to the instance default without throwing',
			async (sentinel) => {
				await makeRegistrar().register(WORKFLOW_ID, pollNode, [DAILY_AT_NINE], sentinel);

				const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
				// TIMEZONE is the instance default (globalConfig.generic.timezone), so the
				// stored zone must be the resolved value, never the sentinel.
				expect((desired[0].schedule as CronDefinition).timezone).toBe(TIMEZONE);
				expect(desired[0].firstRunAt).toEqual(NEXT_NINE);
			},
		);

		it('normalises a 5-field custom cron to a valid 6-field schedule', async () => {
			// Legacy's cron lib accepted 5-field standard crons; the durable scheduler
			// requires 6 fields. `*/5 * * * *` (every 5 minutes) must not throw.
			await makeRegistrar().register(
				WORKFLOW_ID,
				pollNode,
				['*/5 * * * *' as CronExpression],
				TIMEZONE,
			);

			const desired = jobProvisioner.provision.mock.calls.at(-1)![4];
			expect((desired[0].schedule as CronDefinition).cronExpression).toBe('0 */5 * * * *');
			expect(desired[0].firstRunAt).toEqual(new Date('2026-01-05T00:05:00.000Z'));
			// 6-field passthrough is proven by the first `provision` test above, which
			// asserts the stored cronExpression is the untouched DAILY_AT_NINE.
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
