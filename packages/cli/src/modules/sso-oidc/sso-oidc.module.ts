import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'sso-oidc', licenseFlag: 'feat:oidc' })
export class OidcModule implements ModuleInterface {
	async init() {
		await import('./oidc.controller.ee');

		const { OidcService } = await import('./oidc.service.ee');
		await Container.get(OidcService).init();
	}
}
