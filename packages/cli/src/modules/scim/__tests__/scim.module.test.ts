import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { ScimSsoService } from '../scim-sso.service';
import { ScimModule } from '../scim.module';

// The controllers resolve database services when they load.
vi.mock('../scim.controller', () => ({}));
vi.mock('../scim-discovery.controller', () => ({}));
vi.mock('../scim-token.controller', () => ({}));

describe('ScimModule', () => {
	beforeEach(() => {
		vi.clearAllMocks();
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
});
