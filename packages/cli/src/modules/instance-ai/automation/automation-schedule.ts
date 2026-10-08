import { AUTOMATION_PROPOSAL_LIMITS } from '@n8n/api-types';
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

export type CronChoice = { cron?: string; warning?: string };

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

/** Without rules, n8n runs a Schedule Trigger with one rule of the defaults. */
const scheduleParametersSchema = z.object({
	rule: z.object({ interval: z.array(z.unknown()).default([{}]) }).default({}),
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
 * The cron of a cron rule when the card can show it. A rule with seconds, an expression (text
 * that starts with "=") and text that is not a cron fail the check.
 */
function cronOfExpression(expression: string): string | undefined {
	const cron = normaliseCron(expression);
	const fits = cron.length <= AUTOMATION_PROPOSAL_LIMITS.cronLength && isFiveFieldCron(cron);
	return fits ? cron : undefined;
}

/** A cron field for each value, or for each `step` values. */
function everyStep(step: number): string {
	return step === 1 ? '*' : `*/${step}`;
}

/**
 * The cron of each kind of rule, without the second that n8n adds. Undefined when no cron says
 * when the rule runs. For such a rule n8n runs a cron more often and skips runs until the
 * interval has passed. A step that divides its cycle evenly needs no skips.
 */
const CRON_OF_RULE: Record<ScheduleRule['field'], (rule: ScheduleRule) => string | undefined> = {
	cronExpression: (rule) => cronOfExpression(rule.expression),
	minutes: ({ minutesInterval: step }) =>
		60 % step === 0 ? `${everyStep(step)} * * * *` : undefined,
	hours: ({ hoursInterval: step, triggerAtMinute }) =>
		24 % step === 0 ? `${triggerAtMinute} ${everyStep(step)} * * *` : undefined,
	days: ({ daysInterval, triggerAtMinute, triggerAtHour }) =>
		daysInterval === 1 ? `${triggerAtMinute} ${triggerAtHour} * * *` : undefined,
	weeks: ({ weeksInterval, triggerAtMinute, triggerAtHour, triggerAtDay }) =>
		weeksInterval === 1
			? `${triggerAtMinute} ${triggerAtHour} * * ${triggerAtDay.join(',') || '*'}`
			: undefined,
	months: ({ monthsInterval: step, triggerAtMinute, triggerAtHour, triggerAtDayOfMonth }) =>
		12 % step === 0
			? `${triggerAtMinute} ${triggerAtHour} ${triggerAtDayOfMonth} ${everyStep(step)} *`
			: undefined,
};

/** True when more than one enabled node starts the workflow, so no one schedule says when. */
function hasOtherStarters(nodes: readonly ScheduleNode[]): boolean {
	return nodes.filter((node) => node.disabled !== true && canStartAutomation(node.type)).length > 1;
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
	const node = nodes.find((candidate) => candidate.name === trigger.node?.name);
	if (node?.type !== SCHEDULE_TRIGGER_NODE_TYPE || hasOtherStarters(nodes)) return undefined;
	const parameters = scheduleParametersSchema.safeParse(node.parameters ?? {});
	if (!parameters.success || parameters.data.rule.interval.length !== 1) return undefined;
	const rule = scheduleRuleSchema.safeParse(parameters.data.rule.interval[0]);
	return rule.success ? CRON_OF_RULE[rule.data.field](rule.data) : undefined;
}

/** Tells the model why the card does not show its cron, so that it can correct itself. */
function ignoredCronWarning(
	trigger: AutomationTrigger,
	given: string,
	triggerCron: string | undefined,
): string {
	if (trigger.kind !== 'schedule') {
		return 'Ignored the cron expression, because the workflow does not start with a schedule trigger.';
	}
	if (triggerCron !== undefined) {
		return `Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${triggerCron}".`;
	}
	return `Ignored the cron expression "${given}". The card shows only a schedule that it reads from the trigger, and no single five-field cron expression says when this schedule trigger runs.`;
}

/**
 * What the card says about the schedule. The card shows only the cron that the server read
 * from the trigger, because the user agrees to what the card shows. The tool reports a cron of
 * the model that differs in a warning.
 *
 * @param given The cron expression from the model.
 * @param triggerCron The cron of the trigger, from `triggerCronOf`.
 */
export function chooseCron(
	trigger: AutomationTrigger,
	given: string | undefined,
	triggerCron: string | undefined,
): CronChoice {
	const expression = normaliseCron(given ?? '');
	const shown: CronChoice = triggerCron === undefined ? {} : { cron: triggerCron };
	if (expression === '' || expression === triggerCron) return shown;
	return { ...shown, warning: ignoredCronWarning(trigger, expression, triggerCron) };
}
