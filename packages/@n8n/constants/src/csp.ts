/**
 * Placeholder that the frontend build bakes into the tags of the built HTML (via Vite's
 * `html.cspNonce`), for the backend to replace with the request's nonce when it serves
 * the page. Shared so the two sides cannot drift apart.
 */
export const HTML_NONCE_PLACEHOLDER = '{{CSP_NONCE}}';

/**
 * Token that users write in a policy where n8n should substitute the per-request nonce,
 * e.g. `N8N_CONTENT_SECURITY_POLICY="script-src <nonce>"`. Shared so the default policy
 * in `@n8n/config` and the substitution in `packages/cli` cannot drift apart.
 */
export const NONCE_PLACEHOLDER = '<nonce>';

/**
 * Name of the `window` property that holds the public frontend settings, which the
 * backend embeds in the editor page. Shared so the backend and the editor cannot
 * drift apart.
 */
export const EMBEDDED_SETTINGS_GLOBAL = '__n8nSettings';
