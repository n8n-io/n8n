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
		const { OtelSettingsService } = await import('./otel-settings.service.js');
		const { toBaggageHeader, toCallerBaggage } = await import('./caller-baggage.js');
		const tracer = Container.get(ExecutionLevelTracer);
		const settingsService = Container.get(OtelSettingsService);

		return {
			injectTraceHeaders: tracer.injectTraceHeaders.bind(tracer),
			extractInboundBaggage: (header: string | string[] | undefined) => {
				if (!settingsService.isOutboundInjectionEnabled()) return undefined;

				const baggage = toCallerBaggage(header);
				return baggage && toBaggageHeader(baggage);
			},
		};
	}

	@OnShutdown(LOWEST_SHUTDOWN_PRIORITY)
	async shutdown() {
		const { OtelService } = await import('./otel.service.js');
		await Container.get(OtelService).shutdown();
	}
}
