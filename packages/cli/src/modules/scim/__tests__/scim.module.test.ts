import type { FrontendModuleSettings } from '@n8n/api-types';
import { ModuleMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ScimSettingsService } from '../scim-settings.service';
import { ScimSsoService } from '../scim-sso.service';
import { ScimTokenService } from '../scim-token.service';
import { ScimConfig } from '../scim.config';
import { ScimModule } from '../scim.module';

// The controllers resolve database services when they load.
vi.mock('../scim.controller', () => ({}));
vi.mock('../scim-discovery.controller', () => ({}));
vi.mock('../scim-token.controller', () => ({}));

// Compile-time pin: the frontend reads these settings under this exact key.
const MODULE_NAME = 'scim' satisfies keyof FrontendModuleSettings;

describe('ScimModule', () => {
	const scimSettingsService = mock<ScimSettingsService>();
	const scimTokenService = mock<ScimTokenService>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(ScimSettingsService, scimSettingsService);
		Container.set(ScimTokenService, scimTokenService);
	});

	// The opt-in cannot activate the module without the license.
	it('is gated by feat:scim', () => {
		expect(Container.get(ModuleMetadata).get(MODULE_NAME)?.licenseFlag).toBe('feat:scim');
	});

	describe('init()', () => {
		// A license or an env change can turn single sign-on off while the
		// instance is down.
		it('checks single sign-on at startup and listens for it turning off', async () => {
			const scimSsoService = mock<ScimSsoService>();
			Container.set(ScimSsoService, scimSsoService);

			await new ScimModule().init();

			expect(scimSsoService.init).toHaveBeenCalledTimes(1);
		});
	});

	describe('settings()', () => {
		it.each([true, false])('exposes available=%s from the config switch', async (optIn) => {
			Container.get(ScimConfig).optIn = optIn;
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.hasToken.mockResolvedValue(true);

			await expect(new ScimModule().settings()).resolves.toEqual({
				scimEnabled: true,
				hasToken: true,
				available: optIn,
			});
		});

		it.each([true, false])('exposes hasToken=%s', async (hasToken) => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.hasToken.mockResolvedValue(hasToken);

			await expect(new ScimModule().settings()).resolves.toMatchObject({
				scimEnabled: true,
				hasToken,
			});
		});
	});
});
