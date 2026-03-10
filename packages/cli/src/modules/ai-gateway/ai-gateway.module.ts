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
