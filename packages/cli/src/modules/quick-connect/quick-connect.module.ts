import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'quick-connect' })
export class QuickConnectModule implements ModuleInterface {
	async init() {
		await this.registerHandlers();
		await import('./quick-connect.controller');
	}

	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ options: [{ packageName: string, credentialType: string, text: string, quickConnectType: string, serviceName: string, consentText?: string }]}`.
	 * Note: backendFlowConfig is intentionally excluded from the response to keep it server-side only.
	 */
	async settings() {
		const { QuickConnectConfig } = await import('./quick-connect.config');
		const { options } = Container.get(QuickConnectConfig);
		// Strip backendFlowConfig before sending options to frontend
		return {
			options: options.map(({ backendFlowConfig, ...rest }) => ({
				...rest,
			})),
		};
	}

	private async registerHandlers() {
		const { QuickConnectHandlerRegistry } = await import('./handlers/quick-connect.handler');
		const { FirecrawlHandler } = await import('./handlers/firecrawl.handler');
		const registry = Container.get(QuickConnectHandlerRegistry);
		registry.register(Container.get(FirecrawlHandler));
	}
}
