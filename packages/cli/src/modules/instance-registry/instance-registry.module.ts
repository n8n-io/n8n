import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

function isFeatureFlagEnabled(): boolean {
	return process.env.N8N_ENV_FEAT_INSTANCE_REGISTRY === 'true';
}

/**
 * Instance Registry Module
 *
 * Tracks all n8n processes (main, worker, webhook) in distributed deployments.
 * Provides cluster visibility, version mismatch detection, and health checks.
 *
 * Runs on all instance types (no instanceTypes filter).
 */
@BackendModule({ name: 'instance-registry' })
export class InstanceRegistryModule implements ModuleInterface {
	async init() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		await import('./instance-registry.controller');

		const { InstanceRegistryService } = await import('./instance-registry.service');
		await Container.get(InstanceRegistryService).init();

		const { StaleMemberCleanupService } = await import('./stale-member-cleanup.service');
		Container.get(StaleMemberCleanupService).init();
	}

	@OnShutdown()
	async shutdown() {
		if (!isFeatureFlagEnabled()) {
			return;
		}

		const { InstanceRegistryService } = await import('./instance-registry.service');
		await Container.get(InstanceRegistryService).shutdown();
	}
}
