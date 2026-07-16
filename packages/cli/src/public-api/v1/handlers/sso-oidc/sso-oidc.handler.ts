import { OidcConfigDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';

import { toOidcConfigurationResponse } from './sso-oidc.mapper';
import type { SsoOidcRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

type SsoOidcHandlers = {
	getOidcConfiguration: PublicAPIEndpoint<SsoOidcRequest.Get>;
	setOidcConfiguration: PublicAPIEndpoint<SsoOidcRequest.Set>;
};

const ssoOidcHandlers: SsoOidcHandlers = {
	getOidcConfiguration: [
		isLicensed('feat:oidc'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'oidc:manage' }),
		async (_req, res) => {
			const config = await Container.get(OidcService).loadConfig();

			return res.json(toOidcConfigurationResponse(config));
		},
	],

	setOidcConfiguration: [
		isLicensed('feat:oidc'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'oidc:manage' }),
		async (req, res) => {
			const payload = OidcConfigDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const { ssoManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
			if (ssoManagedByEnv) {
				throw new ConflictError(
					'SSO configuration is managed declaratively and cannot be modified through the API',
				);
			}

			const oidcService = Container.get(OidcService);
			await oidcService.updateConfig(payload.data);

			return res.json(oidcService.getRedactedConfig());
		},
	],
};

export = ssoOidcHandlers;
