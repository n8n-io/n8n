import fc from 'fast-check';
import {
	intervalToRecurrence,
	toCronExpression,
	withIntervalDefaults,
} from 'n8n-nodes-base/nodes/Schedule/GenericFunctions';
import { ScheduleTrigger } from 'n8n-nodes-base/nodes/Schedule/ScheduleTrigger.node';
import type { RawScheduleInterval } from 'n8n-nodes-base/nodes/Schedule/SchedulerInterface';
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

/**
 * The cron that the Schedule Trigger node registers when n8n runs the workflow, without its
 * seconds. Undefined when the node skips runs of its cron, which no cron can say. This is the
 * code of the node, so the test compares the card with what really runs.
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
	const rule = filled?.rule;
	const raw = isRawInterval(rule) && Array.isArray(rule.interval) ? rule.interval : [{}];
	if (raw.length !== 1 || !isRawInterval(raw[0])) return undefined;
	const interval = withIntervalDefaults(raw[0]);
	if (interval.field === 'seconds' || intervalToRecurrence(interval, 0).activated) return undefined;
	const fields = toCronExpression(interval, 'workflow:node').split(' ').slice(1);
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
	it('shows the cron that the node runs, or nothing when no cron says when it runs', () => {
		fc.assert(
			fc.property(ruleArb, (rule) => {
				const parameters: INodeParameters = { rule: { interval: [rule] } };
				const shown = triggerCronOf([{ name: 'Schedule', type: SCHEDULE, parameters }], trigger);

				expect(shown).toBe(cronThatRuns(parameters));
				if (shown !== undefined) expect(isFiveFieldCron(shown)).toBe(true);
			}),
			{ numRuns: 1000 },
		);
	});

	it('agrees with the node about the defaults of a workflow without rules', () => {
		expect(triggerCronOf([{ name: 'Schedule', type: SCHEDULE, parameters: {} }], trigger)).toBe(
			cronThatRuns({}),
		);
	});
});
