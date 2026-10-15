/**
 * Egress entry point (`@n8n/backend-network/egress`).
 *
 * DI-free like `./transport`, but unlike it this subpath depends on
 * `n8n-workflow` (types) and `@n8n/utils`: it exposes the passthrough filter
 * singleton so DI-less consumers can detect "no egress policy configured" by
 * object identity.
 */
export { passthroughEgressFilter } from './ssrf/passthrough-egress-filter';
