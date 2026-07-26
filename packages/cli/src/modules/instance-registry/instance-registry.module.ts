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
		await import('./instance-registry.controller.js');

		const { InstanceRegistryService } = await import('./instance-registry.service.js');
		const instanceRegistryService = Container.get(InstanceRegistryService);
		await instanceRegistryService.init();

		const { InstanceRegistryProxyService } = await import(
			'@/services/instance-registry-proxy.service.js'
		);
		Container.get(InstanceRegistryProxyService).registerProvider(instanceRegistryService);

		const { StaleMemberCleanupService } = await import('./stale-member-cleanup.service.js');
		Container.get(StaleMemberCleanupService).init();

		await import('./checks/index.js');
		const { CheckService } = await import('./checks/check.service.js');
		Container.get(CheckService).init();
	}

	@OnShutdown()
	async shutdown() {
		const { InstanceRegistryService } = await import('./instance-registry.service.js');
		await Container.get(InstanceRegistryService).shutdown();
	}
}
