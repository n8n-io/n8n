import { validateCronExpression } from 'cron';

/**
 * Whether the given expression parses as a valid 5-field cron.
 *
 * Shared between the schedule REST endpoint and the JSON-config Zod schema so
 * both surfaces reject malformed crons with the same rule.
 */
export function isValidCronExpression(expression: string): boolean {
	return validateCronExpression(expression).valid;
}
