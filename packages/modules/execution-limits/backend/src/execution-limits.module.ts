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

		// Registered without a licence: a limit set under an earlier licence still exists.
		const hooks = Container.get(ProjectMutationHooksProxy);
		hooks.registerProvider({
			beforeProjectDeleted: async ({ projectId, userId, loginId }, ctx) => {
				const { ExecutionLimitsService } = await import('./execution-limits.service.js');
				return await Container.get(ExecutionLimitsService).removeLimitOfDeletedProject(
					projectId,
					userId,
					loginId,
					ctx,
				);
			},
		});

		if (!Container.get(LicenseState).isExecutionLimitsLicensed()) return;

		// Loaded before the process takes work, so the first read already has the limits.
		const { ExecutionLimitsSnapshot } = await import('./execution-limits-snapshot.js');
		await Container.get(ExecutionLimitsSnapshot).start();

		// Workers register it too: the runs they admit do not count, so it stops before any read.
		await import('./execution-limit.check.js');

		hooks.registerProvider({
			afterTeamProjectCreated: async (projectId) => {
				const { ExecutionLimitsService } = await import('./execution-limits.service.js');
				await Container.get(ExecutionLimitsService).applyDefaultLimitToNewProject(projectId);
			},
		});

		// A worker does not admit runs, so it needs no usage.
		const { InstanceSettings } = await import('n8n-core');
		const { instanceType } = Container.get(InstanceSettings);
		if (instanceType !== 'main' && instanceType !== 'webhook') return;

		const { ExecutionUsageCache } = await import('./execution-usage-cache.js');
		await Container.get(ExecutionUsageCache).start();
	}

	async systemTasks() {
		const { ExecutionLimitUsagePruningTask } = await import(
			'./execution-limit-usage-pruning.task.js'
		);
		return [ExecutionLimitUsagePruningTask];
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
