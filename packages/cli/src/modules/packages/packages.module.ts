import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'packages',
	licenseFlag: LICENSE_FEATURES.PACKAGES,
})
export class PackagesModule implements ModuleInterface {
	async init() {
		await import('./packages.controller');
	}
}
