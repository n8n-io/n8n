import { ControllerRegistryMetadata, ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { UiExtensionsModule } from '../ui-extensions.module';

describe('UiExtensionsModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('ui-extensions')?.class).toBe(UiExtensionsModule);
	});

	it('registers the REST controller only on init', async () => {
		const controllers = () =>
			[...Container.get(ControllerRegistryMetadata).controllerClasses].map((c) => c.name);

		expect(controllers()).not.toContain('UiExtensionViewsController');

		await new UiExtensionsModule().init();

		expect(controllers()).toContain('UiExtensionViewsController');
	});
});
