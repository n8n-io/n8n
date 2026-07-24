// Avalara-only test file. Lives outside `scheduled-task-manager.test.ts` so
// upstream syncs of that file don't conflict with — or silently delete — these
// avalara-specific assertions.

import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';

import type { InstanceSettings } from '@/instance-settings';

import {
	ScheduledTaskManager,
	type ScheduledTaskContext,
	type ScheduledTaskGroup,
} from '../scheduled-task-manager';

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

// `activeInterval: 0` skips the periodic active-crons log timer.
const cronLoggingConfig = { activeInterval: 0 };

const globalConfigWithMinInterval = (minScheduleIntervalSeconds: number) =>
	({ workflows: { minScheduleIntervalSeconds } }) as GlobalConfig;

const testGroup: ScheduledTaskGroup = { type: 'workflow', id: 'wf-min-interval' };

const buildCtx = (expression: string): ScheduledTaskContext => ({
	group: testGroup,
	targetId: 'test-node-id',
	timezone: 'GMT',
	expression,
});

const onTick = () => {};

describe('ScheduledTaskManager — N8N_MIN_SCHEDULE_INTERVAL_SECONDS enforcement', () => {
	let manager: ScheduledTaskManager | undefined;

	afterEach(() => {
		manager?.deregisterGroup(testGroup);
		manager = undefined;
	});

	const buildManager = (minSeconds: number) =>
		new ScheduledTaskManager(
			instanceSettings,
			noopLogger,
			cronLoggingConfig,
			globalConfigWithMinInterval(minSeconds),
		);

	it('does not enforce a minimum when the configured value is 0', () => {
		manager = buildManager(0);

		expect(() => manager!.register(buildCtx('0 */5 * * * *'), onTick)).not.toThrow();
	});

	it('throws a UserError when the cron interval is below the configured minimum', () => {
		manager = buildManager(300);

		expect(() => manager!.register(buildCtx('0 * * * * *'), onTick)).toThrow(
			/Schedule interval too short/,
		);
		// Failed registrations must not leave behind a registered cron entry.
		expect(manager!.hasGroup(testGroup)).toBe(false);
	});

	it('allows cron intervals at or above the configured minimum', () => {
		manager = buildManager(300);

		expect(() => manager!.register(buildCtx('0 */5 * * * *'), onTick)).not.toThrow();
		expect(manager!.hasGroup(testGroup)).toBe(true);
	});
});
