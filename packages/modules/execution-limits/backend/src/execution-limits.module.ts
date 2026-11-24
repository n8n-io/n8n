import { LicenseState } from '@n8n/backend-common';
import { ProjectMutationHooksProxy } from '@n8n/backend-services';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Has no licence flag: usage is counted before a licence or a limit exists, so a new
 * limit sees the earlier runs of its period. `init` stops after that step when unlicensed.
 */
@BackendModule({ name: 'execution-limits' })
export class ExecutionLimitsModule implements ModuleInterface {
	async init() {
		const { FoldStepRegistry } = await import('@n8n/db');
		const { ExecutionLimitUsageFoldStep } = await import('./execution-limit-usage.fold-step.js');

		Container.get(FoldStepRegistry).register(Container.get(ExecutionLimitUsageFoldStep));

		if (!Container.get(LicenseState).isExecutionLimitsLicensed()) return;

		// Loaded before the process takes work, so the first read already has the limits.
		const { ExecutionLimitsSnapshot } = await import('./execution-limits-snapshot.js');
		await Container.get(ExecutionLimitsSnapshot).start();

		Container.get(ProjectMutationHooksProxy).registerProvider({
			afterTeamProjectCreated: async (projectId) => {
				const { ExecutionLimitsService } = await import('./execution-limits.service.js');
				await Container.get(ExecutionLimitsService).applyDefaultLimitToNewProject(projectId);
			},
		});
	}

	async entities() {
		const { ExecutionLimitAudit } = await import('./execution-limit-audit.entity.js');
		const { ExecutionLimitInstanceUsage } = await import(
			'./execution-limit-instance-usage.entity.js'
		);
		const { ExecutionLimitUsage } = await import('./execution-limit-usage.entity.js');
		const { ProjectExecutionLimit } = await import('./project-execution-limit.entity.js');

		return [
			ProjectExecutionLimit,
			ExecutionLimitUsage,
			ExecutionLimitInstanceUsage,
			ExecutionLimitAudit,
		];
	}
}
