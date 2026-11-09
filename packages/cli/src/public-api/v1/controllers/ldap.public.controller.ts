import {
	LdapConfigurationPublicDto,
	LdapSyncHistoryListPublicDto,
	LdapSyncHistoryPublicDto,
	ListLdapSyncHistoryQueryDto,
	RunLdapSyncPublicDto,
	UpdateLdapConfigurationPublicDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, AuthProviderSyncHistory } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Licensed,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { BadRequestError, ResponseError } from '@n8n/errors';
import { LdapConnectionError, LdapRejectionError } from '@/modules/ldap.ee/ldap.errors';
import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';
import { redactLdapConfig } from '@/modules/ldap.ee/redact-ldap-config';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['SettingsLdap'];

@PublicApiController('/settings/ldap')
export class LdapPublicController {
	constructor(private readonly ldapService: LdapService) {}

	@Get('/')
	@ApiKeyScope('ldap:manage')
	@Licensed(LICENSE_FEATURES.LDAP)
	@ApiSummary('Retrieve the LDAP configuration')
	@ApiDescription(
		'Retrieve the current LDAP configuration, including every field exposed in the UI. The binding admin password is redacted on read. Requires the `ldap:manage` scope and the LDAP feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LdapConfigurationPublicDto)
	async getLdapConfiguration(): Promise<LdapConfigurationPublicDto> {
		const config = await this.ldapService.loadConfig();
		return redactLdapConfig(config);
	}

	@Put('/')
	@ApiKeyScope('ldap:manage')
	@Licensed(LICENSE_FEATURES.LDAP)
	@ApiSummary('Set the LDAP configuration')
	@ApiDescription(
		'Replace the LDAP configuration with the provided full object (partial updates are not supported). For bindingAdminPassword, submit the blanking placeholder from a prior GET to keep the stored password unchanged. Requires the `ldap:manage` scope and the LDAP feature to be licensed. Setting loginEnabled to false is destructive and it deletes all stored LDAP user identities and disables synchronization.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LdapConfigurationPublicDto)
	async updateLdapConfiguration(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateLdapConfigurationPublicDto,
	): Promise<LdapConfigurationPublicDto> {
		await this.ldapService.updateConfig(body);
		const config = await this.ldapService.loadConfig();
		return redactLdapConfig(config);
	}

	@Get('/sync')
	@ApiKeyScope('ldap:sync')
	@Licensed(LICENSE_FEATURES.LDAP)
	@ApiSummary('Retrieve LDAP synchronization history')
	@ApiDescription(
		'Retrieve the history of LDAP synchronizations, most recent first. Requires the `ldap:sync` scope and the LDAP feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LdapSyncHistoryListPublicDto)
	async getLdapSync(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListLdapSyncHistoryQueryDto,
	): Promise<LdapSyncHistoryListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);
		const [rows, count] = await this.ldapService.getSynchronizations(offset, limit);

		return {
			data: rows.map(toLdapSyncHistoryPublic),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/sync')
	@ApiKeyScope('ldap:sync')
	@Licensed(LICENSE_FEATURES.LDAP)
	@ApiSummary('Trigger an LDAP synchronization')
	@ApiDescription(
		'Manually trigger an LDAP synchronization. The response returns the new sync history record. Requires the `ldap:sync` scope and the LDAP feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, LdapSyncHistoryPublicDto)
	async runLdapSync(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: RunLdapSyncPublicDto,
	): Promise<LdapSyncHistoryPublicDto> {
		const syncHistory = await this.runSync(body.type);
		return toLdapSyncHistoryPublic(syncHistory);
	}

	private async runSync(type: 'live' | 'dry'): Promise<AuthProviderSyncHistory> {
		try {
			return await this.ldapService.runSync(type);
		} catch (error) {
			if (error instanceof ResponseError) {
				throw error;
			}
			if (error instanceof LdapRejectionError || error instanceof LdapConnectionError) {
				throw new BadRequestError(error.message);
			}
			throw error;
		}
	}
}

function toLdapSyncHistoryPublic(row: AuthProviderSyncHistory): LdapSyncHistoryPublicDto {
	return {
		id: row.id,
		runMode: row.runMode,
		status: row.status,
		startedAt: row.startedAt.toISOString(),
		endedAt: row.endedAt.toISOString(),
		scanned: row.scanned,
		created: row.created,
		updated: row.updated,
		disabled: row.disabled,
		error: row.error,
	};
}
