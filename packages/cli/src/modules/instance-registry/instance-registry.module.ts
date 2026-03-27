import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

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
		const { InstanceRegistryService } = await import('./instance-registry.service');
		await Container.get(InstanceRegistryService).init();
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceRegistryService } = await import('./instance-registry.service');
		await Container.get(InstanceRegistryService).shutdown();
	}
}
