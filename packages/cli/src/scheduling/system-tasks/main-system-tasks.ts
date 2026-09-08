import type { SystemTaskClass } from '@n8n/decorators';

import { ActivityPruningTask } from '@/services/pruning/activity-pruning.task';

/**
 * Return the main command's own system tasks, owned by no backend module.
 */
export async function mainSystemTasks(): Promise<SystemTaskClass[]> {
	const { LicenseRenewalTask } = await import('@/license/license-renewal.task.js');

	return [ActivityPruningTask, LicenseRenewalTask];
}
