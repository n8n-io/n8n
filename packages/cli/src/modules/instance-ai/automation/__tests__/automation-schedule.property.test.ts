import { isRecord } from '@n8n/utils/is-record';
import { CronTime } from 'cron';
import fc from 'fast-check';
import {
	intervalToRecurrence,
	recurrenceCheck,
	toCronExpression,
	withIntervalDefaults,
} from 'n8n-nodes-base/nodes/Schedule/GenericFunctions';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type {
	IRecurrenceRule,
	RawScheduleInterval,
} from 'n8n-nodes-base/nodes/Schedule/SchedulerInterface';
import { type INodeParameters, NodeHelpers } from 'n8n-workflow';

import { isFiveFieldCron, triggerCronOf } from '../automation-schedule';
import type { AutomationTrigger } from '../automation-trigger';

const SCHEDULE = 'n8n-nodes-base.scheduleTrigger';
const description = new ScheduleTrigger().description;
const trigger: AutomationTrigger = {
	kind: 'schedule',
	node: { name: 'Schedule', type: SCHEDULE },
	canActivate: true,
};

const isRawInterval = (value: unknown): value is RawScheduleInterval =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const START = new Date('2026-01-01T00:00:00Z');
// Two full cycles of every interval in `ruleArb`: the longest is twelve months.
const RUNS_TO_CHECK = 30;
const UNTIL = new Date('2029-01-01T00:00:00Z');

/** True when the node skips a run of its cron, because the interval has not passed yet. */
function skipsRuns(expression: string, recurrence: IRecurrenceRule): boolean {
	if (!recurrence.activated) return false;
	const cronTime = new CronTime(expression, 'UTC');
	const lastRuns: (number | undefined)[] = [];
	let run = START;
	for (let count = 0; count < RUNS_TO_CHECK; count++) {
		run = cronTime.getNextDateFrom(run, 'UTC').toJSDate();
		if (run > UNTIL) return false;
		// The node reads the time of the run from the clock.
		vi.setSystemTime(run);
		if (!recurrenceCheck(recurrence, lastRuns, 'UTC')) return true;
	}
	return false;
}

/**
 * The cron that the Schedule Trigger node registers when n8n runs the workflow, without its
 * seconds. Undefined when the node runs more than once a minute, or skips runs of its cron,
 * because then no five-field cron says when it runs. This is the code of the node, so the test
 * compares the card with what really runs.
 */
function cronThatRuns(parameters: INodeParameters): string | undefined {
	// n8n adds the defaults of the node when it loads the workflow to run it.
	const filled = NodeHelpers.getNodeParameters(
		description.properties,
		parameters,
		true,
		false,
		{ typeVersion: 1.2 },
		description,
	);
	const rule: unknown = filled?.rule;
	// The node reads a missing list of rules as one rule of the defaults.
	const raw: unknown[] = isRecord(rule) && Array.isArray(rule.interval) ? rule.interval : [{}];
	if (raw.length !== 1 || !isRawInterval(raw[0])) return undefined;
	const interval = withIntervalDefaults(raw[0]);
	if (interval.field === 'seconds') return undefined;
	const expression = toCronExpression(interval, 'workflow:node');
	if (skipsRuns(expression, intervalToRecurrence(interval, 0))) return undefined;
	const fields = expression.split(' ').slice(1);
	// The node writes a step of one as "*/1". The card writes "*", which means the same.
	return fields.map((field) => (field === '*/1' ? '*' : field)).join(' ');
}

// Values in the ranges that the node accepts. Each key can be absent, so the defaults count too.
const ruleArb = fc.record(
	{
		field: fc.constantFrom('seconds', 'minutes', 'hours', 'days', 'weeks', 'months'),
		secondsInterval: fc.integer({ min: 1, max: 59 }),
		minutesInterval: fc.integer({ min: 1, max: 59 }),
		hoursInterval: fc.integer({ min: 1, max: 23 }),
		daysInterval: fc.integer({ min: 1, max: 31 }),
		weeksInterval: fc.integer({ min: 1, max: 4 }),
		monthsInterval: fc.integer({ min: 1, max: 14 }),
		triggerAtDay: fc.uniqueArray(fc.integer({ min: 0, max: 6 }), { maxLength: 7 }),
		triggerAtDayOfMonth: fc.integer({ min: 1, max: 31 }),
		triggerAtHour: fc.integer({ min: 0, max: 23 }),
		triggerAtMinute: fc.integer({ min: 0, max: 59 }),
	},
	{ requiredKeys: [] },
);

describe('triggerCronOf against the Schedule Trigger node (property)', () => {
	beforeAll(() => {
		vi.useFakeTimers({ toFake: ['Date'] });
	});

	afterAll(() => {
		vi.useRealTimers();
	});

	// Each case steps the clock through up to thirty runs of the node, so allow more time.
	it('shows the cron that the node runs, or nothing when no cron says when it runs', () => {
		fc.assert(
			fc.property(ruleArb, (rule) => {
				const parameters: INodeParameters = { rule: { interval: [rule] } };
				const shown = triggerCronOf([{ name: 'Schedule', type: SCHEDULE, parameters }], trigger);

				expect(shown).toBe(cronThatRuns(parameters));
				if (shown !== undefined) expect(isFiveFieldCron(shown)).toBe(true);
			}),
			{ numRuns: 500 },
		);
	}, 30_000);

	it('agrees with the node about the defaults of a workflow without rules', () => {
		expect(triggerCronOf([{ name: 'Schedule', type: SCHEDULE, parameters: {} }], trigger)).toBe(
			cronThatRuns({}),
		);
	});
});
