import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, OnShutdown } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'ai-gateway' })
export class AiGatewayModule implements ModuleInterface {
	async init() {
		const { AiGatewayConfig } = await import('./ai-gateway.config');
		const config = Container.get(AiGatewayConfig);

		if (!config.enabled) return;

		await import('./ai-gateway.controller');

		const { AiGatewayService } = await import('./ai-gateway.service');
		await Container.get(AiGatewayService).provisionCredential();

		const { AiGatewayUsageService } = await import('./ai-gateway-usage.service');
		const usageService = Container.get(AiGatewayUsageService);

		const { EventService } = await import('@/events/event.service');
		const eventService = Container.get(EventService);

		eventService.on('ai-llm-generated-output', (event) => {
			try {
				const data = JSON.parse(event.msg) as {
					options?: { model?: string; modelName?: string };
					response?: {
						tokenUsage?: { promptTokens?: number; completionTokens?: number };
						tokenUsageEstimate?: { promptTokens?: number; completionTokens?: number };
					};
				};

				const model = data.options?.model ?? data.options?.modelName ?? 'unknown';
				const tokens = data.response?.tokenUsage ?? data.response?.tokenUsageEstimate;

				usageService.track({
					timestamp: new Date(),
					model,
					inputTokens: tokens?.promptTokens ?? 0,
					outputTokens: tokens?.completionTokens ?? 0,
				});
			} catch {}
		});
	}

	async settings() {
		const { AiGatewayConfig } = await import('./ai-gateway.config');
		const config = Container.get(AiGatewayConfig);

		return {
			enabled: config.enabled,
			defaultCategory: config.defaultCategory,
		};
	}

	@OnShutdown()
	async shutdown() {}
}
