/**
 * DI-free proxy entry point (`@n8n/backend-network/proxy`).
 *
 * Exposes env-proxy resolution, Node proxy-agent factories, and `NO_PROXY`
 * patching with no DI, `@n8n/config`, `@n8n/backend-common` or `n8n-workflow`
 * dependency. This is the construction path for callers that need proxy
 * resolution or a Node `http(s).Agent` without dragging the full `OutboundHttp`
 * service — and its backend dependencies — into their bundle.
 *
 * The undici dispatcher/`fetch` path lives behind `@n8n/backend-network/transport`;
 * the global proxy-agent install path (which is DI-aware) stays in the main barrel.
 */
export {
	createHttpProxyAgent,
	createHttpsProxyAgent,
	hasProxyEnvironmentVariables,
	resolveProxyUrl,
} from './proxy-resolution';
export { ensureHostsBypassProxy } from './no-proxy-patch';
