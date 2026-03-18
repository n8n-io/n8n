import type { ApiKeyScope } from '@n8n/permissions';
import path from 'path';
import RefParser from '@apidevtools/json-schema-ref-parser';

import type { ScopeTaggedMiddleware } from '../../shared/middlewares/global.middleware';

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;

interface EndpointInfo {
	method: string;
	path: string;
	operationId: string;
	tag: string;
	scope: ApiKeyScope | null;
	requestSchema?: Record<string, unknown>;
}

interface EndpointEntry {
	method: string;
	path: string;
	operationId: string;
	requestSchema?: Record<string, unknown>;
}

interface ResourceInfo {
	operations: string[];
	endpoints: EndpointEntry[];
}

interface FilterInfo {
	description: string;
	example?: string;
	values?: string[];
}

export interface DiscoverResponse {
	scopes: ApiKeyScope[];
	resources: Record<string, ResourceInfo>;
	filters: Record<string, FilterInfo>;
	specUrl: string;
}

export interface DiscoverOptions {
	includeSchemas?: boolean;
	scopesEnabled?: boolean;
	resource?: string;
	operation?: string;
}

let cachedEndpointsPromise: Promise<EndpointInfo[]> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isScopeTagged(value: unknown): value is ScopeTaggedMiddleware {
	return typeof value === 'function' && '__apiKeyScope' in value;
}

/**
 * Extract the required ApiKeyScope from a handler's middleware chain
 * by looking for a middleware tagged with __apiKeyScope.
 */
function extractScopeFromHandler(handlerChain: unknown[]): ApiKeyScope | null {
	for (const middleware of handlerChain) {
		if (isScopeTagged(middleware)) {
			return middleware.__apiKeyScope;
		}
	}
	return null;
}

/**
 * Extract the request body schema from an operation.
 * The spec is already fully dereferenced by RefParser.dereference().
 */
function extractRequestSchema(
	operation: Record<string, unknown>,
): Record<string, unknown> | undefined {
	if (!isRecord(operation.requestBody)) return undefined;
	const content = operation.requestBody.content;
	if (!isRecord(content)) return undefined;
	const json = content['application/json'];
	if (!isRecord(json)) return undefined;
	const schema = json.schema;
	return isRecord(schema) ? schema : undefined;
}

async function parseEndpointsFromSpec(): Promise<EndpointInfo[]> {
	if (!cachedEndpointsPromise) {
		cachedEndpointsPromise = _parseEndpointsFromSpec();
	}
	return await cachedEndpointsPromise;
}

async function _parseEndpointsFromSpec(): Promise<EndpointInfo[]> {
	const specPath = path.join(__dirname, '..', '..', 'openapi.yml');
	const publicApiRoot = path.join(__dirname, '..', '..', '..');

	// Load and fully dereference the spec in one operation
	const spec = await RefParser.dereference(specPath);

	if (!isRecord(spec) || !isRecord(spec.paths)) return [];

	const endpoints: EndpointInfo[] = [];
	const handlerCache = new Map<string, Record<string, unknown>>();

	for (const [pathKey, pathValue] of Object.entries(spec.paths)) {
		if (!isRecord(pathValue)) continue;

		for (const method of HTTP_METHODS) {
			const operation = pathValue[method];
			if (!isRecord(operation)) continue;

			const operationId = operation['x-eov-operation-id'];
			const handlerPath = operation['x-eov-operation-handler'];
			if (typeof operationId !== 'string' || typeof handlerPath !== 'string') continue;

			const tags = Array.isArray(operation.tags) ? operation.tags : [];
			const tag = typeof tags[0] === 'string' ? tags[0] : 'Other';

			let handlerModule = handlerCache.get(handlerPath);
			if (!handlerModule) {
				try {
					const fullHandlerPath = path.join(publicApiRoot, handlerPath);
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const loaded = require(fullHandlerPath);
					if (!isRecord(loaded)) continue;
					handlerModule = loaded;
					handlerCache.set(handlerPath, handlerModule);
				} catch {
					continue;
				}
			}

			const middlewareChain = handlerModule[operationId];
			const scope = Array.isArray(middlewareChain)
				? extractScopeFromHandler(middlewareChain)
				: null;

			const requestSchema = extractRequestSchema(operation);

			endpoints.push({
				method: method.toUpperCase(),
				path: `/api/v1${pathKey}`,
				operationId,
				tag,
				scope,
				requestSchema,
			});
		}
	}

	return endpoints;
}

export async function buildDiscoverResponse(
	callerScopes: ApiKeyScope[],
	options?: DiscoverOptions,
): Promise<DiscoverResponse> {
	const allEndpoints = await parseEndpointsFromSpec();
	const scopeSet = new Set(callerScopes);
	const includeSchemas = options?.includeSchemas === true;
	const scopesEnabled = options?.scopesEnabled !== false;

	// When scopes are not licensed (community edition), show all endpoints
	// since all API keys have unrestricted access regardless of stored scopes
	const filtered = scopesEnabled
		? allEndpoints.filter((ep) => ep.scope === null || scopeSet.has(ep.scope))
		: allEndpoints;

	const resources: Record<string, ResourceInfo> = {};

	for (const ep of filtered) {
		const resourceKey = ep.tag.toLowerCase();

		if (!resources[resourceKey]) {
			resources[resourceKey] = { operations: [], endpoints: [] };
		}

		const entry: EndpointEntry = {
			method: ep.method,
			path: ep.path,
			operationId: ep.operationId,
		};

		if (includeSchemas && ep.requestSchema) {
			entry.requestSchema = ep.requestSchema;
		}

		resources[resourceKey].endpoints.push(entry);

		// Extract operation name from scope (e.g. 'workflow:read' → 'read')
		const operation = ep.scope?.split(':')[1];
		if (operation && !resources[resourceKey].operations.includes(operation)) {
			resources[resourceKey].operations.push(operation);
		}
	}

	const resourceFilter = options?.resource?.toLowerCase();
	const operationFilter = options?.operation?.toLowerCase();

	let filteredResources = resources;

	if (resourceFilter) {
		const match = filteredResources[resourceFilter];
		filteredResources = match ? { [resourceFilter]: match } : {};
	}

	if (operationFilter) {
		const scopeByOperationId = new Map(
			filtered.map((f) => [f.operationId, f.scope?.split(':')[1]?.toLowerCase()]),
		);
		const result: Record<string, ResourceInfo> = {};
		for (const [key, info] of Object.entries(filteredResources)) {
			const matchingEndpoints = info.endpoints.filter(
				(ep) => scopeByOperationId.get(ep.operationId) === operationFilter,
			);
			if (matchingEndpoints.length > 0) {
				result[key] = {
					operations: info.operations.filter((o) => o.toLowerCase() === operationFilter),
					endpoints: matchingEndpoints,
				};
			}
		}
		filteredResources = result;
	}

	const allOperations = [...new Set(Object.values(resources).flatMap((r) => r.operations))];

	return {
		scopes: callerScopes,
		resources: filteredResources,
		filters: {
			resource: {
				description: 'Filter to a specific resource',
				values: Object.keys(resources),
			},
			operation: {
				description: 'Filter to a specific operation',
				values: allOperations,
			},
			include: {
				description: 'Include additional data',
				values: ['schemas'],
			},
		},
		specUrl: '/api/v1/openapi.yml',
	};
}

/** Exported for testing — resets the cached endpoints */
export function _resetCache(): void {
	cachedEndpointsPromise = undefined;
}
