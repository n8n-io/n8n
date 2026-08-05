import RefParser from '@apidevtools/json-schema-ref-parser';
import type { ApiKeyScopeRequirement } from '@n8n/decorators';
import type { ApiKeyScope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import path from 'path';

import {
	apiKeyScopesSatisfy,
	HTTP_METHODS,
	resolvePublicApiRoutes,
	scopeRequirementFromString,
	scopesInRequirement,
	toOpenApiPathTemplate,
} from '../../../public-api-route-resolver';
import { extractScopeFromEovHandlerChain } from '../../shared/public-api-scope-lookup';

import '../../controllers';

interface EndpointInfo {
	method: string;
	path: string;
	operationId: string;
	tag: string;
	scope: ApiKeyScopeRequirement | null;
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
	cachedEndpointsPromise ??= buildAllEndpoints();
	return await cachedEndpointsPromise;
}

async function buildAllEndpoints(): Promise<EndpointInfo[]> {
	return [...(await buildEovEndpoints()), ...buildDecoratorEndpoints()];
}

async function buildEovEndpoints(): Promise<EndpointInfo[]> {
	const specPath = path.join(__dirname, '..', '..', 'openapi.yml');
	const publicApiRoot = path.join(__dirname, '..', '..', '..');

	const spec = await RefParser.dereference(specPath);

	if (!isRecord(spec) || !isRecord(spec.paths)) return [];

	const endpoints: EndpointInfo[] = [];
	const handlerCache = new Map<string, Record<string, unknown>>();

	for (const [pathKey, pathValue] of Object.entries(spec.paths)) {
		if (!isRecord(pathValue)) continue;

		for (const method of HTTP_METHODS) {
			const operation = pathValue[method];
			if (!isRecord(operation)) continue;
			if (operation['x-decorator-routed'] === true) continue;

			const operationId = operation['x-eov-operation-id'];
			const handlerPath = operation['x-eov-operation-handler'];
			if (typeof operationId !== 'string' || typeof handlerPath !== 'string') continue;

			const tags = Array.isArray(operation.tags) ? operation.tags : [];
			const tag = typeof tags[0] === 'string' ? tags[0] : 'Other';

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

			const middlewareChain = handlerModule[operationId];
			const scope = Array.isArray(middlewareChain)
				? extractScopeFromEovHandlerChain(middlewareChain)
				: undefined;

			endpoints.push({
				method: method.toUpperCase(),
				path: `/api/v1${pathKey}`,
				operationId,
				tag,
				// eov middleware tags itself with a flat, possibly comma-joined scope string.
				scope: scope ? scopeRequirementFromString(scope) : null,
				requestSchema: extractRequestSchema(operation),
			});
		}
	}

	return endpoints;
}

function buildDecoratorEndpoints(): EndpointInfo[] {
	return resolvePublicApiRoutes().map((route) => ({
		method: route.method.toUpperCase(),
		path: `/api/v1${toOpenApiPathTemplate(route.path)}`,
		operationId: route.handlerName,
		tag: route.tags?.[0] ?? 'Other',
		scope: route.apiKeyScope ?? null,
	}));
}

export async function buildDiscoverResponse(
	callerScopes: ApiKeyScope[],
	options?: DiscoverOptions,
): Promise<DiscoverResponse> {
	const allEndpoints = await parseEndpointsFromSpec();
	const includeSchemas = options?.includeSchemas === true;

	// Same any/all matching the registry enforces, so /discover shows exactly what the caller may call.
	const filtered = allEndpoints.filter(
		(ep) => ep.scope === null || apiKeyScopesSatisfy(callerScopes, ep.scope),
	);

	/** The `read` of `tag:read`, one per scope the requirement names. */
	const operationsOf = (scope: ApiKeyScopeRequirement | null): string[] =>
		scope === null
			? []
			: scopesInRequirement(scope)
					.map((s) => s.split(':')[1])
					.filter((operation): operation is string => Boolean(operation));

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

		for (const operation of operationsOf(ep.scope)) {
			if (!resources[resourceKey].operations.includes(operation)) {
				resources[resourceKey].operations.push(operation);
			}
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
		// A composite requirement contributes several operations, so match against all of them.
		const operationsByOperationId = new Map(
			filtered.map((f) => [
				f.operationId,
				new Set(operationsOf(f.scope).map((operation) => operation.toLowerCase())),
			]),
		);
		const result: Record<string, ResourceInfo> = {};
		for (const [key, info] of Object.entries(filteredResources)) {
			const matchingEndpoints = info.endpoints.filter((ep) =>
				operationsByOperationId.get(ep.operationId)?.has(operationFilter),
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
