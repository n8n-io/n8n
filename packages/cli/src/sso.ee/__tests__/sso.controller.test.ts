import { SsoRedirectToggleDto } from '@n8n/api-types';
import type { LicenseState } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import type { AuthenticatedRequest } from '@n8n/db';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import type { SsoSettingsService } from '../sso-settings.service';
import { SsoController } from '../sso.controller';

describe('SsoController', () => {
	const createController = (opts: {
		ssoManagedByEnv?: boolean;
		samlLicensed?: boolean;
		oidcLicensed?: boolean;
	}) => {
		const ssoSettingsService = mock<SsoSettingsService>();
		const controller = new SsoController(
			mock<InstanceSettingsLoaderConfig>({ ssoManagedByEnv: opts.ssoManagedByEnv ?? false }),
			mock<LicenseState>({
				isSamlLicensed: () => opts.samlLicensed ?? true,
				isOidcLicensed: () => opts.oidcLicensed ?? false,
			}),
			ssoSettingsService,
		);
		return { controller, ssoSettingsService };
	};

	describe('setLoginRedirect', () => {
		it('persists the toggle and returns 200 when SAML is licensed and not env-managed', async () => {
			const { controller, ssoSettingsService } = createController({ samlLicensed: true });
			const res = mock<Response>();

			await controller.setLoginRedirect(
				mock<AuthenticatedRequest>(),
				res,
				new SsoRedirectToggleDto({ redirectLoginToSso: false }),
			);

			expect(ssoSettingsService.setRedirectLoginToSso).toHaveBeenCalledWith(false);
			expect(res.sendStatus).toHaveBeenCalledWith(200);
		});

		it('rejects the change on an unlicensed instance', async () => {
			const { controller, ssoSettingsService } = createController({
				samlLicensed: false,
				oidcLicensed: false,
			});

			await expect(
				controller.setLoginRedirect(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					new SsoRedirectToggleDto({ redirectLoginToSso: true }),
				),
			).rejects.toThrow(ForbiddenError);
			expect(ssoSettingsService.setRedirectLoginToSso).not.toHaveBeenCalled();
		});

		it('rejects the change when SSO is managed by env', async () => {
			const { controller, ssoSettingsService } = createController({
				samlLicensed: true,
				ssoManagedByEnv: true,
			});

			await expect(
				controller.setLoginRedirect(
					mock<AuthenticatedRequest>(),
					mock<Response>(),
					new SsoRedirectToggleDto({ redirectLoginToSso: true }),
				),
			).rejects.toThrow(ForbiddenError);
			expect(ssoSettingsService.setRedirectLoginToSso).not.toHaveBeenCalled();
		});
	});
});
