/**
 * Controls whether an outbound HTTP client is subject to the instance's
 * outbound network policy (SSRF protection).
 *
 * - `'safe'` (default): the client enforces the instance policy. Whether the
 *   guard actually runs is decided inside `OutboundHttp` from
 *   `SsrfProtectionConfig.enabled` — callers never read that flag themselves.
 * - `'unsafe'`: the client bypasses the policy unconditionally. Reserve this
 *   for fixed, n8n-owned or operator-configured destinations, and state the
 *   reason in a comment at the call site.
 */
export type UseDefaultSsrfPolicy = 'safe' | 'unsafe';
