import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

/** Documentation pages for published workflows and agents. */
@BackendModule({ name: 'doc-pages', instanceTypes: ['main'] })
export class DocPagesModule implements ModuleInterface {
	async init() {
		await import('./doc-page.controller.js');

		const { DocPageListener } = await import('./doc-page.listener.js');
		Container.get(DocPageListener).init();
	}

	async entities() {
		const { DocPageEntity } = await import('./doc-page.entity.js');
		return [DocPageEntity];
	}
}
