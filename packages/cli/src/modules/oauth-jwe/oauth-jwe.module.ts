import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'oauth-jwe', instanceTypes: ['main'] })
export class OAuthJweModule implements ModuleInterface {
	async init() {
		const { OAuthJweKeyService } = await import('./oauth-jwe-key.service');
		await Container.get(OAuthJweKeyService).initialize();
	}
}
