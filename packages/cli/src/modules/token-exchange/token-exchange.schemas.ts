import { z } from 'zod';

/** RFC 8693 grant type URN for token exchange */
export const TOKEN_EXCHANGE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange' as const;

/**
 * Validates an RFC 8693 token exchange request form body.
 * grant_type must be the token-exchange URN; subject_token is required.
 */
export const TokenExchangeRequestSchema = z.object({
	grant_type: z.literal(TOKEN_EXCHANGE_GRANT_TYPE),
	subject_token: z.string().min(1),
	subject_token_type: z.string().optional(),
	actor_token: z.string().optional(),
	actor_token_type: z.string().optional(),
	requested_token_type: z.string().optional(),
	scope: z.string().max(1024).optional(),
	audience: z.string().max(1024).optional(),
	resource: z.string().max(2048).optional(),
});

export type TokenExchangeRequest = z.infer<typeof TokenExchangeRequestSchema>;
