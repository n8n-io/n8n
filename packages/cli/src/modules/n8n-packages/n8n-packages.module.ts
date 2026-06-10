import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'n8n-packages',
	licenseFlag: LICENSE_FEATURES.N8N_PACKAGES,
})
export class N8nPackagesModule implements ModuleInterface {
	async init() {
		await import('./n8n-packages.controller');
	}
}
