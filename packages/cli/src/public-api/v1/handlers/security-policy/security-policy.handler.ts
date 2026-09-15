import { UpdateSecurityPolicyDto, type SecurityPolicyResponse } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import type { SecurityPolicyReadResult } from '@/services/security-settings.service';
import { SecuritySettingsService } from '@/services/security-settings.service';

import type { SecurityPolicyRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
} from '../../shared/middlewares/global.middleware';

const toResponse = (settings: SecurityPolicyReadResult): SecurityPolicyResponse => settings;

type SecurityPolicyHandlers = {
	getSecurityPolicy: PublicAPIEndpoint<SecurityPolicyRequest.Get>;
	updateSecurityPolicy: PublicAPIEndpoint<SecurityPolicyRequest.Update>;
};

const securityPolicyHandlers: SecurityPolicyHandlers = {
	getSecurityPolicy: [
		isLicensed('feat:personalSpacePolicy'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'securitySettings:manage' }),
		async (_req, res) => {
			const settings = await Container.get(SecuritySettingsService).getSecuritySettings();
			return res.json(toResponse(settings));
		},
	],

	updateSecurityPolicy: [
		isLicensed('feat:personalSpacePolicy'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'securitySettings:manage' }),
		async (req, res) => {
			const payload = UpdateSecurityPolicyDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const { securityPolicyManagedByEnv } = Container.get(InstanceSettingsLoaderConfig);
			if (securityPolicyManagedByEnv) {
				throw new ConflictError(
					'These settings are managed via environment variables and cannot be modified through the API',
				);
			}

			const service = Container.get(SecuritySettingsService);
			await service.updateSecuritySettings(payload.data, req.user);
			const settings = await service.getSecuritySettings();

			return res.json(toResponse(settings));
		},
	],
};

export = securityPolicyHandlers;
