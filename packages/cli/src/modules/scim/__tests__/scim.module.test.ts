import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ScimSettingsService } from '../scim-settings.service';
import { ScimSsoService } from '../scim-sso.service';
import { ScimTokenService } from '../scim-token.service';
import { ScimModule } from '../scim.module';

// The controllers resolve database services when they load.
vi.mock('../scim.controller', () => ({}));
vi.mock('../scim-discovery.controller', () => ({}));
vi.mock('../scim-token.controller', () => ({}));

describe('ScimModule', () => {
	const scimSettingsService = mock<ScimSettingsService>();
	const scimTokenService = mock<ScimTokenService>();

	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(ScimSettingsService, scimSettingsService);
		Container.set(ScimTokenService, scimTokenService);
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
		it.each([true, false])('exposes hasToken=%s', async (hasToken) => {
			scimSettingsService.isEnabled.mockResolvedValue(true);
			scimTokenService.getTokenInfo.mockResolvedValue({
				hasToken,
				lastFour: hasToken ? 'ab12' : null,
			});

			await expect(new ScimModule().settings()).resolves.toEqual({
				scimEnabled: true,
				hasToken,
			});
		});
	});
});
