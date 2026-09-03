import { SsoRedirectToggleDto } from '@n8n/api-types';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { setRedirectUsersFromLoginToSsoFlow } from '../sso-helpers';
import { SsoController } from '../sso.controller';

vi.mock('../sso-helpers', async (importOriginal) => ({
	...(await importOriginal<typeof import('../sso-helpers')>()),
	setRedirectUsersFromLoginToSsoFlow: vi.fn(),
}));

describe('SsoController', () => {
	const setRedirectSpy = vi.mocked(setRedirectUsersFromLoginToSsoFlow);

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('setLoginRedirect', () => {
		it('persists the toggle and returns 200 when SSO is not managed by env', async () => {
			const controller = new SsoController(
				mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: false }),
			);
			const res = mock<Response>();
			const payload = new SsoRedirectToggleDto({ redirectLoginToSso: false });

			await controller.setLoginRedirect(mock<AuthenticatedRequest>(), res, payload);

			expect(setRedirectSpy).toHaveBeenCalledWith(false);
			expect(res.sendStatus).toHaveBeenCalledWith(200);
		});

		it('rejects the change when SSO is managed by env', async () => {
			const controller = new SsoController(
				mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: true }),
			);
			const res = mock<Response>();
			const payload = new SsoRedirectToggleDto({ redirectLoginToSso: true });

			await expect(
				controller.setLoginRedirect(mock<AuthenticatedRequest>(), res, payload),
			).rejects.toThrow(ForbiddenError);
			expect(setRedirectSpy).not.toHaveBeenCalled();
		});
	});
});
