import type { ApiKeyScope } from '@n8n/permissions';
import path from 'path';

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
	resource?: string;
	operation?: string;
}

let cachedEndpoints: EndpointInfo[] | undefined;

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

interface YAMLLoader {
	load: (p: string) => unknown;
}

interface ResolvedPath {
	spec: Record<string, unknown>;
	/** Directory the path spec was loaded from (for resolving relative $ref) */
	baseDir: string;
}

/**
 * Resolve path operations from a path entry. The built openapi.yml has
 * $ref resolved inline (operations directly on the object), while the
 * source YAML uses $ref pointing to separate files.
 */
function resolvePathSpec(
	pathValue: Record<string, unknown>,
	specDir: string,
	YAML: YAMLLoader,
): ResolvedPath {
	if ('$ref' in pathValue && typeof pathValue.$ref === 'string') {
		const refPath = path.join(specDir, pathValue.$ref);
		const loaded = YAML.load(refPath);
		if (!isRecord(loaded)) return { spec: {}, baseDir: specDir };
		return { spec: loaded, baseDir: path.dirname(refPath) };
	}
	return { spec: pathValue, baseDir: specDir };
}

const COMPONENTS_SCHEMA_PREFIX = '#/components/schemas/';

/**
 * Recursively resolve all `$ref: '#/components/schemas/<name>'` references
 * within a schema object, inlining the resolved definitions. This handles
 * nested refs (e.g. workflow → nodes → node) so the returned schema is
 * fully self-contained. A `seen` set prevents circular reference loops.
 */
export function resolveRefs(
	obj: Record<string, unknown>,
	componentSchemas: Record<string, unknown>,
	seen = new Set<string>(),
): Record<string, unknown> {
	if (typeof obj.$ref === 'string' && obj.$ref.startsWith(COMPONENTS_SCHEMA_PREFIX)) {
		const name = obj.$ref.slice(COMPONENTS_SCHEMA_PREFIX.length);
		if (seen.has(name)) return { type: 'object', description: `(circular: ${name})` };
		const resolved = componentSchemas[name];
		if (isRecord(resolved)) {
			seen.add(name);
			return resolveRefs(resolved, componentSchemas, seen);
		}
		return obj;
	}

	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (isRecord(value)) {
			result[key] = resolveRefs(value, componentSchemas, new Set(seen));
		} else if (Array.isArray(value)) {
			result[key] = value.map((item): unknown =>
				isRecord(item) ? resolveRefs(item, componentSchemas, new Set(seen)) : item,
			);
		} else {
			result[key] = value;
		}
	}
	return result;
}

/**
 * Extract the request body schema from an operation, resolving all $ref
 * references recursively so the returned schema is fully self-contained.
 */
function extractRequestSchema(
	operation: Record<string, unknown>,
	componentSchemas: Record<string, unknown>,
	baseDir: string,
	YAML: YAMLLoader,
): Record<string, unknown> | undefined {
	if (!isRecord(operation.requestBody)) return undefined;
	const content = operation.requestBody.content;
	if (!isRecord(content)) return undefined;
	const json = content['application/json'];
	if (!isRecord(json)) return undefined;
	const schema = json.schema;
	if (!isRecord(schema)) return undefined;

	// Source spec: relative file $ref (e.g. '../schemas/credential.yml')
	if (typeof schema.$ref === 'string' && !schema.$ref.startsWith('#')) {
		try {
			const loaded = YAML.load(path.join(baseDir, schema.$ref));
			if (isRecord(loaded)) return resolveRefs(loaded, componentSchemas);
		} catch {
			return undefined;
		}
	}

	return resolveRefs(schema, componentSchemas);
}

async function parseEndpointsFromSpec(): Promise<EndpointInfo[]> {
	if (cachedEndpoints) return cachedEndpoints;

	const { default: YAML } = await import('yamljs');

	const specDir = path.join(__dirname, '..', '..');
	const publicApiRoot = path.join(specDir, '..');
	const loaded = YAML.load(path.join(specDir, 'openapi.yml'));
	if (!isRecord(loaded) || !isRecord(loaded.paths)) return [];

	const componentSchemas =
		isRecord(loaded.components) && isRecord(loaded.components.schemas)
			? loaded.components.schemas
			: {};

	const endpoints: EndpointInfo[] = [];
	const handlerCache = new Map<string, Record<string, unknown>>();

	for (const [pathKey, pathValue] of Object.entries(loaded.paths)) {
		if (!isRecord(pathValue)) continue;

		let resolved: ResolvedPath;
		try {
			resolved = resolvePathSpec(pathValue, specDir, YAML);
		} catch {
			continue;
		}

		for (const method of HTTP_METHODS) {
			const operation = resolved.spec[method];
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

			const requestSchema = extractRequestSchema(
				operation,
				componentSchemas,
				resolved.baseDir,
				YAML,
			);

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

	cachedEndpoints = endpoints;
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
		const result: Record<string, ResourceInfo> = {};
		for (const [key, info] of Object.entries(filteredResources)) {
			const matchingEndpoints = info.endpoints.filter((ep) => {
				const epScope = filtered.find((f) => f.operationId === ep.operationId)?.scope;
				return epScope?.split(':')[1]?.toLowerCase() === operationFilter;
			});
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
			op: {
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
