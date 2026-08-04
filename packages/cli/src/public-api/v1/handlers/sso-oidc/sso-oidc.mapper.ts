import type { OidcConfigDto } from '@n8n/api-types';

import { OIDC_CLIENT_SECRET_REDACTED_VALUE } from '@/modules/sso-oidc/constants';
import type { OidcService } from '@/modules/sso-oidc/oidc.service.ee';

type OidcRuntimeConfig = Awaited<ReturnType<OidcService['loadConfig']>>;

export function toOidcConfigurationResponse(config: OidcRuntimeConfig): OidcConfigDto {
	return {
		...config,
		discoveryEndpoint: config.discoveryEndpoint.toString(),
		clientSecret: config.clientSecret ? OIDC_CLIENT_SECRET_REDACTED_VALUE : config.clientSecret,
	};
}
