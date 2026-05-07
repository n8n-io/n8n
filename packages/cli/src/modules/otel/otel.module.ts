import type { ModuleContext, ModuleInterface } from '@n8n/decorators';
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

		// Importing the lifecycle handler triggers @OnLifecycleEvent registration
		await import('./otel-lifecycle-handler');
	}

	async context(): Promise<ModuleContext> {
		const { OtelConfig } = await import('./otel.config');
		const config = Container.get(OtelConfig);
		if (!config.enabled) return {};

		const { ExecutionLevelTracer } = await import('./execution-level-tracer');
		const tracer = Container.get(ExecutionLevelTracer);

		return {
			injectTraceHeaders: tracer.injectTraceHeaders.bind(tracer),
		};
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
