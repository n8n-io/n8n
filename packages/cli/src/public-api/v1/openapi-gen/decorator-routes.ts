// Must run before importing any controller/DTO module — see zod-extend.ts
import './zod-extend';

// Side-effect import: populates ControllerRegistryMetadata with every @PublicApiController before
// resolvePublicApiRoutes()
import '../controllers';

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ResponseDtoClass } from '@n8n/decorators';
import { z } from 'zod';

import type { ResolvedPublicApiRoute } from '@/public-api/public-api-route-resolver';
import {
	resolvePublicApiRoutes,
	scopeRequirementToString,
} from '@/public-api/public-api-route-resolver';

/**
 * Query fields backed by shared, hand-written parameter files instead of being generated from the
 * DTO. Eventually we would want these to be generated via DTOs as well.
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

/** A `ResponseDtoClass` narrowed to the two fields the generator actually reads off it. */
export type NamedResponseDto = ResponseDtoClass & { schema: z.ZodTypeAny; name: string };

function hasNamedSchema(dto: unknown): dto is NamedResponseDto {
	if (dto === null || (typeof dto !== 'object' && typeof dto !== 'function')) return false;
	return 'schema' in dto && 'name' in dto && typeof dto.name === 'string';
}

/**
 * Lets the generator swap a DTO's inline schema for a registry-registered one, so a schema shared
 * across operations is emitted once and `$ref`d rather than duplicated inline. Called with the DTO
 * class and its raw schema; returns the schema to actually embed in the operation. The default
 * (identity) keeps every schema inline — the pre-registry behaviour.
 */
export type SchemaResolver = (dto: NamedResponseDto, schema: z.ZodTypeAny) => z.ZodTypeAny;

const inlineResolver: SchemaResolver = (_dto, schema) => schema;

/**
 * Response DTOs referenced by more than one decorator route are hoisted into a shared, `$ref`d component
 * instead of inlining at each use site. A single-use schema stays inline. Keyed by the DTO *class
 * reference* itself (not its name) - two unrelated DTOs that happen to share a class name are never
 * conflated, only reusing the exact same class counts as "shared".
 */
export function getSharedResponseSchemas(): Map<NamedResponseDto, z.ZodTypeAny> {
	const seen = new Set<NamedResponseDto>();
	const shared = new Map<NamedResponseDto, z.ZodTypeAny>();

	for (const route of resolvePublicApiRoutes()) {
		if (!route.responseDto || !hasNamedSchema(route.responseDto)) {
			continue;
		}

		const dto = route.responseDto;

		if (seen.has(dto) && !shared.has(dto)) {
			// Second sighting: it's reused, so hoist it.
			shared.set(dto, dto.schema);
		} else {
			// First sighting: remember the class.
			seen.add(dto);
		}
	}

	return shared;
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
function buildResponses(
	route: ResolvedPublicApiRoute,
	resolveSchema: SchemaResolver,
): RouteConfig['responses'] {
	const responses: RouteConfig['responses'] = {
		200: {
			description: 'Successful response',
			...(route.responseDto && hasNamedSchema(route.responseDto)
				? {
						content: {
							'application/json': {
								schema: resolveSchema(route.responseDto, route.responseDto.schema),
							},
						},
					}
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
 * Builds one `RouteConfig` per route discovered on a `@PublicApiController` class.
 * A new `@PublicApiController` shows up here automatically; a legacy eov-routed endpoint (still hand-written YAML)
 * is untouched until it's migrated to the controller pattern.
 *
 * Output path convention: `handlers/<first-path-segment>/spec/paths/<handlerName>.generated.yml`
 * — handler (method) names are unique within a controller class, so this can't collide even
 * before a resource's `spec/` folder exists for a brand-new (not-yet-legacy) resource.
 */
export function getDecoratorGeneratedOperations(
	resolveSchema: SchemaResolver = inlineResolver,
): GeneratedDecoratorOperation[] {
	return resolvePublicApiRoutes().map((route) => {
		const pathKey = toOpenApiPath(route.path);
		const { parameters, requestQuery } = buildQueryConfig(route);
		const resource = resourceSegment(route.path);

		const config: RouteConfig = {
			method: route.method,
			path: pathKey,
			operationId: route.handlerName,
			tags: [capitalize(resource)],
			...(route.description ? { description: route.description } : {}),
			...(route.apiKeyScope
				? { 'x-required-scope': scopeRequirementToString(route.apiKeyScope) }
				: {}),
			...(parameters ? { parameters } : {}),
			...(requestQuery ? { request: { query: requestQuery } } : {}),
			responses: buildResponses(route, resolveSchema),
			// Satisfies express-openapi-validator's operation-handler installer, which requires
			// every operation in the spec to resolve to *something* — see decorator-routed.handler.ts
			// for why. `x-decorator-routed` is the actual signal consumers (discover.service.ts,
			// scope-parity.test.ts) use to tell this apart from a real eov-routed operation.
			'x-eov-operation-id': 'unreachable',
			'x-eov-operation-handler': 'v1/handlers/decorator-routed.handler',
			'x-decorator-routed': true,
		};

		return {
			outputPath: `handlers/${resource}/spec/paths/${route.handlerName}.generated.yml`,
			pathKey,
			method: route.method,
			config,
		};
	});
}
