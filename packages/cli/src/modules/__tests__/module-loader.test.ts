import { mock } from 'jest-mock-extended';

import { ModuleLoadingMismatchError } from '../errors/module-loading-mismatch.error';
import { ModuleLoader } from '../module-loader';
import type { ModulesConfig } from '../modules.config';

describe('ModuleLoader', () => {
	it('should consider eligible a module that is enabled by default and not disabled by config', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: [], disabled: [] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = ['insights'];
		// @ts-expect-error Private property
		moduleLoader.cannotBeDisabled = [];

		expect(moduleLoader.getEligible()).toEqual(['insights']);
	});

	it('should consider ineligible a module that is disabled by default and by config', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: [], disabled: [] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = [];
		// @ts-expect-error Private property
		moduleLoader.cannotBeDisabled = [];

		expect(moduleLoader.getEligible()).toHaveLength(0);
	});

	it('should throw if a module is both enabled and disabled by config', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: ['insights'], disabled: ['insights'] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = [];
		// @ts-expect-error Private property
		moduleLoader.cannotBeDisabled = [];

		expect(() => moduleLoader.getEligible()).toThrowError(ModuleLoadingMismatchError);
	});

	it('should consider eligible a module enabled by config', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: ['insights'], disabled: [] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = [];
		// @ts-expect-error Private property
		moduleLoader.cannotBeDisabled = [];

		expect(moduleLoader.getEligible()).toEqual(['insights']);
	});

	it('should consider ineligible a module that is enabled by default but disabled by config', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: [], disabled: ['insights'] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = ['insights'];

		expect(moduleLoader.getEligible()).toHaveLength(0);
	});

	it('should not allow disabling modules that cannot be disabled', () => {
		const modulesConfig = mock<ModulesConfig>({ enabled: [], disabled: ['insights'] });
		const moduleLoader = new ModuleLoader(mock(), modulesConfig, mock(), mock(), mock());
		// @ts-expect-error Private property
		moduleLoader.enabledByDefault = ['insights'];
		// @ts-expect-error Private property
		moduleLoader.cannotBeDisabled = ['insights'];

		expect(moduleLoader.getEligible()).toEqual(['insights']);
	});
});
