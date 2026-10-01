import { ModuleRegistry } from '@n8n/backend-common';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { packagedModules } from '../modules.manifest';

describe('packaged modules manifest', () => {
	it('should load and initialize the hello-world module package', async () => {
		const moduleMetadata = Container.get(ModuleMetadata);
		const moduleRegistry = new ModuleRegistry(moduleMetadata, mock(), mock(), mock(), mock());
		moduleRegistry.registerPackagedModules(packagedModules);

		await moduleRegistry.loadModules(['hello-world']);
		await moduleRegistry.initModules('main', ['hello-world']);

		expect(moduleMetadata.get('hello-world')).toBeDefined();
		expect(moduleRegistry.settings.get('hello-world')).toEqual({ message: 'Hello, world!' });
	});
});
