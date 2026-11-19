import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'execution-limits',
	licenseFlag: LICENSE_FEATURES.EXECUTION_LIMITS,
})
export class ExecutionLimitsModule implements ModuleInterface {
	async init() {
		// Loaded before the process takes work, so the first read already has the limits.
		const { ExecutionLimitsSnapshot } = await import('./execution-limits-snapshot.js');
		await Container.get(ExecutionLimitsSnapshot).start();
	}

	async entities() {
		const { ProjectExecutionLimit } = await import('./project-execution-limit.entity.js');

		return [ProjectExecutionLimit];
	}
}
