import type { SystemTaskClass } from '@n8n/decorators';

/**
 * Return the main command's own system tasks, owned by no backend module.
 */
export function mainSystemTasks(): SystemTaskClass[] {
	return [];
}
