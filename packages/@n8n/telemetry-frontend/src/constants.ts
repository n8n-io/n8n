/** Origin the RudderStack browser SDK script is loaded from. */
export const RUDDERSTACK_CDN_ORIGIN = 'https://cdn-rs.n8n.io';

/**
 * Context option passed on every RudderStack call so the SDK does not capture
 * the user's real IP address. Pass it as the `options` argument of `track`,
 * `identify`, `page`, etc.
 */
export const ANONYMOUS_IP_CONTEXT = { context: { ip: '0.0.0.0' } } as const;
