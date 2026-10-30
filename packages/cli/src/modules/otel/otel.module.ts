import type { ModuleContext, ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { LOWEST_SHUTDOWN_PRIORITY } from '@/constants';

@BackendModule({
	name: 'otel',
	instanceTypes: ['main', 'worker', 'webhook'],
})
export class OtelModule implements ModuleInterface {
	async init() {
		const { OtelLifecycleHandler } = await import('./otel-lifecycle-handler.js');
		Container.get(OtelLifecycleHandler).init();

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
		const { OtelBaggageConfig } = await import('./otel.config.js');
		const tracer = Container.get(ExecutionLevelTracer);
		const baggageConfig = Container.get(OtelBaggageConfig);

		return {
			injectTraceHeaders: tracer.injectTraceHeaders.bind(tracer),
			extractInboundBaggage: (header: unknown) => {
				if (!baggageConfig.propagate) return undefined;
				if (typeof header === 'string') return header;
				if (Array.isArray(header) && header.every((value) => typeof value === 'string')) {
					return header.join(',');
				}
				return undefined;
			},
		};
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async shutdown() {
		const { OtelService } = await import('./otel.service.js');
		await Container.get(OtelService).shutdown();
	}
}
