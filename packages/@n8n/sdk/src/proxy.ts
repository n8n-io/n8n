import { randomUUID } from 'node:crypto';

import { buildAuthHeader } from './auth';
import type { CreateClientOptions, ExecutionResult, N8nClient } from './client';
import { N8nError, N8nValidationError } from './errors';

/**
 * Options accepted by {@link createProxy}.
 *
 * Currently the proxy uses the same options as the client. The shape is
 * defined here so future implementers can extend it (e.g. with caching
 * or transport hooks) without churning consumer code.
 */
export type CreateProxyOptions = CreateClientOptions;

/**
 * Identifies the SDK consumer to the Hub. Surfaces in the executions UI under
 * the `caller` column so SDK-originated runs are distinguishable from MCP and
 * CLI ones — mirrors `ExecuteNodeRequestDto.caller` on the server.
 */
export interface ExecutionCaller {
	kind: 'mcp' | 'sdk' | 'cli';
	name: string;
	clientId?: string;
	sessionId?: string;
}

interface DispatchCall {
	service: string;
	resource?: string;
	operation?: string;
	credentialId?: string;
	/** Optional per-call override for the request body's top-level fields. */
	nodeVersion?: number;
	dryRun?: boolean;
	caller?: ExecutionCaller;
	[parameter: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildNodeType(service: string): string {
	// A dot in the service name signals a fully-qualified node type
	// (e.g. `@n8n/nodes-langchain.openAi`). Everything else is assumed to
	// live under the default `n8n-nodes-base` namespace.
	return service.includes('.') ? service : `n8n-nodes-base.${service}`;
}

async function dispatch(
	call: DispatchCall,
	baseUrl: string,
	token: string,
	defaultCaller: ExecutionCaller,
): Promise<ExecutionResult> {
	const { service, resource, operation, credentialId, nodeVersion, dryRun, caller, ...params } =
		call;

	const nodeType = buildNodeType(service);
	const parameters: Record<string, unknown> = {
		...(resource !== undefined ? { resource } : {}),
		...(operation !== undefined ? { operation } : {}),
		...params,
	};

	const url = new URL('/rest/executions/node', baseUrl).toString();
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Content-Type': 'application/json',
			// Send the token in BOTH common shapes so the SDK works whether the
			// caller has an OAuth bearer token (Authorization header) or an
			// n8n personal access token (X-N8N-API-KEY header). The server's
			// auth chain tries API key first, then falls back to Bearer/cookie.
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: buildAuthHeader(token),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'X-N8N-API-KEY': token,
		},
		body: JSON.stringify({
			nodeType,
			parameters,
			...(credentialId !== undefined ? { credentialId } : {}),
			...(nodeVersion !== undefined ? { nodeVersion } : {}),
			...(dryRun !== undefined ? { dryRun } : {}),
			caller: caller ?? defaultCaller,
		}),
	});

	if (response.status === 400) {
		const body: unknown = await response.json().catch(() => ({}));
		const message =
			isRecord(body) && typeof body.error === 'string'
				? body.error
				: isRecord(body) && typeof body.message === 'string'
					? body.message
					: 'Bad request';
		throw new N8nValidationError(message, { status: 400, body });
	}

	if (!response.ok) {
		const text = await response.text().catch(() => '');
		throw new N8nError(`POST /rest/executions/node failed: ${response.status} ${text}`, {
			status: response.status,
		});
	}

	const raw = (await response.json()) as { data: ExecutionResult } | ExecutionResult;

	// `/rest/` endpoints wrap their JSON in `{ data: ... }`. Strip the wrapper
	// so callers always see the typed ExecutionResult directly.
	const result: ExecutionResult =
		isRecord(raw) && 'data' in raw && isRecord((raw as { data: unknown }).data)
			? (raw as { data: ExecutionResult }).data
			: (raw as ExecutionResult);

	// Ergonomic unwrap: ExecuteNodeService returns the node's output as an
	// array of items (one per emitted result). For the common single-item
	// case we expose the bare object directly so callers can write
	// `result.output.foo` instead of `result.output[0].foo`.
	if (Array.isArray(result.output) && result.output.length === 1) {
		return { ...result, output: result.output[0] };
	}

	return result;
}

// Keys that should NOT be treated as service/resource/operation names. The
// most important is `then`: if the proxy responded to `.then` with a
// function, accidentally `await`-ing the proxy (instead of its call result)
// would silently fire dispatches. We also let `Symbol.toPrimitive` and the
// standard introspection symbols fall through.
const SDK_RESERVED_KEYS = new Set<string>(['then', 'catch', 'finally']);

/**
 * Returns true when `key` should pass through to the underlying target
 * untouched. Narrows `key` to `string` on the false branch so callers can
 * use it as a service/resource/operation name.
 */
function isReservedKey(key: string | symbol): key is symbol | 'then' | 'catch' | 'finally' {
	if (typeof key === 'symbol') return true;
	return SDK_RESERVED_KEYS.has(key);
}

function makeMember(
	service: string,
	member: string,
	baseUrl: string,
	token: string,
	caller: ExecutionCaller,
): (args?: Record<string, unknown>) => Promise<ExecutionResult> {
	// `<member>` lives at the second level of access. It is ambiguous: the
	// caller might be invoking an operation (`n8n.set.json(args)` →
	// operation=json) OR drilling into a resource on the way to an
	// operation (`n8n.slack.message.send(args)` → resource=message,
	// operation=send).
	//
	// To support BOTH shapes we return a callable Proxy:
	//   - Calling it directly dispatches with `operation=member`.
	//   - Indexing into it returns the resource-style L3 callable that
	//     dispatches with `resource=member, operation=sub`.
	const callableAsOperation = async (
		args: Record<string, unknown> = {},
	): Promise<ExecutionResult> =>
		await dispatch({ service, operation: member, ...args }, baseUrl, token, caller);

	return new Proxy(callableAsOperation, {
		get(target, sub: string | symbol, receiver) {
			if (isReservedKey(sub)) {
				return Reflect.get(target, sub, receiver) as unknown;
			}
			return async (args: Record<string, unknown> = {}) =>
				await dispatch(
					{ service, resource: member, operation: sub, ...args },
					baseUrl,
					token,
					caller,
				);
		},
	}) as unknown as (args?: Record<string, unknown>) => Promise<ExecutionResult>;
}

function makeL2(
	service: string,
	baseUrl: string,
	token: string,
	caller: ExecutionCaller,
): (args?: Record<string, unknown>) => Promise<ExecutionResult> {
	// L2 is callable in two distinct modes:
	//   - `n8n.<service>(args)` → service-only dispatch (no operation).
	//   - `n8n.<service>.<member>` → see {@link makeMember}.
	const callable = async (args: Record<string, unknown> = {}) =>
		await dispatch({ service, ...args }, baseUrl, token, caller);

	return new Proxy(callable, {
		get(target, member: string | symbol, receiver) {
			if (isReservedKey(member)) {
				return Reflect.get(target, member, receiver) as unknown;
			}
			return makeMember(service, member, baseUrl, token, caller);
		},
	}) as unknown as (args?: Record<string, unknown>) => Promise<ExecutionResult>;
}

/**
 * Creates the dynamic `Proxy`-backed runtime that maps
 * `n8n.<service>.<operation>(args)` calls onto the Hub's HTTP API.
 *
 * The proxy is two-level with an optional third level:
 *   - L1: `n8n.<service>` returns an L2 proxy.
 *   - L2: callable for the service-only form, otherwise indexable to L3.
 *   - L3: callable for both `<service>.<operation>` and
 *     `<service>.<resource>.<operation>` shapes.
 */
export function createProxy(options: CreateProxyOptions): N8nClient {
	const { baseUrl, token, caller } = options;
	const defaultCaller: ExecutionCaller = caller ?? { kind: 'sdk', name: '@n8n/sdk' };
	// Persist a stable `sessionId` on the proxy so every dispatch from this
	// client is grouped together in the Hub executions UI. The caller may
	// supply their own (e.g. a daily-digest cron job that wants to thread
	// runs by date); otherwise we generate a random UUID once per client.
	const effectiveCaller: ExecutionCaller = {
		...defaultCaller,
		sessionId: defaultCaller.sessionId ?? randomUUID(),
	};
	const root: Record<string, unknown> = {};

	return new Proxy(root, {
		get(target, service: string | symbol, receiver) {
			if (isReservedKey(service)) {
				return Reflect.get(target, service, receiver) as unknown;
			}
			return makeL2(service, baseUrl, token, effectiveCaller);
		},
	});
}
