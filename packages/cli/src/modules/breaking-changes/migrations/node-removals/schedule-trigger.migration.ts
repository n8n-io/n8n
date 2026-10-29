import { createHash } from 'node:crypto';
import type { INodeParameters } from 'n8n-workflow';

import type { NodeMigration } from '../node-migration';
import { asParameters, readInteger, readString } from '../parameter-readers';

const SCHEDULE_TRIGGER_TYPE = 'n8n-nodes-base.scheduleTrigger';
// 1.4 adds the missed-run settings. Their defaults skip a missed run, as Cron did.
const SCHEDULE_TRIGGER_VERSION = 1.4;

const scheduleTrigger = (...intervals: INodeParameters[]) => ({
	type: SCHEDULE_TRIGGER_TYPE,
	typeVersion: SCHEDULE_TRIGGER_VERSION,
	parameters: { rule: { interval: intervals } },
});

// Cron picked a random minute for "every X hours". A fixed minute 0 would start all migrated
// workflows together. The hash gives each rule its own minute, and the same one on every run.
const spreadMinute = (seed: string) =>
	createHash('sha256').update(seed).digest().readUInt32BE(0) % 60;

function cronItemToRule(item: INodeParameters, seed: string): INodeParameters {
	// Defaults come from `NodeHelpers.cronNodeOptions`. Saved workflows omit them.
	const mode = readString(item, 'mode', 'everyDay', 'Mode');
	const time = () => ({
		triggerAtHour: readInteger(item, 'hour', 14, 'Hour', { min: 0, max: 23 }),
		triggerAtMinute: readInteger(item, 'minute', 0, 'Minute', { min: 0, max: 59 }),
	});

	switch (mode) {
		case 'everyMinute':
			return { field: 'minutes', minutesInterval: 1 };
		case 'everyHour':
			return {
				field: 'hours',
				hoursInterval: 1,
				triggerAtMinute: readInteger(item, 'minute', 0, 'Minute', { min: 0, max: 59 }),
			};
		case 'everyDay':
			return { field: 'days', daysInterval: 1, ...time() };
		case 'everyWeek':
			return {
				field: 'weeks',
				weeksInterval: 1,
				triggerAtDay: [readInteger(item, 'weekday', 1, 'Weekday', { min: 0, max: 6 })],
				...time(),
			};
		case 'everyMonth':
			return {
				field: 'months',
				monthsInterval: 1,
				triggerAtDayOfMonth: readInteger(item, 'dayOfMonth', 1, 'Day of Month', {
					min: 1,
					max: 31,
				}),
				...time(),
			};
		case 'everyX': {
			const unit = readString(item, 'unit', 'hours', 'Unit');
			// Cron fires `*/n`, which is uneven when `n` does not divide the period.
			// Schedule Trigger keeps an even gap. We accept that change.
			// Schedule Trigger 1.3 and later rejects values outside these ranges.
			if (unit === 'minutes') {
				const value = readInteger(item, 'value', 2, 'Value', { min: 1, max: 59 });
				return { field: 'minutes', minutesInterval: value };
			}
			if (unit === 'hours') {
				const value = readInteger(item, 'value', 2, 'Value', { min: 1, max: 23 });
				return { field: 'hours', hoursInterval: value, triggerAtMinute: spreadMinute(seed) };
			}
			throw new Error(`Cron unit "${unit}" is not supported, so the node cannot be migrated.`);
		}
		case 'custom': {
			const expression = readString(item, 'cronExpression', '* * * * * *', 'Cron Expression');
			return { field: 'cronExpression', expression: expression.trim() };
		}
		default:
			throw new Error(`Cron mode "${mode}" is not supported, so the node cannot be migrated.`);
	}
}

// `*/n` restarts every hour or day, so it only gives an even gap when `n` divides the period.
// Schedule Trigger does not use `*/n` in that case, so the run times change.
const hasUnevenStep = (rule: INodeParameters) =>
	(rule.field === 'minutes' &&
		typeof rule.minutesInterval === 'number' &&
		60 % rule.minutesInterval !== 0) ||
	(rule.field === 'hours' &&
		typeof rule.hoursInterval === 'number' &&
		24 % rule.hoursInterval !== 0);

const UNEVEN_STEP_NOTE =
	'Cron ran an "Every X" schedule at fixed clock times, which did not repeat at an even gap. Schedule Trigger now repeats at an even gap from the first run, so the run times changed. Check the schedule.';

/**
 * Cron to Schedule Trigger.
 *
 * Does:
 * - Target: `scheduleTrigger`, version 1.4. It adds the missed-run settings. The migration
 *   does not write them. Their defaults skip a missed run, as Cron did.
 * - Maps: each Cron trigger time to one schedule rule that fires at the same wall-clock
 *   times.
 * - Writes: every value explicitly, because the Cron defaults (for example hour 14)
 *   differ from the Schedule Trigger defaults.
 * - Picks: a minute for `everyX` hours, from a hash of the node id and the rule position.
 *   Cron picked a random minute, and the default minute 0 would start all migrated
 *   workflows together.
 *
 * Refuses when:
 * - There are no trigger times: Cron never fires, but Schedule Trigger fires every day.
 * - A value is an expression or is out of range.
 * - `everyX` is outside 1-59 for minutes or 1-23 for hours, or has an unknown unit.
 * - The mode is unknown.
 *
 * Accepted changes:
 * - `everyX` keeps an even gap. Cron used a cron step of `n`, which is uneven when `n`
 *   does not divide 60 (minutes) or 24 (hours). The run times then change, so the
 *   migration reports a note. The note also turns off the one-click republish.
 * - Cron picks a random second at each activation and Schedule Trigger picks a stable
 *   one. The second is not a setting.
 * - The minute of `everyX` hours is fixed at migration. Cron picked a new minute at each
 *   activation.
 * - Trigger times that fire at the same moment give one execution. Cron fired each at its
 *   own random second and ran twice. Schedule Trigger uses one stable second for the node
 *   and drops the second run. The two runs got the same input, because Cron has no
 *   output that names the trigger time. This applies to equal rules and to overlapping
 *   rules, such as "every 5 minutes" and "every hour at minute 0".
 * - The output has extra date fields.
 */
export const cronToScheduleTrigger: NodeMigration = {
	ruleId: 'cron-removed-v3',
	migrate: (node) => {
		const { triggerTimes } = node.parameters;
		const items = asParameters(triggerTimes)?.item;
		const rules = Array.isArray(items) ? items.map(asParameters) : [];
		if (rules.length === 0 || rules.includes(undefined)) {
			throw new Error(
				'This Cron node has no trigger times, so it never fires. Add a schedule or remove the node before migrating.',
			);
		}

		const migratedRules = rules.map((rule, index) =>
			cronItemToRule(rule ?? {}, `${node.id}:${index}`),
		);

		return {
			node: scheduleTrigger(...migratedRules),
			notes: migratedRules.some(hasUnevenStep) ? [UNEVEN_STEP_NOTE] : undefined,
		};
	},
};
