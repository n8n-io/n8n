import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'quick-connect' })
export class QuickConnectModule implements ModuleInterface {
	/**
	 * Settings exposed to the frontend under `/rest/module-settings`.
	 *
	 * The response shape will be `{ options: [{ packageName: string, credentialType: string, text: string, quickConnectType: string }]}`.
	 */
	async settings() {
		const { QuickConnectConfig } = await import('./quick-connect.config');
		const { options } = Container.get(QuickConnectConfig);
		return { options };
	}
}
