import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({
	name: 'n8n-packages',
})
export class N8nPackagesModule implements ModuleInterface {
	async init() {
		await import('./n8n-packages.controller');
	}
}
