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
import { ScimSsoService } from '../scim-sso.service';
import { ScimTokenService } from '../scim-token.service';
import { ScimModule } from '../scim.module';
import { ScimConfig } from '../scim.config';

// The controllers resolve database services when they load.
vi.mock('../scim.controller', () => ({}));
vi.mock('../scim-discovery.controller', () => ({}));
vi.mock('../scim-token.controller', () => ({}));
vi.mock('../scim-transfer-target.controller', () => ({}));

// Compile-time pin: the frontend reads these settings under this exact key.
const MODULE_NAME = 'scim' satisfies keyof FrontendModuleSettings;

describe('ScimModule', () => {
	const scimSettingsService = mock<ScimSettingsService>();
	const scimOptInService = mock<ScimOptInService>();
	const scimTokenService = mock<ScimTokenService>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(ScimSettingsService, scimSettingsService);
		Container.set(ScimOptInService, scimOptInService);
		Container.set(ScimTokenService, scimTokenService);
	});

	describe('init()', () => {
		// A license or an env change can turn single sign-on off while the
		// instance is down.
		it('checks single sign-on at startup and listens for it turning off', async () => {
			const scimSsoService = mock<ScimSsoService>();
			Container.set(ScimSsoService, scimSsoService);

			await new ScimModule().init();

			expect(scimOptInService.startSettingsRefresh).toHaveBeenCalledTimes(1);
			expect(scimSsoService.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('settings()', () => {
		it.each([
			[{ available: true, source: 'config' }],
			[{ available: true, source: 'flag' }],
			[{ available: false, source: null }],
		] as const)('exposes the instance opt-in %j', async (optIn) => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.hasToken.mockResolvedValue(true);
			scimOptInService.evaluate.mockResolvedValue(optIn);

			await expect(new ScimModule().settings()).resolves.toEqual({
				scimEnabled: true,
				hasToken: true,
				available: optIn.available,
				optInSource: optIn.source,
			});
		});

		it.each([true, false])('exposes hasToken=%s', async (hasToken) => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.hasToken.mockResolvedValue(hasToken);
			scimOptInService.evaluate.mockResolvedValue({ available: true, source: 'config' });

			await expect(new ScimModule().settings()).resolves.toMatchObject({
				scimEnabled: true,
				hasToken,
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
