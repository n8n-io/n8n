import type { FrontendModuleSettings } from '@n8n/api-types';
import type { LicenseState, ModulesConfig } from '@n8n/backend-common';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { SystemTaskMetadata } from '@n8n/decorators';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ScimOptInService } from '../scim-opt-in.service';
import { ScimSettingsService } from '../scim-settings.service';
import { ScimModule } from '../scim.module';
import { ScimConfig } from '../scim.config';

// Compile-time pin: the frontend reads these settings under this exact key.
const MODULE_NAME = 'scim' satisfies keyof FrontendModuleSettings;

describe('ScimModule', () => {
	const scimSettingsService = mock<ScimSettingsService>();
	const scimOptInService = mock<ScimOptInService>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(ScimSettingsService, scimSettingsService);
		Container.set(ScimOptInService, scimOptInService);
	});

	describe('settings()', () => {
		it.each([
			[{ available: true, source: 'config' }],
			[{ available: true, source: 'flag' }],
			[{ available: false, source: null }],
		] as const)('exposes the instance opt-in %j', async (optIn) => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimOptInService.evaluate.mockResolvedValue(optIn);

			await expect(new ScimModule().settings()).resolves.toEqual({
				scimEnabled: true,
				available: optIn.available,
				optInSource: optIn.source,
			});
		});
	});

	it('stays inactive without feat:scim, even with the opt-in on', async () => {
		const scimConfig = new ScimConfig();
		scimConfig.optIn = true;
		Container.set(ScimConfig, scimConfig);
		Container.set(Logger, mockLogger());
		const init = vi.spyOn(ScimModule.prototype, 'init');
		const licenseState = mock<LicenseState>();
		licenseState.isLicensed.mockReturnValue(false);
		const registry = new ModuleRegistry(
			Container.get(ModuleMetadata),
			licenseState,
			mockLogger(),
			mock<ModulesConfig>(),
			mock<SystemTaskMetadata>(),
		);

		await registry.initModules('main', [MODULE_NAME]);

		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.licenseFlag).toBe('feat:scim');
		expect(licenseState.isLicensed).toHaveBeenCalledWith('feat:scim');
		expect(init).not.toHaveBeenCalled();
		expect(registry.isActive(MODULE_NAME)).toBe(false);
		expect(registry.settings.has(MODULE_NAME)).toBe(false);
	});
});
