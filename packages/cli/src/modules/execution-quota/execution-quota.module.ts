import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

/**
 * Execution Quota Management module.
 * Tracks and enforces per-project and per-workflow execution limits.
 *
 * Only main and webhook instances need this since they handle executions.
 */
@BackendModule({ name: 'execution-quota', instanceTypes: ['main', 'webhook'] })
export class ExecutionQuotaModule implements ModuleInterface {
	private pruningTimer?: NodeJS.Timeout;

	async init() {
		await import('./execution-quota.controller');

		const { ExecutionQuotaCollectionService } = await import(
			'./execution-quota-collection.service'
		);
		Container.get(ExecutionQuotaCollectionService).init();

		// Start periodic pruning
		await this.startPruningTimer();
	}

	async entities() {
		const { ExecutionQuotaConfig } = await import('./database/entities/execution-quota-config');
		const { ExecutionQuotaCounter } = await import('./database/entities/execution-quota-counter');

		return [ExecutionQuotaConfig, ExecutionQuotaCounter];
	}

	@OnShutdown()
	async shutdown() {
		if (this.pruningTimer) {
			clearInterval(this.pruningTimer);
			this.pruningTimer = undefined;
		}

		const { ExecutionQuotaCollectionService } = await import(
			'./execution-quota-collection.service'
		);
		await Container.get(ExecutionQuotaCollectionService).shutdown();
	}

	private async startPruningTimer() {
		const { ExecutionQuotaModuleConfig } = await import('./execution-quota.config');
		const { ExecutionQuotaService } = await import('./execution-quota.service');

		const config = Container.get(ExecutionQuotaModuleConfig);
		const service = Container.get(ExecutionQuotaService);

		this.pruningTimer = setInterval(
			() => {
				void service.pruneOldCounters();
			},
			config.pruneIntervalHours * 60 * 60 * 1000,
		);
	}
}
