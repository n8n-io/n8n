import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AppsModule } from '../apps.module';

describe('AppsModule', () => {
	it('registers the module entrypoint', () => {
		expect(Container.get(ModuleMetadata).get('apps')?.class).toBe(AppsModule);
	});

	it('requires explicit module enablement', () => {
		const config = Container.get(ModulesConfig);
		config.enabledModules = [];
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('apps');
		config.enabledModules = ['apps'];
		expect(Container.get(ModuleRegistry).eligibleModules).toContain('apps');
		config.enabledModules = [];
	});

	it('registers both entities and starts without Instance AI', async () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const module = new AppsModule();
		expect((await module.entities()).map((entity) => entity.name)).toEqual(['App', 'AppVersion']);
		await module.init();
		expect(logger.warn).toHaveBeenCalledWith('The apps module is experimental.');
		expect(await module.settings()).toEqual({ enabled: true });
		expect(Container.get(ModuleRegistry).isActive('instance-ai')).toBe(false);
	});
});
