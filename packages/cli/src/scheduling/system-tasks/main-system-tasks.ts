import type { SystemTaskClass } from '@n8n/decorators';

/**
 * Return the main command's own system tasks, owned by no backend module.
 */
export async function mainSystemTasks(): Promise<SystemTaskClass[]> {
	const { LicenseRenewalTask } = await import('@/license/license-renewal.task.js');

	return [LicenseRenewalTask];
}
