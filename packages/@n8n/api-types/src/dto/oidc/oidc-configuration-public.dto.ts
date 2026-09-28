import '../../openapi-extend';

import { z } from 'zod';

import { OIDC_PROMPT_VALUES } from './config.dto';
import { oidcConfigurationFieldDocs } from './oidc-configuration-public.openapi';
import { Z } from '../../zod-class';

export const oidcConfigurationPublicSchema = z
	.object({
		clientId: z.string().openapi(oidcConfigurationFieldDocs.clientId),
		clientSecret: z.string().openapi(oidcConfigurationFieldDocs.clientSecret),
		discoveryEndpoint: z.string().openapi(oidcConfigurationFieldDocs.discoveryEndpoint),
		loginEnabled: z.boolean().openapi(oidcConfigurationFieldDocs.loginEnabled),
		prompt: z.enum(OIDC_PROMPT_VALUES).openapi(oidcConfigurationFieldDocs.prompt),
		authenticationContextClassReference: z
			.array(z.string())
			.openapi(oidcConfigurationFieldDocs.authenticationContextClassReference),
		additionalScopes: z.string().openapi(oidcConfigurationFieldDocs.additionalScopes),
		emailVerifiedRequired: z.boolean().openapi(oidcConfigurationFieldDocs.emailVerifiedRequired),
		rpInitiatedLogoutEnabled: z
			.boolean()
			.openapi(oidcConfigurationFieldDocs.rpInitiatedLogoutEnabled),
	})
	.openapi({ additionalProperties: false });

export class OidcConfigurationPublicDto extends Z.class(oidcConfigurationPublicSchema.shape) {
	static schema = oidcConfigurationPublicSchema;
}
