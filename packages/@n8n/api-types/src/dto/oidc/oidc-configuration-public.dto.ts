import '../../openapi-extend';

import { z } from 'zod';

import { OIDC_PROMPT_VALUES } from './config.dto';
import {
	oidcConfigurationFieldDocs,
	oidcConfigurationUpdateFieldDocs,
} from './oidc-configuration-public.openapi';
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

const updateOidcConfigurationSchema = z
	.object({
		clientId: z.string().min(1).openapi(oidcConfigurationFieldDocs.clientId),
		clientSecret: z.string().min(1).openapi(oidcConfigurationUpdateFieldDocs.clientSecret),
		discoveryEndpoint: z.string().url().openapi(oidcConfigurationFieldDocs.discoveryEndpoint),
		loginEnabled: z.boolean().openapi(oidcConfigurationFieldDocs.loginEnabled),
		prompt: z.enum(OIDC_PROMPT_VALUES).openapi(oidcConfigurationUpdateFieldDocs.prompt),
		authenticationContextClassReference: z
			.array(z.string())
			.openapi(oidcConfigurationUpdateFieldDocs.authenticationContextClassReference),
		additionalScopes: z.string().openapi(oidcConfigurationUpdateFieldDocs.additionalScopes),
		emailVerifiedRequired: z.boolean().openapi(oidcConfigurationFieldDocs.emailVerifiedRequired),
		rpInitiatedLogoutEnabled: z
			.boolean()
			.openapi(oidcConfigurationFieldDocs.rpInitiatedLogoutEnabled),
	})
	.strict()
	.openapi({
		description:
			'Full OIDC SSO configuration to set. This is a full replacement: every writable field must be provided. Partial updates are rejected. Submit the redacted secret sentinel for `clientSecret` to keep the stored secret unchanged.',
	});

export class UpdateOidcConfigurationPublicDto extends Z.class(updateOidcConfigurationSchema.shape, {
	strict: true,
}) {
	static schema = updateOidcConfigurationSchema;
}
