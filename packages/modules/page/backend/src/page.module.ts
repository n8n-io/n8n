import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'page' })
export class PageModule implements ModuleInterface {
	async init() {
		await import('./page.controller.js');
		await import('./page-lookup.controller.js');
	}

	async entities() {
		const { PageEntity } = await import('./page.entity.js');
		const { PageReferenceEntity } = await import('./page-reference.entity.js');

		return [PageEntity, PageReferenceEntity];
	}
}
