import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

@BackendModule({ name: 'sso-saml', licenseFlag: 'feat:saml', instanceTypes: ['main'] })
export class SamlModule implements ModuleInterface {
	async init() {
		await import('./saml.controller.ee');

		const { SamlService } = await import('./saml.service.ee');
		await Container.get(SamlService).init();
	}
}
