import { SamlToggleDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';

import type { SettingsSsoSamlRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

type SettingsSsoSamlHandlers = {
	toggleSamlLogin: PublicAPIEndpoint<SettingsSsoSamlRequest.Toggle>;
};

const settingsSsoSamlHandlers: SettingsSsoSamlHandlers = {
	toggleSamlLogin: [
		isLicensed('feat:saml'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'saml:manage' }),
		async (req, res) => {
			const payload = SamlToggleDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			if (Container.get(InstanceSettingsLoaderConfig).ssoManagedByEnv) {
				throw new ConflictError(
					'SSO configuration is managed via environment variables and cannot be modified through the API',
				);
			}

			await Container.get(SamlService).setSamlPreferences({
				loginEnabled: payload.data.loginEnabled,
			});

			return res.json({ loginEnabled: payload.data.loginEnabled });
		},
	],
};

export = settingsSsoSamlHandlers;
