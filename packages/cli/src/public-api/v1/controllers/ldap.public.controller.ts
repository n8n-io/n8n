import { LdapConfigurationPublicDto, UpdateLdapConfigurationPublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES, type LdapConfig } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	Licensed,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import type { Response } from 'express';
import { CREDENTIAL_BLANKING_VALUE } from 'n8n-workflow';

import { LdapService } from '@/modules/ldap.ee/ldap.service.ee';

const tags = ['SettingsLdap'];

const toPublicLdapConfiguration = (config: LdapConfig): LdapConfigurationPublicDto => ({
	...config,
	bindingAdminPassword: config.bindingAdminPassword ? CREDENTIAL_BLANKING_VALUE : '',
});

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
		return toPublicLdapConfiguration(config);
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
		return toPublicLdapConfiguration(config);
	}
}
