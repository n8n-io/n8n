import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

/**
 * Instance branding: an accent color that admins set for every user.
 * The editor reads it from the frontend settings, so the sign-in page has it too.
 */
@BackendModule({ name: 'branding', instanceTypes: ['main'] })
export class BrandingModule implements ModuleInterface {
	async init() {
		await import('./branding.controller.js');
	}
}
