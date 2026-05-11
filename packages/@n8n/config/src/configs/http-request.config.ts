import { Config, Env } from '../decorators';

@Config
export class HttpRequestConfig {
	/**
	 * Whether n8n-initiated outbound HTTP requests send an RFC-style
	 * User-Agent (e.g. `Mozilla/5.0 (compatible; n8n/<version>; +https://n8n.io/)`)
	 * that passes strict WAF validation.
	 *
	 * When `false` (current default), the legacy bare `n8n` User-Agent is sent,
	 * preserving backwards compatibility for downstream systems that match on it.
	 *
	 * Planned to default to `true` in the next major version.
	 *
	 * @see https://github.com/n8n-io/n8n/issues/28280
	 */
	@Env('N8N_ENFORCE_GLOBAL_USER_AGENT')
	enforceGlobalUserAgent: boolean = false;

	/**
	 * Overrides the default User-Agent used for n8n-initiated outbound HTTP
	 * requests when `N8N_ENFORCE_GLOBAL_USER_AGENT` is `true`. Empty string
	 * means "use the RFC-style default including version".
	 *
	 * Useful for compliance scenarios where the n8n version should not be
	 * disclosed to upstream servers.
	 */
	@Env('N8N_GLOBAL_USER_AGENT_VALUE')
	globalUserAgentValue: string = '';
}
