import { LICENSE_FEATURES } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'import-export',
	licenseFlag: LICENSE_FEATURES.PACKAGE_EXPORT,
})
export class ImportExportModule implements ModuleInterface {
	async init() {
		await import('./import-export.controller');
	}
}
