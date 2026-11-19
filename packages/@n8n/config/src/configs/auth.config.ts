import { z } from 'zod';

import { Config, Env, Nested } from '../decorators';

const samesiteSchema = z.enum(['strict', 'lax', 'none']);

type Samesite = z.infer<typeof samesiteSchema>;

@Config
class CookieConfig {
	/** Whether to set the `Secure` flag on the n8n authentication cookie (recommended for HTTPS). */
	@Env('N8N_SECURE_COOKIE')
	secure: boolean = true;

	/** Value for the `SameSite` attribute on the n8n authentication cookie (`strict`, `lax`, or `none`). */
	@Env('N8N_SAMESITE_COOKIE', samesiteSchema)
	samesite: Samesite = 'lax';
}

@Config
export class AuthConfig {
	@Nested
	cookie: CookieConfig;

	/**
	 * Bind OAuth credential callbacks to the browser that initiated the flow.
	 * When enabled, a session-scoped `n8n-oauth-binding` cookie is set on flow
	 * initiation and verified on callback. Defeats phishing attacks where an
	 * attacker injects an OAuth authorize URL into a victim's browser to land
	 * tokens on the attacker's credential.
	 */
	@Env('N8N_OAUTH_BROWSER_BINDING')
	oauthBrowserBinding: boolean = false;

	/**
	 * Whether n8n identifies itself to OAuth2 servers with a client ID metadata
	 * document when a credential registers its client automatically. Turn this on
	 * only if the OAuth2 servers can reach this instance over HTTPS. When the server
	 * doesn't support metadata documents, n8n uses dynamic client registration.
	 */
	@Env('N8N_OAUTH_CIMD_ENABLED')
	oauthCimdEnabled: boolean = false;

	/**
	 * HTTPS URL of the client ID metadata document that n8n sends as its client ID.
	 * The document must list the OAuth2 callback URL of this instance. When unset,
	 * n8n uses the document it serves at `/rest/oauth2-credential/client-metadata.json`.
	 */
	@Env('N8N_OAUTH_CLIENT_METADATA_URL')
	oauthClientMetadataUrl: string = '';
}
