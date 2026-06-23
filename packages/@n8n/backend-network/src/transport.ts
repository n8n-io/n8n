/**
 * Pure transport entry point (`@n8n/backend-network/transport`).
 *
 * Exposes the dispatcher/fetch core of the outbound HTTP transport with no DI,
 * `@n8n/config` or `@n8n/backend-common` dependency: its only runtime imports
 * are `undici` and `n8n-workflow`. This is the construction path for DI-less
 * callers (e.g. task-runner code) that must build a proxy/SSRF-aware transport
 * without dragging the full `OutboundHttp` service — and its backend
 * dependencies — into their bundle.
 *
 * `OutboundHttp` (the `@n8n/di` service) wraps this same core, so there is a
 * single implementer of transport construction across the codebase.
 *
 * The Node `http.Agent` path (`getNodeAgent` / `buildNodeAgents`) is
 * intentionally NOT re-exported here: it is not yet dependency-free.
 */
export {
	buildDispatcher,
	createSsrfInterceptor,
	createAuthorizationInterceptor,
	createDispatcherTransport,
	dispatchedFetch,
} from './http/undici/transport';
export type {
	CustomFetch,
	DispatcherTransport,
	CreateDispatcherTransportOptions,
	RequestAuthorizer,
	TransportTimeoutOptions,
} from './http/undici/transport';
export type { ProxyOption, ProxyUrl, SsrfOption } from './http/node-agents';
export type { SsrfBridge } from './ssrf/ssrf-protection.service';
