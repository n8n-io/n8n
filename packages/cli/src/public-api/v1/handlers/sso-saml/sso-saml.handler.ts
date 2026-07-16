import { UpdateSamlConfigurationDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';

import { toSamlConfigurationResponse, toSamlPreferencesUpdate } from './sso-saml.mapper';
import type { SsoSamlRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

type SsoSamlHandlers = {
	getSamlConfiguration: PublicAPIEndpoint<SsoSamlRequest.Get>;
	updateSamlConfiguration: PublicAPIEndpoint<SsoSamlRequest.Update>;
};

const ssoSamlHandlers: SsoSamlHandlers = {
	getSamlConfiguration: [
		isLicensed('feat:saml'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'saml:manage' }),
		async (_req, res) => {
			const samlService = Container.get(SamlService);

			return res.json(toSamlConfigurationResponse(samlService.samlPreferences));
		},
	],

	updateSamlConfiguration: [
		isLicensed('feat:saml'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'saml:manage' }),
		async (req, res) => {
			const payload = UpdateSamlConfigurationDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const { ssoManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
			if (ssoManagedByEnv) {
				throw new ConflictError(
					'SSO configuration is managed declaratively and cannot be modified through the API',
				);
			}

			const samlService = Container.get(SamlService);
			await samlService.setSamlPreferences(toSamlPreferencesUpdate(payload.data));

			return res.json(toSamlConfigurationResponse(samlService.samlPreferences));
		},
	],
};

export = ssoSamlHandlers;
