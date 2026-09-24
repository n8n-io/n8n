import type { GlobalConfig } from '@n8n/config';
import type { SystemTaskClass } from '@n8n/decorators';

/**
 * Return the system tasks every server command runs, whatever kind of instance
 * it is. A task whose feature is off is left out, so the runner only logs tasks
 * that will run.
 */
export async function instanceSystemTasks(globalConfig: GlobalConfig): Promise<SystemTaskClass[]> {
	const tasks: SystemTaskClass[] = [];

	if (globalConfig.diagnostics.enabled) {
		const { TelemetryBufferFlushTask } = await import('@/telemetry/telemetry-buffer-flush.task.js');
		tasks.push(TelemetryBufferFlushTask);
	}

	return tasks;
}
