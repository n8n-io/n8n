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
}
