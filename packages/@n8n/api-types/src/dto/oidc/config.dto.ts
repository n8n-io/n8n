import { z } from 'zod';

import { Z } from '../../zod-class';

export const OIDC_PROMPT_VALUES = ['none', 'login', 'consent', 'select_account', 'create'] as const;

export class OidcConfigDto extends Z.class({
	clientId: z.string().min(1),
	clientSecret: z.string().min(1),
	discoveryEndpoint: z.string().url(),
	loginEnabled: z.boolean().optional().default(false),
	prompt: z.enum(OIDC_PROMPT_VALUES).optional().default('select_account'),
	authenticationContextClassReference: z.array(z.string()).default([]),
	additionalScopes: z.string().default(''),
}) {}

/**
 * Public API PUT body for the OIDC SSO configuration: the same shape as
 * {@link OidcConfigDto} but with every writable field required (no defaults),
 * so a partial body is rejected instead of silently resetting omitted fields.
 */
export class UpdateOidcConfigurationDto extends OidcConfigDto.extend({
	loginEnabled: z.boolean(),
	prompt: z.enum(OIDC_PROMPT_VALUES),
	authenticationContextClassReference: z.array(z.string()),
	additionalScopes: z.string(),
}) {}
