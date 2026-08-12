import { UserError } from 'n8n-workflow';

import type { ApiRouterEndpoint } from './types';

export type RouteSegment = { kind: 'static'; value: string } | { kind: 'param'; name: string };

export type CompiledRoute = {
	/** Index into the endpoint list, which is also the canvas output index. */
	index: number;
	name: string;
	method: string;
	path: string;
	segments: RouteSegment[];
};

export type RouteMatch =
	| { type: 'matched'; route: CompiledRoute; params: Record<string, string> }
	| { type: 'methodNotAllowed'; allow: string[] }
	| { type: 'notFound' };

/**
 * Splits a URL path into comparable segments: query string dropped, each segment
 * percent-decoded only after the split so an encoded `/` can never introduce one,
 * and empty segments (leading, trailing, doubled slashes) removed.
 */
export function normalizePath(path: string): string[] {
	return path
		.split('?')[0]
		.split('/')
		.filter((segment) => segment.length > 0)
		.map(decodeSegment);
}

function decodeSegment(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}

export function parseRouteSegments(path: string): RouteSegment[] {
	return normalizePath(path).map((segment) =>
		segment.startsWith(':')
			? { kind: 'param', name: segment.slice(1) }
			: { kind: 'static', value: segment },
	);
}

/** Two routes with the same shape can never both be reached. */
export function routeShape(segments: RouteSegment[]): string {
	return segments.map((segment) => (segment.kind === 'static' ? segment.value : ':')).join('/');
}

export function endpointLabel(endpoint: ApiRouterEndpoint): string {
	return endpoint.name?.trim() || `${endpoint.method} ${endpoint.path}`;
}

export function buildRouteTable(endpoints: ApiRouterEndpoint[]): CompiledRoute[] {
	return endpoints.map((endpoint, index) => ({
		index,
		name: endpointLabel(endpoint),
		method: endpoint.method.toUpperCase(),
		path: endpoint.path,
		segments: parseRouteSegments(endpoint.path),
	}));
}

export function validateConfiguration(basePath: string, endpoints: ApiRouterEndpoint[]): void {
	if (basePath.includes(':') || basePath.includes('*')) {
		throw new UserError('Base Path cannot contain ":" or "*"', {
			description: 'Path parameters belong on an endpoint path, not on the base path.',
		});
	}

	const seen = new Map<string, string>();

	for (const endpoint of endpoints) {
		const segments = parseRouteSegments(endpoint.path);

		const paramNames = segments.flatMap((segment) =>
			segment.kind === 'param' ? [segment.name] : [],
		);
		const duplicateParam = paramNames.find(
			(name, index) => paramNames.indexOf(name) !== index || name.length === 0,
		);
		if (duplicateParam !== undefined) {
			throw new UserError(
				duplicateParam.length === 0
					? `Endpoint "${endpointLabel(endpoint)}" has an unnamed path parameter`
					: `Endpoint "${endpointLabel(endpoint)}" uses the path parameter ":${duplicateParam}" more than once`,
			);
		}

		const key = `${endpoint.method.toUpperCase()} ${routeShape(segments)}`;
		const clash = seen.get(key);
		if (clash !== undefined) {
			throw new UserError(
				`Endpoints "${clash}" and "${endpointLabel(endpoint)}" resolve to the same route`,
				{
					description:
						'Path parameter names do not distinguish routes — only the method and the static segments do.',
				},
			);
		}
		seen.set(key, endpointLabel(endpoint));
	}
}

function matchesShape(route: CompiledRoute, segments: string[]): boolean {
	if (route.segments.length !== segments.length) return false;
	return route.segments.every(
		(segment, index) => segment.kind === 'param' || segment.value === segments[index],
	);
}

function staticCount(route: CompiledRoute): number {
	return route.segments.filter((segment) => segment.kind === 'static').length;
}

/** Most static segments wins; ties go to the route whose static segment sits furthest left. */
function byPrecedence(a: CompiledRoute, b: CompiledRoute): number {
	const byStaticCount = staticCount(b) - staticCount(a);
	if (byStaticCount !== 0) return byStaticCount;

	for (let index = 0; index < a.segments.length; index++) {
		const aIsStatic = a.segments[index].kind === 'static';
		const bIsStatic = b.segments[index].kind === 'static';
		if (aIsStatic !== bIsStatic) return aIsStatic ? -1 : 1;
	}

	return a.index - b.index;
}

function extractParams(route: CompiledRoute, segments: string[]): Record<string, string> {
	const params: Record<string, string> = {};
	route.segments.forEach((segment, index) => {
		if (segment.kind === 'param') params[segment.name] = segments[index];
	});
	return params;
}

export function matchRoute(table: CompiledRoute[], method: string, segments: string[]): RouteMatch {
	const pathCandidates = table.filter((route) => matchesShape(route, segments));
	if (pathCandidates.length === 0) return { type: 'notFound' };

	const upperMethod = method.toUpperCase();
	const methodCandidates = pathCandidates.filter((route) => route.method === upperMethod);

	if (methodCandidates.length === 0) {
		const allow = [...new Set(pathCandidates.map((route) => route.method))].sort();
		return { type: 'methodNotAllowed', allow };
	}

	const route = [...methodCandidates].sort(byPrecedence)[0];
	return { type: 'matched', route, params: extractParams(route, segments) };
}

/**
 * Rebuilds the request path from the `:s1/:s2/…` params of a catch-all route, which
 * is the only place the node sees the segments the platform did not itself match.
 */
export function segmentsFromCatchAll(params: object): string[] {
	const entries = Object.entries(params).flatMap(([key, value]) => {
		const depth = /^s(\d+)$/.exec(key);
		if (depth === null || typeof value !== 'string') return [];
		return [[Number(depth[1]), value] as const];
	});

	return entries.sort(([a], [b]) => a - b).map(([, value]) => value);
}
