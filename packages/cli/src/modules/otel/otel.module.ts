import type { ModuleContext, ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({
	name: 'otel',
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class OtelModule implements ModuleInterface {
	async init() {
		await import('./otel-lifecycle-handler.js');

		const { OtelService } = await import('./otel.service.js');
		await Container.get(OtelService).init();

		if (Container.get(InstanceSettings).instanceType === 'main') {
			await import('./otel-settings.controller.js');
		}
	}

	async settings() {
		const { OtelSettingsService } = await import('./otel-settings.service.js');
		const { enabled } = Container.get(OtelSettingsService).getSettings();
		return { enabled };
	}

	async context(): Promise<ModuleContext> {
		const { ExecutionLevelTracer } = await import('./execution-level-tracer.js');
		const tracer = Container.get(ExecutionLevelTracer);

		return {
			injectTraceHeaders: tracer.injectTraceHeaders.bind(tracer),
		};
	}

	@OnShutdown()
	async shutdown() {
		const { OtelService } = await import('./otel.service.js');
		await Container.get(OtelService).shutdown();
	}
}
