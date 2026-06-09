import { Config, Env } from '@n8n/config';
import { z } from 'zod';

const clientSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	// Redirect URIs are matched exactly by the OAuth SDK (no dynamic loopback ports), so a native
	// app must register its precise URI here (e.g. a custom scheme like `n8n://callback`).
	redirectUris: z.array(z.string().url()).min(1),
	grantTypes: z
		.array(z.enum(['authorization_code', 'refresh_token']))
		.default(['authorization_code', 'refresh_token']),
	tokenEndpointAuthMethod: z
		.enum(['none', 'client_secret_post', 'client_secret_basic'])
		.default('none'),
	clientSecret: z.string().nullable().default(null),
});

export type McpOAuthSeedClient = z.infer<typeof clientSchema>;

// The env var is a JSON string: parse it, then validate the parsed value as an array of clients.
const clientsSchema = z
	.string()
	.transform((value, ctx) => {
		try {
			return JSON.parse(value) as unknown;
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be valid JSON' });
			return z.NEVER;
		}
	})
	.pipe(z.array(clientSchema));

@Config
export class McpOAuthConfig {
	/**
	 * OAuth clients pre-registered (seeded) into the `oauth_clients` table on startup, so a
	 * published app can ship a stable `client_id` instead of relying on dynamic client
	 * registration. JSON array; see `McpOAuthSeedClient`. Defaults to the first-party `n8n-app`
	 * public client.
	 */
	@Env('N8N_MCP_OAUTH_CLIENTS', clientsSchema)
	clients: McpOAuthSeedClient[] = [
		{
			id: 'n8n-app',
			name: 'n8n App',
			redirectUris: ['n8n://callback'],
			grantTypes: ['authorization_code', 'refresh_token'],
			tokenEndpointAuthMethod: 'none',
			clientSecret: null,
		},
	];
}
