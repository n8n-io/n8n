import { OidcConfigurationPublicDto, UpdateOidcConfigurationPublicDto } from '@n8n/api-types';
import { EventService } from '@n8n/backend-services';
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
import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '@/modules/sso-oidc/constants';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';
import { getChangedFields } from '@/utils/changed-fields';

const tags = ['SettingsSsoOidc'];

type OidcRuntimeConfig = Awaited<ReturnType<OidcService['loadConfig']>>;

const toOidcConfigurationPublicDto = (config: OidcRuntimeConfig): OidcConfigurationPublicDto => ({
	clientId: config.clientId,
	clientSecret: config.clientSecret ? OIDC_CLIENT_SECRET_REDACTED_VALUE : config.clientSecret,
	discoveryEndpoint: config.discoveryEndpoint.toString(),
	loginEnabled: config.loginEnabled,
	prompt: config.prompt,
	authenticationContextClassReference: config.authenticationContextClassReference,
	additionalScopes: config.additionalScopes,
	emailVerifiedRequired: config.emailVerifiedRequired ?? false,
	rpInitiatedLogoutEnabled: config.rpInitiatedLogoutEnabled,
});

@PublicApiController('/settings/sso/oidc')
export class SsoOidcPublicController {
	constructor(
		private readonly oidcService: OidcService,
		private readonly instanceSettingsLoaderConfig: InstanceSettingsLoaderConfig,
		private readonly eventService: EventService,
	) {}

	@Get('/')
	@ApiKeyScope('oidc:manage')
	@Licensed(LICENSE_FEATURES.OIDC)
	@ApiSummary('Retrieve the OIDC SSO configuration')
	@ApiDescription(
		'Retrieve the current OIDC SSO configuration, including every field exposed in the UI. The client secret is redacted on read and is never echoed back in plaintext. Requires the `oidc:manage` scope and the OIDC feature to be licensed.',
	)
	@ApiTags(tags)
	@ApiResponse(200, OidcConfigurationPublicDto)
	async getOidcConfiguration(): Promise<OidcConfigurationPublicDto> {
		const config = await this.oidcService.loadConfig();

		return toOidcConfigurationPublicDto(config);
	}

	@Put('/')
	@ApiKeyScope('oidc:manage')
	@Licensed(LICENSE_FEATURES.OIDC)
	@ApiSummary('Set the OIDC SSO configuration')
	@ApiDescription(
		'Set the OIDC SSO configuration. The update takes effect exactly as it would from the UI, using the same validation. `clientId`, `clientSecret` and `discoveryEndpoint` are required; submit the redacted client secret sentinel to keep the stored secret unchanged. Requires the `oidc:manage` scope and the OIDC feature to be licensed. The client secret is redacted in the response. When the configuration is managed declaratively (via environment variables), the write is rejected with 409 and no changes are made.',
	)
	@ApiTags(tags)
	@ApiResponse(200, OidcConfigurationPublicDto)
	@ApiErrorResponse(409)
	async setOidcConfiguration(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: UpdateOidcConfigurationPublicDto,
	): Promise<OidcConfigurationPublicDto> {
		if (this.instanceSettingsLoaderConfig.ssoManagedByEnv) {
			throw new ConflictError(
				'SSO configuration is managed declaratively and cannot be modified through the API',
			);
		}

		const previous = this.oidcService.getRedactedConfig();
		// `updateConfig` swaps the redaction sentinel for the stored secret in place, so decide first.
		const clientSecretSubmitted = body.clientSecret !== OIDC_CLIENT_SECRET_REDACTED_VALUE;
		await this.oidcService.updateConfig(body);
		const config = await this.oidcService.loadConfig();

		const fieldsChanged = getChangedFields(previous, this.oidcService.getRedactedConfig());
		if (clientSecretSubmitted) fieldsChanged.push('clientSecret');
		this.eventService.emit('sso-settings-updated', {
			user: req.user,
			protocol: 'oidc',
			loginEnabled: config.loginEnabled,
			fieldsChanged,
			publicApi: true,
		});

		return toOidcConfigurationPublicDto(config);
	}
}
