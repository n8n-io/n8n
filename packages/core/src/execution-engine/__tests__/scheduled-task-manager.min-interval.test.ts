// Avalara-only test file. Lives outside `scheduled-task-manager.test.ts` so
// upstream syncs of that file don't conflict with — or silently delete — these
// avalara-specific assertions.
//
// Written using only the test API common to jest and vitest (`describe` /
// `it` / `expect`, plus `beforeEach` / `afterEach`) and hand-rolled fakes
// instead of jest-mock-extended / vitest-mock-extended. That keeps the file
// runnable under whichever test runner `packages/core` is currently using —
// today (jest, pre-migration) and after the upstream Jest→Vitest migration
// lands.

import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { CronContext, CronExpression, Workflow } from 'n8n-workflow';

import type { ErrorReporter } from '@/errors';
import type { InstanceSettings } from '@/instance-settings';

import { ScheduledTaskManager } from '../scheduled-task-manager';

// Minimal fakes — only the surface ScheduledTaskManager actually touches.
const noopLogger: Logger = {
	debug: () => {},
	info: () => {},
	warn: () => {},
	error: () => {},
	scoped() {
		return this;
	},
} as unknown as Logger;

const instanceSettings = { isLeader: true } as InstanceSettings;
const errorReporter = { error: () => {} } as unknown as ErrorReporter;

// `activeInterval: 0` skips the periodic active-crons log timer that the
// constructor otherwise sets up — keeps these tests free of hanging timers.
const cronLoggingConfig = { activeInterval: 0 };

const globalConfigWithMinInterval = (minScheduleIntervalSeconds: number) =>
	({ workflows: { minScheduleIntervalSeconds } }) as GlobalConfig;

const workflow = { id: 'wf-min-interval', timezone: 'GMT' } as Workflow;

describe('ScheduledTaskManager — N8N_MIN_SCHEDULE_INTERVAL_SECONDS enforcement', () => {
	const buildCtx = (expression: CronExpression): CronContext => ({
		workflowId: workflow.id,
		nodeId: 'test-node-id',
		timezone: workflow.timezone,
		expression,
	});

	const onTick = () => {};

	let manager: ScheduledTaskManager | undefined;

	// `registerCron` constructs a real `CronJob` with `start: true`, which leaves
	// a live timer behind. Tear it down between tests so timers don't leak.
	afterEach(() => {
		manager?.deregisterAllCrons();
		manager = undefined;
	});

	const buildManager = (minSeconds: number) =>
		new ScheduledTaskManager(
			instanceSettings,
			noopLogger,
			cronLoggingConfig,
			errorReporter,
			globalConfigWithMinInterval(minSeconds),
		);

	it('does not enforce a minimum when the configured value is 0', () => {
		manager = buildManager(0);

		// `0 */5 * * * *` (every 5 minutes) won't fire during the test even with
		// real timers — keeps this assertion free of cron-job side effects.
		expect(() => manager!.registerCron(buildCtx('0 */5 * * * *'), onTick)).not.toThrow();
	});

	it('throws a UserError when the cron interval is below the configured minimum', () => {
		manager = buildManager(300);

		expect(() => manager!.registerCron(buildCtx('0 * * * * *'), onTick)).toThrow(
			/Schedule interval too short/,
		);
		// Failed registrations must not leave behind a registered cron entry.
		expect(manager.cronsByWorkflow.get(workflow.id)).toBeUndefined();
	});

	it('allows cron intervals at or above the configured minimum', () => {
		manager = buildManager(300);

		expect(() => manager!.registerCron(buildCtx('0 */5 * * * *'), onTick)).not.toThrow();
		expect(manager.cronsByWorkflow.get(workflow.id)?.size).toBe(1);
	});
});
