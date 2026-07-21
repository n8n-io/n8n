// Must run before importing any controller/DTO module — see zod-extend.ts for why this ordering
// is load-bearing (it patches .describe()/.openapi() onto zod's shared prototype).
import './zod-extend';

// Side-effect import: populates ControllerRegistryMetadata with every @PublicApiController before
// resolvePublicApiRoutes() below walks it. Same barrel `public-api/index.ts` imports for the real
// server, so a new decorated controller is discovered by both with one registration, not two.
import '../controllers';

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import type { ResolvedPublicApiRoute } from '@/public-api/public-api-route-resolver';
import {
	resolvePublicApiRoutes,
	scopeRequirementToString,
} from '@/public-api/public-api-route-resolver';

/**
 * Query fields backed by shared, hand-written parameter files instead of being generated from the
 * DTO. Their `.transform()` chains (string -> parsed/clamped number) collapse to a bare
 * `{ type: 'string' }` under zod-to-openapi's introspection, with constraints like `maximum`/
 * `default` silently dropped. Every public API list endpoint reuses this exact pagination shape,
 * so this mapping is generic, not per-resource.
 */
const SHARED_PAGINATION_PARAMS: Record<string, { $ref: string }> = {
	limit: { $ref: '../../../../shared/spec/parameters/limit.yml' },
	cursor: { $ref: '../../../../shared/spec/parameters/cursor.yml' },
};

const UNAUTHORIZED_RESPONSE = { $ref: '../../../../shared/spec/responses/unauthorized.yml' };
const FORBIDDEN_RESPONSE = { $ref: '../../../../shared/spec/responses/forbidden.yml' };
const BAD_REQUEST_RESPONSE = { $ref: '../../../../shared/spec/responses/badRequest.yml' };

function toOpenApiPath(path: string): string {
	return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/** First non-empty path segment, used both as the output directory and the OpenAPI tag. */
function resourceSegment(path: string): string {
	return path.split('/').find(Boolean) ?? 'root';
}

function capitalize(value: string): string {
	return value.length ? value[0].toUpperCase() + value.slice(1) : value;
}

/**
 * `route.responseDto` is typed as `ResponseDtoClass` (`Pick<ZodClass, 'parse'>`) at the decorator
 * API boundary, so `.schema` isn't visible without narrowing — every real DTO built via `Z.class`
 * has it, this just proves it at runtime. DTOs are classes, i.e. `typeof dto === 'function'`, not
 * `'object'` — easy to get wrong since every other DTO check in this codebase narrows an
 * *instance*, not the class itself.
 */
function hasSchema(dto: unknown): dto is { schema: z.ZodTypeAny } {
	return (typeof dto === 'object' || typeof dto === 'function') && dto !== null && 'schema' in dto;
}

/**
 * Splits a query DTO's shape into: fields zod-to-openapi can introspect directly (passed through
 * as `request.query`), and known pagination fields that fall back to the shared parameter $refs
 * above. Returns `undefined` for either half when there's nothing to contribute, so the caller can
 * omit the key entirely rather than emit an empty object/array.
 */
function buildQueryConfig(route: ResolvedPublicApiRoute): {
	parameters?: RouteConfig['parameters'];
	requestQuery?: z.AnyZodObject;
} {
	if (!route.requestQueryDto) return {};

	const shape = route.requestQueryDto.schema.shape as Record<string, z.ZodTypeAny>;
	const generatedShape: Record<string, z.ZodTypeAny> = {};
	const parameters: NonNullable<RouteConfig['parameters']> = [];

	for (const [key, fieldSchema] of Object.entries(shape)) {
		const sharedParam = SHARED_PAGINATION_PARAMS[key];
		if (sharedParam) {
			parameters.push(sharedParam);
			continue;
		}
		generatedShape[key] = fieldSchema;
	}

	return {
		parameters: parameters.length ? parameters : undefined,
		requestQuery: Object.keys(generatedShape).length ? z.object(generatedShape) : undefined,
	};
}

/**
 * Response set is derived from what `PublicApiControllerRegistry` actually does at runtime, not
 * invented: auth always 401s, `@ApiKeyScope` always 403s on mismatch, and a body/query DTO always
 * 400s on failed `.safeParse()`. Error response *bodies* (schemas) stay hand-written $refs —
 * generating those is out of scope for this pass.
 */
function buildResponses(route: ResolvedPublicApiRoute): RouteConfig['responses'] {
	const responses: RouteConfig['responses'] = {
		200: {
			description: 'Successful response',
			...(route.responseDto && hasSchema(route.responseDto)
				? { content: { 'application/json': { schema: route.responseDto.schema } } }
				: {}),
		},
	};

	if (route.requestBodyDto ?? route.requestQueryDto) {
		responses[400] = BAD_REQUEST_RESPONSE;
	}
	responses[401] = UNAUTHORIZED_RESPONSE;
	if (route.apiKeyScope) {
		responses[403] = FORBIDDEN_RESPONSE;
	}

	return responses;
}

export interface GeneratedDecoratorOperation {
	/** Where to write the generated fragment, relative to the `v1` directory. */
	outputPath: string;
	pathKey: string;
	method: RouteConfig['method'];
	config: RouteConfig;
}

/**
 * Builds one `RouteConfig` per route discovered on a `@PublicApiController` class — no
 * per-resource registration needed. Adding a new `@PublicApiController` route makes it show up
 * here automatically; a legacy eov-routed endpoint (still hand-written YAML) is untouched until
 * it's migrated to the controller pattern.
 *
 * Output path convention: `handlers/<first-path-segment>/spec/paths/<handlerName>.generated.yml`
 * — handler (method) names are unique within a controller class, so this can't collide even
 * before a resource's `spec/` folder exists for a brand-new (not-yet-legacy) resource.
 */
export function getDecoratorGeneratedOperations(): GeneratedDecoratorOperation[] {
	return resolvePublicApiRoutes().map((route) => {
		const pathKey = toOpenApiPath(route.path);
		const { parameters, requestQuery } = buildQueryConfig(route);
		const resource = resourceSegment(route.path);

		const config: RouteConfig = {
			method: route.method,
			path: pathKey,
			operationId: route.handlerName,
			tags: [capitalize(resource)],
			...(route.apiKeyScope
				? { 'x-required-scope': scopeRequirementToString(route.apiKeyScope) }
				: {}),
			...(parameters ? { parameters } : {}),
			...(requestQuery ? { request: { query: requestQuery } } : {}),
			responses: buildResponses(route),
		};

		return {
			outputPath: `handlers/${resource}/spec/paths/${route.handlerName}.generated.yml`,
			pathKey,
			method: route.method,
			config,
		};
	});
}
