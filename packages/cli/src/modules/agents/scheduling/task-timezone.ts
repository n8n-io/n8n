import { isValidTimeZone } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';

/**
 * The IANA zone a task's cron is evaluated in, or `null` for the instance
 * timezone. Null is the shape tasks had before they carried a zone. An unknown
 * zone also resolves to null, with a warning, rather than failing the task:
 * the cron planner would throw and take the agent's whole reconcile with it.
 */
export function knownTaskTimezone(
	timezone: string | null | undefined,
	taskId: string,
	logger: Logger,
): string | null {
	if (!timezone) return null;
	if (isValidTimeZone(timezone)) return timezone;
	logger.warn('Task has unknown timezone, using instance timezone', { taskId, timezone });
	return null;
}
