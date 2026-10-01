import { computeFirstRunAt } from '@n8n/scheduler';
import { validateCronExpression } from 'cron';
import type { CronExpression } from 'n8n-workflow';

/**
 * Whether the given expression is a 5-field cron that both task schedulers can
 * run. The in-memory scheduler parses with `cron`, the durable scheduler plans
 * with `cron-parser`, and the two disagree on nicknames such as `@daily` and on
 * impossible dates such as `0 9 30 2 *`. A task passes only when both accept it.
 *
 * Shared between the schedule REST endpoint and the JSON-config Zod schema so
 * both surfaces reject malformed crons with the same rule.
 */
export function isValidCronExpression(expression: string): expression is CronExpression {
	if (!validateCronExpression(expression).valid) return false;

	try {
		computeFirstRunAt(
			{ kind: 'cron', cronExpression: expression as CronExpression, timezone: 'UTC' },
			new Date(),
		);
		return true;
	} catch {
		return false;
	}
}
