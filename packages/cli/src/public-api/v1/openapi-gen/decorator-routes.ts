// Must run before importing any controller/DTO module — see zod-extend.ts
import './zod-extend';

// Side-effect import: populates ControllerRegistryMetadata with every @PublicApiController before
// resolvePublicApiRoutes()
import '../controllers';

import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import type { ResponseDtoClass } from '@n8n/decorators';
import { UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import type { ResolvedPublicApiRoute } from '@/public-api/public-api-route-resolver';
import {
	resolvePublicApiRoutes,
	scopeRequirementToString,
	toOpenApiPathTemplate,
} from '@/public-api/public-api-route-resolver';

// Query fields backed by shared hand-written parameter files instead of being generated
const SHARED_PAGINATION_PARAMS: Record<string, { $ref: string }> = {
	limit: { $ref: '../../../../shared/spec/parameters/limit.yml' },
	cursor: { $ref: '../../../../shared/spec/parameters/cursor.yml' },
	offset: { $ref: '../../../../shared/spec/parameters/offset.yml' },
};

// Status codes an `@ApiErrorResponse` can declare backed by hand-written schemas
const ERROR_RESPONSE_REFS: Record<number, { $ref: string }> = {
	400: { $ref: '../../../../shared/spec/responses/badRequest.yml' },
	401: { $ref: '../../../../shared/spec/responses/unauthorized.yml' },
	402: { $ref: '../../../../shared/spec/responses/paymentRequired.yml' },
	403: { $ref: '../../../../shared/spec/responses/forbidden.yml' },
	404: { $ref: '../../../../shared/spec/responses/notFound.yml' },
	409: { $ref: '../../../../shared/spec/responses/conflict.yml' },
};

/** A `ResponseDtoClass` narrowed to the two fields the generator actually reads off it. */
export type NamedResponseDto = ResponseDtoClass & { schema: z.ZodTypeAny; name: string };

function hasNamedSchema(dto: unknown): dto is NamedResponseDto {
	if (dto === null || (typeof dto !== 'object' && typeof dto !== 'function')) {
		return false;
	}
	return 'schema' in dto && 'name' in dto && typeof dto.name === 'string';
}

/**
 * Lets the generator swap a DTO's inline schema for a registry-registered one, so a schema shared
 * across operations is emitted once and `$ref`d rather than duplicated inline.
 */
export type SchemaResolver = (dto: NamedResponseDto, schema: z.ZodTypeAny) => z.ZodTypeAny;

const inlineResolver: SchemaResolver = (_dto, schema) => schema;

/**
 * Response DTOs referenced by more than one decorator route are hoisted into a shared, `$ref`d component
 * instead of inlining at each use site. A single-use schema stays inline.
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
 * Builds the zod object for the route's path parameters (one per `@Param('name')`), which
 * zod-to-openapi turns into `in: path` parameters.
 */
function buildPathParams(route: ResolvedPublicApiRoute): z.AnyZodObject | undefined {
	const shape: Record<string, z.ZodTypeAny> = {};
	for (const arg of route.args) {
		if (arg.type === 'param') shape[arg.key] = z.string();
	}
	return Object.keys(shape).length ? z.object(shape) : undefined;
}

/** A route's request body, straight from its `@Body` DTO - no field-splitting needed like query has. */
function buildRequestBody(
	route: ResolvedPublicApiRoute,
): NonNullable<RouteConfig['request']>['body'] {
	if (!route.requestBodyDto) return undefined;

	return {
		content: {
			'application/json': {
				schema: route.requestBodyDto.schema,
			},
		},
	};
}

/**
 * Response set is derived from what `PublicApiControllerRegistry` actually does at runtime, not
 * invented: the success status is the one `@ApiResponse` declares (and the same one the registry
 * sends), auth always 401s, `@ApiKeyScope` always 403s on mismatch, and a body/query DTO always
 * 400s on failed `.safeParse()`. Anything else - like a 404 from a business-rule lookup that isn't
 * visible in decorator metadata - has to be declared explicitly via `@ApiErrorResponse`. Error
 * response *bodies* (schemas) stay hand-written $refs — generating those is out of scope for this
 * pass.
 */
function buildResponses(
	route: ResolvedPublicApiRoute,
	resolveSchema: SchemaResolver,
): RouteConfig['responses'] {
	const responses: RouteConfig['responses'] = {
		[route.successStatus]: {
			description: 'Operation successful.',
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

	// If the route has a request body or query, we add an HTTP 400 as a possible response
	// Every @PublicApiController decorated route has an HTTP 401 response for missing or invalid API key
	// If the route has an @ApiKeyScope decorator, we add an HTTP 403 as a possible response
	if (route.requestBodyDto ?? route.requestQueryDto) {
		responses[400] = ERROR_RESPONSE_REFS[400];
	}
	responses[401] = ERROR_RESPONSE_REFS[401];
	if (route.apiKeyScope) {
		responses[403] = ERROR_RESPONSE_REFS[403];
	}

	for (const status of route.errorResponses ?? []) {
		const ref = ERROR_RESPONSE_REFS[status];
		if (!ref) {
			throw new UnexpectedError(
				`@ApiErrorResponse(${status}) on ${route.controllerName}.${route.handlerName} has no ` +
					'matching shared response file in ERROR_RESPONSE_REFS - add one to shared/spec/responses/ ' +
					'and register it there.',
			);
		}
		responses[status] = ref;
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
 */
export function getDecoratorGeneratedOperations(
	resolveSchema: SchemaResolver = inlineResolver,
): GeneratedDecoratorOperation[] {
	const publicApiRoutes = resolvePublicApiRoutes();

	return publicApiRoutes.map((route) => {
		const pathKey = toOpenApiPathTemplate(route.path);
		const { parameters, requestQuery } = buildQueryConfig(route);
		const requestParams = buildPathParams(route);
		const requestBody = buildRequestBody(route);
		const resource = route.path.split('/').find(Boolean) ?? 'root';

		const config: RouteConfig = {
			method: route.method,
			path: pathKey,
			operationId: route.handlerName,
			...(route.tags?.length ? { tags: route.tags } : {}),
			...(route.summary ? { summary: route.summary } : {}),
			...(route.description ? { description: route.description } : {}),
			...(route.apiKeyScope
				? { 'x-required-scope': scopeRequirementToString(route.apiKeyScope) }
				: {}),
			...(route.deprecated ? { deprecated: true } : {}),
			...(parameters ? { parameters } : {}),
			...((requestParams ?? requestQuery ?? requestBody)
				? {
						request: {
							...(requestParams ? { params: requestParams } : {}),
							...(requestQuery ? { query: requestQuery } : {}),
							...(requestBody ? { body: requestBody } : {}),
						},
					}
				: {}),
			responses: buildResponses(route, resolveSchema),
			// Satisfies express-openapi-validator's operation-handler installer, which requires
			// every operation in the spec to resolve to something.
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
