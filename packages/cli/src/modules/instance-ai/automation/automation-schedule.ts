import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import z from 'zod';

import { isValidCronExpression } from '@/modules/agents/integrations/cron-validation';

import type { AutomationNode, AutomationTrigger } from './automation-trigger';

/** A workflow node with the parameters that the schedule reads. */
export type ScheduleNode = AutomationNode & { parameters?: unknown };

export type CronChoice = { cron?: string; warning?: string };

/** The rules of a Schedule Trigger that has exactly one rule, and that rule is a cron rule. */
const singleCronRuleSchema = z.object({
	rule: z.object({
		interval: z.tuple([z.object({ field: z.literal('cronExpression'), expression: z.string() })]),
	}),
});

// n8n evaluates a parameter value that starts with "=" as an expression. The card cannot.
const EXPRESSION_PREFIX = '=';

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
 * The cron rule of the trigger that starts the workflow. Undefined when the trigger is not a
 * Schedule Trigger with exactly one cron rule, because then no single cron says when it runs.
 */
export function triggerCronOf(
	nodes: readonly ScheduleNode[],
	trigger: AutomationTrigger,
): string | undefined {
	const node = nodes.find((candidate) => candidate.name === trigger.node?.name);
	if (node?.type !== SCHEDULE_TRIGGER_NODE_TYPE) return undefined;
	const rules = singleCronRuleSchema.safeParse(node.parameters);
	if (!rules.success) return undefined;
	const expression = normaliseCron(rules.data.rule.interval[0].expression);
	if (expression === '' || expression.startsWith(EXPRESSION_PREFIX)) return undefined;
	return expression;
}

function cronOfTrigger(triggerCron: string, given: string): CronChoice {
	// A cron with seconds is valid in the trigger, but the card shows five-field crons only.
	const shown: CronChoice = isFiveFieldCron(triggerCron) ? { cron: triggerCron } : {};
	if (given === '' || given === triggerCron) return shown;
	return {
		...shown,
		warning: `Ignored the cron expression "${given}", because the schedule trigger uses the cron expression "${triggerCron}".`,
	};
}

/**
 * The cron expression that the card shows. The cron rule of the Schedule Trigger wins, because
 * it runs the workflow. Without such a rule, the card shows the cron from the model when it is a
 * valid five-field cron. The tool reports a cron that it ignored in a warning, so that the model
 * can correct it.
 *
 * @param given The cron expression from the model.
 * @param triggerCron The cron rule of the trigger, from `triggerCronOf`.
 */
export function chooseCron(
	trigger: AutomationTrigger,
	given: string | undefined,
	triggerCron: string | undefined,
): CronChoice {
	const expression = normaliseCron(given ?? '');
	if (trigger.kind !== 'schedule') {
		if (expression === '') return {};
		return {
			warning:
				'Ignored the cron expression, because the workflow does not start with a schedule trigger.',
		};
	}
	if (triggerCron !== undefined) return cronOfTrigger(triggerCron, expression);
	if (expression === '') return {};
	if (isFiveFieldCron(expression)) return { cron: expression };
	return {
		warning: `Ignored the cron expression "${expression}", because it is not a valid five-field cron expression.`,
	};
}
