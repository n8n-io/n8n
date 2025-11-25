import { z } from 'zod/v4';

export const oAuthAuthorizationServerMetadataSchema = z.object({
	authorization_endpoint: z.url({ protocol: /^https?$/ }),
	token_endpoint: z.url({ protocol: /^https?$/ }),
	registration_endpoint: z.url({ protocol: /^https?$/ }),
	grant_types_supported: z.array(z.string()).optional(),
	token_endpoint_auth_methods_supported: z.array(z.string()).optional(),
	code_challenge_methods_supported: z.array(z.string()).optional(),
});

export const dynamicClientRegistrationResponseSchema = z.object({
	client_id: z.string(),
	client_secret: z.string().optional(),
});
