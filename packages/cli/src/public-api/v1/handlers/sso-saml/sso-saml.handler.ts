import { Container } from '@n8n/di';

import { SamlService } from '@/modules/sso-saml/saml.service.ee';

import type { SsoSamlRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';
import { toSamlConfigurationResponse } from './sso-saml.mapper';

type SsoSamlHandlers = {
	getSamlConfiguration: PublicAPIEndpoint<SsoSamlRequest.Get>;
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
};

export = ssoSamlHandlers;
