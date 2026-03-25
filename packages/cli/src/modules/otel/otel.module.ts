import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({
	name: 'otel',
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class OtelModule implements ModuleInterface {
	async init() {
		const { OtelConfig } = await import('./otel.config');
		const config = Container.get(OtelConfig);
		if (!config.enabled) return;

		const { OtelService } = await import('./otel.service');
		Container.get(OtelService).init();

		// Importing N8nInstrumentation triggers @OnLifecycleEvent registration
		await import('./n8n-instrumentation');
	}

	@OnShutdown()
	async shutdown() {
		const { OtelConfig } = await import('./otel.config');
		const config = Container.get(OtelConfig);
		if (!config.enabled) return;

		const { OtelService } = await import('./otel.service');
		await Container.get(OtelService).shutdown();
	}
}
