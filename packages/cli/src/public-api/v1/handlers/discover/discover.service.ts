import RefParser from '@apidevtools/json-schema-ref-parser';
import type { ApiKeyScope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import path from 'path';

import {
	extractScopeFromEovHandlerChain,
	loadPublicControllerScopeMap,
	publicApiRouteKey,
	resolvePublicApiImplementedScope,
} from '../../shared/public-api-scope-lookup';

import '../../controllers';

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
	resource?: string;
	operation?: string;
}

let cachedEndpointsPromise: Promise<EndpointInfo[]> | undefined;

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

	const spec = await RefParser.dereference(specPath);

	if (!isRecord(spec) || !isRecord(spec.paths)) return [];

	const endpoints: EndpointInfo[] = [];
	const handlerCache = new Map<string, Record<string, unknown>>();
	const controllerScopes = loadPublicControllerScopeMap();

	for (const [pathKey, pathValue] of Object.entries(spec.paths)) {
		if (!isRecord(pathValue)) continue;

		for (const method of HTTP_METHODS) {
			const operation = pathValue[method];
			if (!isRecord(operation)) continue;

			const eovOperationId = operation['x-eov-operation-id'];
			const handlerPath = operation['x-eov-operation-handler'];
			const openApiOperationId = operation.operationId;
			const hasEovHandler = typeof eovOperationId === 'string' && typeof handlerPath === 'string';
			const routeKey = publicApiRouteKey(method, pathKey);
			const hasControllerHandler = controllerScopes.has(routeKey);

			if (!hasEovHandler && !hasControllerHandler) {
				continue;
			}

			const operationId =
				(typeof eovOperationId === 'string' ? eovOperationId : undefined) ??
				(typeof openApiOperationId === 'string' ? openApiOperationId : undefined);
			if (!operationId) {
				continue;
			}

			const tags = Array.isArray(operation.tags) ? operation.tags : [];
			const tag = typeof tags[0] === 'string' ? tags[0] : 'Other';

			let eovHandlerScope: ApiKeyScope | undefined;
			if (hasEovHandler) {
				let handlerModule = handlerCache.get(handlerPath);
				if (!handlerModule) {
					try {
						const fullHandlerPath = path.join(publicApiRoot, `${handlerPath}.js`);
						const imported: unknown = await import(fullHandlerPath);
						if (!isRecord(imported)) continue;
						const loaded = isRecord(imported.default) ? imported.default : imported;
						if (!isRecord(loaded)) continue;
						handlerModule = loaded;
						handlerCache.set(handlerPath, handlerModule);
					} catch {
						continue;
					}
				}

				const middlewareChain = handlerModule[eovOperationId];
				eovHandlerScope = Array.isArray(middlewareChain)
					? extractScopeFromEovHandlerChain(middlewareChain)
					: undefined;
			}

			const implemented = resolvePublicApiImplementedScope(
				controllerScopes,
				method,
				pathKey,
				eovHandlerScope,
			);

			endpoints.push({
				method: method.toUpperCase(),
				path: `/api/v1${pathKey}`,
				operationId,
				tag,
				scope: (implemented as ApiKeyScope | undefined) ?? null,
				requestSchema: extractRequestSchema(operation),
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

	const filtered = allEndpoints.filter((ep) => ep.scope === null || scopeSet.has(ep.scope));

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
