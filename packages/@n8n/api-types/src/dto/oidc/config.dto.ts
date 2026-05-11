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
}) {}
