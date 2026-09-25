import type { Schedule } from '@n8n/scheduler';
import { scheduleFingerprint } from '@n8n/scheduler';

import { nameDesiredJobs } from '../desired-job-name';

const WORKFLOW_ID = 'wf-1';
const NODE_ID = 'node-1';

const EVERY_MINUTE: Schedule = { kind: 'cron', cronExpression: '0 * * * * *', timezone: 'UTC' };
const EVERY_HOUR: Schedule = { kind: 'cron', cronExpression: '0 0 * * * *', timezone: 'UTC' };
const FIRST_RUN_AT = new Date('2025-01-01T00:00:00.000Z');

describe('nameDesiredJobs', () => {
	it('names each schedule by workflow, node, fingerprint and occurrence', () => {
		const desired = nameDesiredJobs(WORKFLOW_ID, NODE_ID, [
			{ schedule: EVERY_MINUTE, firstRunAt: FIRST_RUN_AT },
			{ schedule: EVERY_HOUR, firstRunAt: FIRST_RUN_AT },
		]);

		expect(desired).toEqual([
			{
				name: `${WORKFLOW_ID}:${NODE_ID}:${scheduleFingerprint(EVERY_MINUTE, true)}:0`,
				schedule: EVERY_MINUTE,
				firstRunAt: FIRST_RUN_AT,
			},
			{
				name: `${WORKFLOW_ID}:${NODE_ID}:${scheduleFingerprint(EVERY_HOUR, true)}:0`,
				schedule: EVERY_HOUR,
				firstRunAt: FIRST_RUN_AT,
			},
		]);
	});

	it('tells duplicate schedules apart by their occurrence index', () => {
		const desired = nameDesiredJobs(WORKFLOW_ID, NODE_ID, [
			{ schedule: EVERY_MINUTE, firstRunAt: FIRST_RUN_AT },
			{ schedule: EVERY_HOUR, firstRunAt: FIRST_RUN_AT },
			{ schedule: EVERY_MINUTE, firstRunAt: FIRST_RUN_AT },
		]);

		const minutely = scheduleFingerprint(EVERY_MINUTE, true);
		const hourly = scheduleFingerprint(EVERY_HOUR, true);
		expect(desired.map((job) => job.name)).toEqual([
			`${WORKFLOW_ID}:${NODE_ID}:${minutely}:0`,
			`${WORKFLOW_ID}:${NODE_ID}:${hourly}:0`,
			`${WORKFLOW_ID}:${NODE_ID}:${minutely}:1`,
		]);
	});

	it('fingerprints a clock-dead rule apart from the same rule with a first run', () => {
		const [live, dead] = nameDesiredJobs(WORKFLOW_ID, NODE_ID, [
			{ schedule: EVERY_MINUTE, firstRunAt: FIRST_RUN_AT },
			{ schedule: EVERY_MINUTE, firstRunAt: null },
		]);

		expect(live.name).toBe(
			`${WORKFLOW_ID}:${NODE_ID}:${scheduleFingerprint(EVERY_MINUTE, true)}:0`,
		);
		expect(dead.name).toBe(
			`${WORKFLOW_ID}:${NODE_ID}:${scheduleFingerprint(EVERY_MINUTE, false)}:0`,
		);
	});
});
