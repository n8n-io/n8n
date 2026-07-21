import { LdapSyncDto, UpdateLdapConfigurationDto } from '@n8n/api-types';
import { Container } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import {
	getLdapSynchronizations,
	getLdapSynchronizationsWithCount,
} from '@/modules/ldap.ee/helpers.ee';
import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';

import {
	toLdapConfigurationResponse,
	toLdapConfigUpdate,
	toLdapSyncHistoryResponse,
} from './ldap.mapper';
import type { LdapRequest } from '../../../types';
import type { PublicAPIEndpoint } from '../../shared/handler.types';
import {
	apiKeyHasScopeWithGlobalScopeFallback,
	isLicensed,
	validCursor,
} from '../../shared/middlewares/global.middleware';
import { encodeNextCursor } from '../../shared/services/pagination.service';

type LdapHandlers = {
	getLdapConfiguration: PublicAPIEndpoint<LdapRequest.GetConfig>;
	updateLdapConfiguration: PublicAPIEndpoint<LdapRequest.UpdateConfig>;
	getLdapSync: PublicAPIEndpoint<LdapRequest.GetSync>;
	runLdapSync: PublicAPIEndpoint<LdapRequest.RunSync>;
};

const ldapHandlers: LdapHandlers = {
	getLdapConfiguration: [
		isLicensed('feat:ldap'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ldap:manage' }),
		async (_req, res) => {
			const ldapService = Container.get(LdapService);
			const config = await ldapService.loadConfig();

			return res.json(toLdapConfigurationResponse(config));
		},
	],

	updateLdapConfiguration: [
		isLicensed('feat:ldap'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ldap:manage' }),
		async (req, res) => {
			const payload = UpdateLdapConfigurationDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			const ldapService = Container.get(LdapService);
			const current = await ldapService.loadConfig();

			try {
				const updated = toLdapConfigUpdate(payload.data, current);
				await ldapService.updateConfig(updated);
			} catch (e) {
				throw new BadRequestError((e as Error).message);
			}

			const reloaded = await ldapService.loadConfig();
			return res.json(toLdapConfigurationResponse(reloaded));
		},
	],

	getLdapSync: [
		isLicensed('feat:ldap'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ldap:sync' }),
		validCursor,
		async (req, res) => {
			const { offset = 0, limit = 100 } = req.query;

			const [rows, count] = await getLdapSynchronizationsWithCount(offset, limit);

			return res.json({
				data: rows.map(toLdapSyncHistoryResponse),
				nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
			});
		},
	],

	runLdapSync: [
		isLicensed('feat:ldap'),
		apiKeyHasScopeWithGlobalScopeFallback({ scope: 'ldap:sync' }),
		async (req, res) => {
			const payload = LdapSyncDto.safeParse(req.body);
			if (!payload.success) {
				throw new BadRequestError(payload.error.errors[0]?.message ?? 'Invalid request body');
			}

			try {
				await Container.get(LdapService).runSync(payload.data.type);
			} catch (e) {
				throw new BadRequestError((e as Error).message);
			}

			const [latest] = await getLdapSynchronizations(0, 1);
			return res.json(latest ? toLdapSyncHistoryResponse(latest) : { success: true });
		},
	],
};

export = ldapHandlers;
