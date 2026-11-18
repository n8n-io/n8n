import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';

@BackendModule({ name: 'ui-extensions' })
export class UiExtensionsModule implements ModuleInterface {
	async init() {
		// Imported here, not at the top: every imported `@RestController` is served,
		// so a disabled module must not import it.
		await import('./ui-extension-views.controller.js');
	}
}
