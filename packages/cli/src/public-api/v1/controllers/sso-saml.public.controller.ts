import { SamlConfigurationPublicDto, UpdateSamlConfigurationPublicDto } from '@n8n/api-types';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
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

import { ConflictError } from '@n8n/errors';
import { SamlService } from '@/modules/sso-saml/saml.service.ee';

import { toSamlConfigurationResponse, toSamlPreferencesUpdate } from './sso-saml.mapper';

const tags = ['SettingsSsoSaml'];

@PublicApiController('/settings/sso/saml')
export class SamlSsoPublicController {
	constructor(
		private readonly samlService: SamlService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
	) {}

	@Get('/')
	@ApiKeyScope('saml:manage')
	@Licensed(LICENSE_FEATURES.SAML)
	@ApiSummary('Retrieve the SAML SSO configuration')
	@ApiDescription(
		'Retrieve the current SAML SSO configuration, including every field exposed in the UI plus the service provider entity ID and ACS return URL. Signing private keys, signing certificates, and identity provider metadata are redacted on read. Requires the `saml:manage` scope and the SAML feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SamlConfigurationPublicDto)
	getSamlConfiguration(): SamlConfigurationPublicDto {
		return toSamlConfigurationResponse(this.samlService.samlPreferences);
	}

	@Put('/')
	@ApiKeyScope('saml:manage')
	@Licensed(LICENSE_FEATURES.SAML)
	@ApiSummary('Set the SAML SSO configuration')
	@ApiDescription(
		'Replace the SAML SSO configuration with the provided full object. Every writable field must be sent; use empty strings or empty arrays when a value is unset. Read-only `entityID` / `returnUrl` from GET are ignored if included, so a GET response can be sent back as a PUT body. Redacted secret placeholders keep the stored values unchanged. The update takes effect exactly as it would from the UI, using the same validation. Requires the `saml:manage` scope and the SAML feature to be licensed. When the configuration is managed via environment variables, the write is rejected with 409 and no changes are made.',
	)
	@ApiTags(tags)
	@ApiResponse(200, SamlConfigurationPublicDto)
	@ApiErrorResponse(409)
	async updateSamlConfiguration(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateSamlConfigurationPublicDto,
	): Promise<SamlConfigurationPublicDto> {
		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ConflictError(
				'SSO configuration is managed declaratively and cannot be modified through the API',
			);
		}

		await this.samlService.setSamlPreferences(toSamlPreferencesUpdate(body));

		return toSamlConfigurationResponse(this.samlService.samlPreferences);
	}
}
