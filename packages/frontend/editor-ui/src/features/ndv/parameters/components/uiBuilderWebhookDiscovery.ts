import type { WebhookHttpMethod } from '@n8n/ui-builder';

import { API_ROUTER_NODE_TYPE, WEBHOOK_NODE_TYPE } from '@/app/constants/nodeTypes';

/**
 * The bits of an `INode` this file needs, kept loose rather than importing
 * `INode` itself: the callers already have real nodes, but the fixtures in
 * this file's tests are plainer, and nothing here needs the rest of the shape.
 */
export interface WebhookDiscoveryNode {
	type: string;
	name?: string;
	webhookId?: string;
	parameters?: Record<string, unknown>;
}

/** One trigger endpoint found on a node, ready to become a `WebhookPath`. */
export interface DiscoveredEndpoint {
	path: string;
	method: WebhookHttpMethod;
	label: string;
}

const KNOWN_METHODS: WebhookHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];

function asMethod(value: unknown): WebhookHttpMethod {
	const upper = typeof value === 'string' ? value.toUpperCase() : '';
	return (KNOWN_METHODS as string[]).includes(upper) ? (upper as WebhookHttpMethod) : 'GET';
}

function trimSlashes(value: string): string {
	return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Mirrors `configuredRoutes`' own `join` in `nodes-base/nodes/ApiRouter/description.ts`:
 * both segments trimmed of leading/trailing slashes, then joined with a single
 * one, dropping whichever segment is empty.
 */
function joinPath(base: string, suffix: string): string {
	return [trimSlashes(base), trimSlashes(suffix)].filter((part) => part.length > 0).join('/');
}

/**
 * The method a Webhook node answers on. Matches the node's own default: an
 * unset `httpMethod` means GET. "Multiple methods" mode has no one method to
 * report, and a step needs exactly one, so it falls back to POST.
 */
export function webhookMethodOf(node: WebhookDiscoveryNode): WebhookHttpMethod {
	if (node.parameters?.multipleMethods) return 'POST';
	const method = node.parameters?.httpMethod;
	return method === undefined || method === 'GET' ? 'GET' : 'POST';
}

interface ApiRouterEndpointLike {
	method?: unknown;
	path?: unknown;
	options?: { name?: unknown };
}

/**
 * The endpoints an API Router node serves, each becoming its own target: one
 * node here is many routes, not one, so it cannot collapse to a single
 * `WebhookPath` the way a Webhook node's does.
 *
 * The path each endpoint answers on is `basePath` joined with the endpoint's
 * own `path`, exactly as `configuredRoutes` builds it for the real webhook
 * registration — see `nodes-base/nodes/ApiRouter/description.ts`. An empty
 * `basePath` falls back to the node's `webhookId`, matching
 * `parameters.basePath || parameters.__webhookId` there.
 */
export function apiRouterEndpointsOf(node: WebhookDiscoveryNode): DiscoveredEndpoint[] {
	const basePath = String(node.parameters?.basePath ?? '') || node.webhookId || '';
	const endpoints =
		(node.parameters?.endpoints as { endpoint?: ApiRouterEndpointLike[] } | undefined)?.endpoint ??
		[];

	return endpoints
		.map((endpoint): DiscoveredEndpoint => {
			const method = asMethod(endpoint.method);
			const rawPath = typeof endpoint.path === 'string' ? endpoint.path : '';
			const path = joinPath(basePath, rawPath);

			// Same fallback as the node's own `endpointLabel` in `ApiRouter/router.ts`:
			// a name the author gave the endpoint, or its method and path.
			const endpointName =
				typeof endpoint.options?.name === 'string' ? endpoint.options.name.trim() : '';
			const suffix = endpointName || `${method} ${rawPath}`.trim();

			return {
				path,
				method,
				label: node.name ? `${node.name} — ${suffix}` : suffix,
			};
		})
		.filter((entry) => entry.path.length > 0);
}

/** Every trigger endpoint (plain Webhook, or one per API Router endpoint) found among the given nodes. */
export function webhookPathsOf(nodes: WebhookDiscoveryNode[]): DiscoveredEndpoint[] {
	const webhookPaths = nodes
		.filter((node) => node.type === WEBHOOK_NODE_TYPE)
		.map((node): DiscoveredEndpoint => {
			const path = trimSlashes(String(node.parameters?.path ?? ''));
			return { path, method: webhookMethodOf(node), label: path };
		})
		.filter((entry) => entry.path.length > 0);

	const apiRouterPaths = nodes
		.filter((node) => node.type === API_ROUTER_NODE_TYPE)
		.flatMap((node) => apiRouterEndpointsOf(node));

	return [...webhookPaths, ...apiRouterPaths];
}

/** One GET-reachable endpoint on a node upstream of the page, a candidate for the "open live" button. */
export interface LiveWebhookCandidate<TNode extends WebhookDiscoveryNode = WebhookDiscoveryNode> {
	node: TNode;
	path: string;
}

/**
 * Every GET-compatible trigger endpoint among the given (upstream) nodes: a
 * plain Webhook node contributes at most one, an API Router contributes one
 * per GET endpoint it serves. A browser tab can only ever do GET, so anything
 * else is not a candidate at all.
 *
 * Generic over the node type so a caller passing real `INode`s gets them back
 * on each candidate, rather than the loose `WebhookDiscoveryNode` this file
 * needs internally.
 */
export function liveWebhookCandidatesOf<TNode extends WebhookDiscoveryNode>(
	nodes: TNode[],
): Array<LiveWebhookCandidate<TNode>> {
	const candidates: Array<LiveWebhookCandidate<TNode>> = [];

	for (const node of nodes) {
		if (node.type === WEBHOOK_NODE_TYPE) {
			if (webhookMethodOf(node) === 'GET') {
				const path = trimSlashes(String(node.parameters?.path ?? ''));
				candidates.push({ node, path });
			}
		} else if (node.type === API_ROUTER_NODE_TYPE) {
			for (const endpoint of apiRouterEndpointsOf(node)) {
				if (endpoint.method === 'GET') candidates.push({ node, path: endpoint.path });
			}
		}
	}

	return candidates;
}
