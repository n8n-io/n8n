import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { Logger, ModuleRegistry, ModulesConfig } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import { AppsModule } from '../apps.module';

describe('AppsModule', () => {
	const moduleMetadata = Container.get(ModuleMetadata);

	afterEach(() => Container.reset());

	it('registers the module entrypoint', () => {
		expect(moduleMetadata.get('apps')?.class).toBe(AppsModule);
	});

	it('requires explicit module enablement', () => {
		const config = Container.get(ModulesConfig);
		config.enabledModules = [];
		expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('apps');
		config.enabledModules = ['apps'];
		expect(Container.get(ModuleRegistry).eligibleModules).toContain('apps');
	});

	it('exposes app entities and initializes with enabled settings', async () => {
		const logger = mock<Logger>();
		Container.set(Logger, logger);
		const module = new AppsModule();
		expect((await module.entities()).map((entity) => entity.name)).toEqual([
			'App',
			'AppVersion',
			'AppArtifact',
		]);
		await module.init();
		expect(logger.warn).toHaveBeenCalledWith('The apps module is experimental.');
		expect(await module.settings()).toEqual({ enabled: true });
	});
});
