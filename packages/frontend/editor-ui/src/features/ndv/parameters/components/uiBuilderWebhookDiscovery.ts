import type { HostEndpoint, UiHttpMethod } from '@n8n/ui-builder';

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

const KNOWN_METHODS: readonly UiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Undefined for anything an action could not call with, HEAD included. */
function asMethod(value: unknown): UiHttpMethod | undefined {
	const upper = typeof value === 'string' ? value.toUpperCase() : '';
	return KNOWN_METHODS.find((known) => known === upper);
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
 * A Webhook node's path, once per method it answers on — "multiple methods"
 * mode stores them as a list, and each is its own endpoint because a step
 * naming this path still has to say which of them it means.
 *
 * An unset `httpMethod` means GET, matching the node's own default. A node
 * configured only for methods an action cannot call with contributes nothing.
 */
export function webhookEndpointsOf(node: WebhookDiscoveryNode): HostEndpoint[] {
	const path = trimSlashes(String(node.parameters?.path ?? ''));
	if (!path) return [];

	const configured = node.parameters?.httpMethod;
	if (configured === undefined) return [{ path, method: 'GET' }];

	const methods = (Array.isArray(configured) ? configured : [configured])
		.map(asMethod)
		.filter((method): method is UiHttpMethod => method !== undefined);

	return methods.map((method) => ({ path, method }));
}

interface ApiRouterEndpointLike {
	method?: unknown;
	path?: unknown;
	options?: { name?: unknown };
}

/**
 * The endpoints an API Router node serves, each becoming its own target: one
 * node here is many routes, not one, so it cannot collapse to a single entry
 * the way a Webhook node's path does.
 *
 * The path each endpoint answers on is `basePath` joined with the endpoint's
 * own `path`, exactly as `configuredRoutes` builds it for the real webhook
 * registration — see `nodes-base/nodes/ApiRouter/description.ts`. An empty
 * `basePath` falls back to the node's `webhookId`, matching
 * `parameters.basePath || parameters.__webhookId` there.
 */
export function apiRouterEndpointsOf(node: WebhookDiscoveryNode): HostEndpoint[] {
	const basePath = String(node.parameters?.basePath ?? '') || node.webhookId || '';
	const endpoints =
		(node.parameters?.endpoints as { endpoint?: ApiRouterEndpointLike[] } | undefined)?.endpoint ??
		[];

	return endpoints
		.map((endpoint): HostEndpoint => {
			const name = typeof endpoint.options?.name === 'string' ? endpoint.options.name.trim() : '';
			const rawPath = typeof endpoint.path === 'string' ? endpoint.path : '';

			return {
				path: joinPath(basePath, rawPath),
				method: asMethod(endpoint.method) ?? 'GET',
				name: name || undefined,
			};
		})
		.filter((endpoint) => endpoint.path.length > 0);
}

/** Everything among the given nodes that answers an HTTP request an action could call. */
export function endpointsOf(nodes: WebhookDiscoveryNode[]): HostEndpoint[] {
	return nodes.flatMap((node) => {
		if (node.type === WEBHOOK_NODE_TYPE) return webhookEndpointsOf(node);
		if (node.type === API_ROUTER_NODE_TYPE) return apiRouterEndpointsOf(node);

		return [];
	});
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
	return nodes.flatMap((node) =>
		endpointsOf([node])
			.filter((endpoint) => endpoint.method === 'GET')
			.map((endpoint) => ({ node, path: endpoint.path })),
	);
}
