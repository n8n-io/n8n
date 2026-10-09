import type { DiscoverDataPublic } from '@n8n/api-types';
import type { ApiKeyScopeRequirement } from '@n8n/decorators';

import {
	apiKeyScopesSatisfy,
	resolvePublicApiRoutes,
	scopesInRequirement,
	toOpenApiPathTemplate,
} from '../../../public-api-route-resolver';
import { buildRequestBodyJsonSchema } from '../../openapi-gen/decorator-routes';

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

export interface DiscoverOptions {
	includeSchemas?: boolean;
	resource?: string;
	operation?: string;
}

let cachedEndpoints: EndpointInfo[] | undefined;

function getEndpoints(): EndpointInfo[] {
	cachedEndpoints ??= buildEndpoints();
	return cachedEndpoints;
}

function buildEndpoints(): EndpointInfo[] {
	return resolvePublicApiRoutes().map((route) => ({
		method: route.method.toUpperCase(),
		path: `/api/v1${toOpenApiPathTemplate(route.path)}`,
		operationId: route.handlerName,
		tag: route.tags?.[0] ?? 'Other',
		scope: route.apiKeyScope ?? null,
		// A non-JSON body shows no request schema (`discoverable: false` on its handler), so a
		// client doesn't assume one.
		requestSchema: route.requestBodyHandler?.discoverable
			? buildRequestBodyJsonSchema(route)
			: undefined,
	}));
}

export async function buildDiscoverResponse(
	callerScopes: readonly string[],
	options?: DiscoverOptions,
): Promise<DiscoverDataPublic> {
	const allEndpoints = getEndpoints();
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
		scopes: [...callerScopes],
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
	cachedEndpoints = undefined;
}
