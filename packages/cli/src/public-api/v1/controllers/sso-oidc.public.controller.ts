import { OidcConfigurationPublicDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import {
	ApiDescription,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Get,
	Licensed,
	PublicApiController,
} from '@n8n/decorators';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '@/modules/sso-oidc/constants';
import { OidcService } from '@/modules/sso-oidc/oidc.service.ee';

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
	constructor(private readonly oidcService: OidcService) {}

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
}
