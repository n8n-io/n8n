import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Has no licence flag: usage is counted before a licence or a limit exists, so a new
 * limit sees the earlier runs of its period. The licensed parts gate themselves.
 */
@BackendModule({ name: 'execution-limits' })
export class ExecutionLimitsModule implements ModuleInterface {
	async init() {
		const { FoldStepRegistry } = await import('@n8n/db');
		const { ExecutionLimitUsageFoldStep } = await import('./execution-limit-usage.fold-step.js');

		Container.get(FoldStepRegistry).register(Container.get(ExecutionLimitUsageFoldStep));

		// Loaded before the process takes work, so the first read already has the limits.
		const { ExecutionLimitsSnapshot } = await import('./execution-limits-snapshot.js');
		await Container.get(ExecutionLimitsSnapshot).start();
	}

	async entities() {
		const { ExecutionLimitInstanceUsage } = await import(
			'./execution-limit-instance-usage.entity.js'
		);
		const { ExecutionLimitUsage } = await import('./execution-limit-usage.entity.js');
		const { ProjectExecutionLimit } = await import('./project-execution-limit.entity.js');

		return [ProjectExecutionLimit, ExecutionLimitUsage, ExecutionLimitInstanceUsage];
	}
}
