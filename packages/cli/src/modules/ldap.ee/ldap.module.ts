import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'ldap', licenseFlag: 'feat:ldap', instanceTypes: ['main'] })
export class LdapModule implements ModuleInterface {
	async init() {
		await import('./ldap.controller.ee');

		// Import LdapService to trigger @PasswordAuthHandler() decorator registration
		await import('./ldap.service.ee');
	}
}
