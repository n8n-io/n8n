import { AUTOMATION_PROPOSAL_LIMITS, StrictTimeZoneSchema } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import z from 'zod';

import { isValidCronExpression } from '@/modules/agents/integrations/cron-validation';

import {
	type AutomationNode,
	type AutomationTrigger,
	canStartAutomation,
} from './automation-trigger';

/** A workflow node with the parameters that the schedule reads. */
export type ScheduleNode = AutomationNode & { parameters?: unknown };

/** The fields of a stored workflow that the schedule reads. */
export type ScheduleWorkflow = { nodes: readonly ScheduleNode[]; settings?: unknown };

/** Why the card shows no schedule. */
export type ScheduleGap = 'not-schedule' | 'other-starters' | 'unreadable' | 'invalid-timezone';

/** A schedule that the card shows: the cron and the time zone that n8n runs it in. */
export type ShownSchedule = { cron: string; timezone: string };

/** What the server reads from the workflow: the schedule, or why the card shows none. */
export type TriggerSchedule = ShownSchedule | { gap: ScheduleGap };

export type CronChoice = { shown?: ShownSchedule; warning?: string };

/**
 * One rule of a Schedule Trigger, with the defaults that n8n adds when it runs the workflow.
 * The stored workflow leaves out each value that is the same as its default. The bounds are
 * those of the node, so a value that n8n refuses gives no cron. A rule of seconds is not in the
 * list, because it runs more than once a minute and no five-field cron can say that.
 */
const scheduleRuleSchema = z.object({
	field: z.enum(['cronExpression', 'minutes', 'hours', 'days', 'weeks', 'months']).default('days'),
	expression: z.string().default(''),
	minutesInterval: z.number().int().min(1).max(59).default(5),
	hoursInterval: z.number().int().min(1).max(23).default(1),
	daysInterval: z.number().int().min(1).max(31).default(1),
	weeksInterval: z.number().int().min(1).default(1),
	monthsInterval: z.number().int().min(1).default(1),
	triggerAtDay: z.array(z.number().int().min(0).max(6)).default([0]),
	triggerAtDayOfMonth: z.number().int().min(1).max(31).default(1),
	triggerAtHour: z.number().int().min(0).max(23).default(0),
	triggerAtMinute: z.number().int().min(0).max(59).default(0),
});
type ScheduleRule = z.infer<typeof scheduleRuleSchema>;

/**
 * The rules of a Schedule Trigger. Without `rule`, n8n runs one rule of the defaults. A `rule`
 * without `interval` (the editor stores it when the user deletes the last rule) gets no defaults:
 * n8n then takes the hour and the minute from the ids of the workflow and the node, so the parse
 * fails and the card shows no schedule.
 */
const scheduleParametersSchema = z.object({
	rule: z.object({ interval: z.array(z.unknown()) }).default({ interval: [{}] }),
});

/** The cron expression with one space between its fields. */
function normaliseCron(expression: string): string {
	return expression.trim().split(/\s+/).join(' ');
}

/** True for a normalised cron of five fields that both task schedulers accept. */
export function isFiveFieldCron(expression: string): boolean {
	// The validator also accepts six fields, with seconds first. The card shows five only.
	return expression.split(' ').length === 5 && isValidCronExpression(expression);
}

/**
 * The cron when the card can show it. A cron with seconds, an expression (text that starts with
 * "=") and text that is not a cron fail the check, and so does a cron that the card cannot hold.
 */
function cardCron(expression: string): string | undefined {
	const cron = normaliseCron(expression);
	const fits = cron.length <= AUTOMATION_PROPOSAL_LIMITS.cronLength && isFiveFieldCron(cron);
	return fits ? cron : undefined;
}

/** A cron field for each value, or for each `step` values. */
function everyStep(step: number): string {
	return step === 1 ? '*' : `*/${step}`;
}

/** The days of the week in order, each one time. Order and repeats do not change the cron. */
function weekdaysField(days: readonly number[]): string {
	return [...new Set(days)].sort((a, b) => a - b).join(',') || '*';
}

/**
 * The cron of each kind of rule, without the second that n8n adds. Undefined when no cron says
 * when the rule runs. For such a rule n8n runs a cron more often and skips runs until the
 * interval has passed. A step that divides its cycle evenly needs no skips.
 */
const CRON_OF_RULE: Record<ScheduleRule['field'], (rule: ScheduleRule) => string | undefined> = {
	cronExpression: (rule) => rule.expression,
	minutes: ({ minutesInterval: step }) =>
		60 % step === 0 ? `${everyStep(step)} * * * *` : undefined,
	hours: ({ hoursInterval: step, triggerAtMinute }) =>
		24 % step === 0 ? `${triggerAtMinute} ${everyStep(step)} * * *` : undefined,
	days: ({ daysInterval, triggerAtMinute, triggerAtHour }) =>
		daysInterval === 1 ? `${triggerAtMinute} ${triggerAtHour} * * *` : undefined,
	weeks: ({ weeksInterval, triggerAtMinute, triggerAtHour, triggerAtDay }) =>
		weeksInterval === 1
			? `${triggerAtMinute} ${triggerAtHour} * * ${weekdaysField(triggerAtDay)}`
			: undefined,
	months: ({ monthsInterval: step, triggerAtMinute, triggerAtHour, triggerAtDayOfMonth }) =>
		12 % step === 0
			? `${triggerAtMinute} ${triggerAtHour} ${triggerAtDayOfMonth} ${everyStep(step)} *`
			: undefined,
};

/**
 * The cron of a Schedule Trigger node with exactly one rule that a cron can say, before the check
 * that the card can show it. Undefined for other nodes.
 */
function cronOfScheduleNode(node: ScheduleNode | undefined): string | undefined {
	if (node?.type !== SCHEDULE_TRIGGER_NODE_TYPE) return undefined;
	const parsed = scheduleParametersSchema.safeParse(node.parameters ?? {});
	if (!parsed.success || parsed.data.rule.interval.length !== 1) return undefined;
	const rule = scheduleRuleSchema.safeParse(parsed.data.rule.interval[0]);
	return rule.success ? CRON_OF_RULE[rule.data.field](rule.data) : undefined;
}

/** The cron of the trigger, or why there is none. */
function readTriggerCron(
	nodes: readonly ScheduleNode[],
	trigger: AutomationTrigger,
): { cron: string } | { gap: ScheduleGap } {
	if (trigger.kind !== 'schedule') return { gap: 'not-schedule' };
	// When more than one enabled node starts the workflow, no one schedule says when it runs.
	const starters = nodes.filter((node) => node.disabled !== true && canStartAutomation(node.type));
	if (starters.length > 1) return { gap: 'other-starters' };
	const raw = cronOfScheduleNode(nodes.find((node) => node.name === trigger.node?.name));
	const cron = raw === undefined ? undefined : cardCron(raw);
	return cron === undefined ? { gap: 'unreadable' } : { cron };
}

/**
 * The five-field cron that says when the workflow runs, as the server reads it from the
 * Schedule Trigger. Undefined when the trigger is not a Schedule Trigger, when it has not exactly
 * one rule, when no five-field cron says when its rule runs, or when another trigger also starts
 * the workflow. The card shows only this cron, never the cron of the model.
 */
export function triggerCronOf(
	nodes: readonly ScheduleNode[],
	trigger: AutomationTrigger,
): string | undefined {
	const read = readTriggerCron(nodes, trigger);
	return 'cron' in read ? read.cron : undefined;
}

/**
 * The time zone that n8n runs the schedule in: the zone of the workflow settings, else the
 * default zone of the instance. As for the scheduler, an empty zone and "DEFAULT" mean the
 * default zone. Undefined for a zone that is not valid.
 */
export function scheduleTimezoneOf(settings: unknown, defaultTimezone: string): string | undefined {
	const stored = isRecord(settings) ? settings.timezone : undefined;
	const zone =
		typeof stored === 'string' && stored !== '' && stored !== 'DEFAULT' ? stored : defaultTimezone;
	const parsed = StrictTimeZoneSchema.safeParse(zone);
	return parsed.success ? parsed.data : undefined;
}

/**
 * The schedule of the workflow, as the server reads it from the Schedule Trigger and the
 * workflow settings, or why the card shows none.
 *
 * @param defaultTimezone The default time zone of this n8n instance.
 */
export function readTriggerSchedule(
	workflow: ScheduleWorkflow,
	trigger: AutomationTrigger,
	defaultTimezone: string,
): TriggerSchedule {
	const read = readTriggerCron(workflow.nodes, trigger);
	if (!('cron' in read)) return read;
	const timezone = scheduleTimezoneOf(workflow.settings, defaultTimezone);
	return timezone === undefined ? { gap: 'invalid-timezone' } : { cron: read.cron, timezone };
}

/** Why the card does not show the cron of the model, for each gap. */
const GAP_WARNING: Record<ScheduleGap, (given: string) => string> = {
	'not-schedule': (given) =>
		`Ignored the cron expression "${given}", because the workflow does not start with a schedule trigger.`,
	'other-starters': (given) =>
		`Ignored the cron expression "${given}", because another trigger also starts the workflow. The card shows a schedule only when the schedule trigger alone starts the workflow.`,
	unreadable: (given) =>
		`Ignored the cron expression "${given}". The card shows only a schedule that it reads from the trigger, and no single five-field cron expression says when this schedule trigger runs.`,
	'invalid-timezone': (given) =>
		`Ignored the cron expression "${given}", because the time zone in the workflow settings is not valid.`,
};

/** Tells the model why the card does not show its cron, so that it can correct itself. */
function ignoredCronWarning(given: string, schedule: TriggerSchedule): string {
	const reason =
		'cron' in schedule
			? `Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${schedule.cron}".`
			: GAP_WARNING[schedule.gap](given);
	if (isFiveFieldCron(given)) return reason;
	return `${reason} The cron expression "${given}" is not a valid five-field cron expression.`;
}

/**
 * What the card says about the schedule. The card shows only the schedule that the server read
 * from the workflow, because the user agrees to what the card shows. The tool reports a cron of
 * the model that differs in a warning.
 *
 * @param given The cron expression from the model.
 * @param schedule The schedule of the workflow, from `readTriggerSchedule`.
 */
export function chooseCron(given: string | undefined, schedule: TriggerSchedule): CronChoice {
	const expression = normaliseCron(given ?? '');
	const shown: CronChoice = 'cron' in schedule ? { shown: schedule } : {};
	if (expression === '' || expression === shown.shown?.cron) return shown;
	return { ...shown, warning: ignoredCronWarning(expression, schedule) };
}
