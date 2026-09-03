import { SsoRedirectToggleDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, GlobalScope, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { setRedirectUsersFromLoginToSsoFlow } from './sso-helpers';

@RestController('/sso')
export class SsoController {
	constructor(private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig) {}

	/**
	 * Enable or disable auto-redirecting the login page to the SSO provider.
	 */
	@Post('/settings/login-redirect')
	@GlobalScope('sso:manage')
	async setLoginRedirect(
		_req: AuthenticatedRequest,
		res: Response,
		@Body { redirectLoginToSso }: SsoRedirectToggleDto,
	) {
		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ForbiddenError(
				'SSO configuration is managed via environment variables and cannot be modified through the API',
			);
		}
		await setRedirectUsersFromLoginToSsoFlow(redirectLoginToSso);
		return res.sendStatus(200);
	}
}
