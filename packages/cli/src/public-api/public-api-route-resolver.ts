import type { ZodClass } from '@n8n/api-types';
import type {
	ApiKeyScopeRequirement,
	Arg,
	Controller,
	HandlerName,
	Method,
	ResponseDtoClass,
	SuccessStatus,
} from '@n8n/decorators';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';
import { UnexpectedError } from 'n8n-workflow';

export const HTTP_METHODS = [
	'get',
	'post',
	'put',
	'patch',
	'delete',
	'options',
	'head',
	'trace',
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type ResolvedRouteArg =
	| { type: 'param'; key: string }
	| { type: 'body' | 'query'; dto: ZodClass };

function isDtoArg(
	arg: ResolvedRouteArg,
	type: 'body' | 'query',
): arg is Extract<ResolvedRouteArg, { type: 'body' | 'query' }> {
	return arg.type === type;
}

export interface ResolvedPublicApiRoute {
	controllerClass: Controller;
	controllerName: string;
	handlerName: HandlerName;
	method: Method;
	/** Controller basePath + route path, e.g. `/tags/:id`. */
	path: string;
	args: ResolvedRouteArg[];
	requestBodyDto?: ZodClass;
	requestQueryDto?: ZodClass;
	responseDto?: ResponseDtoClass;
	/** Success status declared via `@ApiResponse` - always present, see `resolveSuccessStatus`. */
	successStatus: SuccessStatus;
	apiKeyScope?: ApiKeyScopeRequirement;
	summary?: string;
	description?: string;
	tags?: string[];
	errorResponses?: number[];
}

/**
 * Iterates through every decorated (@Query/@Body/@Param) and non-decorated arguments of a route.
 * For `@Query` and `@Body` arguments, attaches the Zod schema associated with the argument.
 *
 * Throws eagerly when a `@Body`/`@Query` arg has no resolvable Zod DTO or when a route includes an
 * undecorated parameter after decorated parameters.
 */
export function resolveRouteArgs(
	controllerClass: Controller,
	handlerName: HandlerName,
	args: Arg[],
): ResolvedRouteArg[] {
	const argTypes = Reflect.getMetadata(
		'design:paramtypes',
		controllerClass.prototype as object,
		handlerName,
	) as unknown[] | undefined;

	const resolved: ResolvedRouteArg[] = [];
	let sawDecoratedArg = false;

	const paramCount = Math.max(args.length, argTypes?.length ?? 0);
	for (let index = 0; index < paramCount; index++) {
		const arg = args[index];

		if (!arg) {
			if (sawDecoratedArg) {
				throw new UnexpectedError(
					`Public API route ${controllerClass.name}.${handlerName} has an undecorated parameter ` +
						`at index ${index}, after an already-decorated one. Every parameter after the first ` +
						'@Param/@Body/@Query must also be decorated, or a later argument would silently bind ' +
						'to the wrong parameter.',
				);
			}
			continue;
		}

		sawDecoratedArg = true;

		if (arg.type === 'param') {
			resolved.push(arg);
			continue;
		}

		const paramType = argTypes?.[index] as ZodClass | undefined;
		if (!paramType || !('safeParse' in paramType)) {
			throw new UnexpectedError(
				`Public API route ${controllerClass.name}.${handlerName} is missing a Zod DTO for @${arg.type}`,
			);
		}

		resolved.push({ type: arg.type, dto: paramType });
	}

	return resolved;
}

/** Every decorator route must state its success status via `@ApiResponse`. */
export function resolveSuccessStatus(
	controllerName: string,
	handlerName: HandlerName,
	successStatus: SuccessStatus | undefined,
): SuccessStatus {
	if (successStatus === undefined) {
		throw new UnexpectedError(
			`Public API route ${controllerName}.${handlerName} does not declare a success status. Add ` +
				'`@ApiResponse(200, SomeDto)` if it returns a body, or `@ApiResponse(204)` if it does not.',
		);
	}

	return successStatus;
}

/**
 * Whether a set of granted API-key scopes satisfies a route's requirement. Single source of truth
 * for any/all semantics, shared by `PublicApiControllerRegistry` (enforcement) and
 * `discover.service` (visibility) so the two can't disagree about who may call a route.
 */
export function apiKeyScopesSatisfy(
	granted: readonly string[] | undefined,
	requirement: ApiKeyScopeRequirement,
): boolean {
	if (!granted) return false;

	if (typeof requirement === 'string') {
		return granted.includes(requirement);
	}

	if ('anyOf' in requirement) {
		return requirement.anyOf.some((scope) => granted.includes(scope));
	}

	return requirement.allOf.every((scope) => granted.includes(scope));
}

/** Every individual scope named by a requirement, regardless of any/all semantics. */
export function scopesInRequirement(requirement: ApiKeyScopeRequirement): readonly ApiKeyScope[] {
	if (typeof requirement === 'string') return [requirement];
	return 'anyOf' in requirement ? requirement.anyOf : requirement.allOf;
}

/**
 * Parses the comma-joined `x-required-scope` form back into a requirement. Legacy eov routes tag
 * their middleware with a flat string (see `publicApiCompositeScope`), which doesn't record whether
 * the scopes are any/all - the one composite route today defers the choice to the handler based on
 * the request payload, so a caller holding any listed scope can use it. `anyOf` matches that.
 */
export function scopeRequirementFromString(serialized: string): ApiKeyScopeRequirement {
	const scopes = serialized
		.split(',')
		.map((scope) => scope.trim())
		.filter(Boolean) as ApiKeyScope[];

	return scopes.length === 1 ? scopes[0] : { anyOf: scopes };
}

/**
 * Renders an `ApiKeyScopeRequirement` as the flat, comma-joined string the hand-written
 * `x-required-scope` YAML convention already uses (see `scope-parity.test.ts`'s `requiredScope`
 * parsing) — `anyOf`/`allOf` semantics aren't distinguished there today, so this doesn't invent a
 * new format, just matches the existing one.
 */
export function scopeRequirementToString(requirement: ApiKeyScopeRequirement): string {
	if (typeof requirement === 'string') {
		return requirement;
	}

	if ('anyOf' in requirement) {
		return requirement.anyOf.join(',');
	}

	return requirement.allOf.join(',');
}

/**
 * Renders an Express-style route path (`:param`) as the OpenAPI path template it documents (`{param}`)
 */
export function toOpenApiPathTemplate(path: string): string {
	return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

/**
 * Discovers every route registered on a `@PublicApiController` decorated class, resolving its
 * request/response DTOs and API-key scope from decorator metadata. This is the single source of
 * truth for "what does a decorator-routed public API endpoint look like".
 */
export function resolvePublicApiRoutes(): ResolvedPublicApiRoute[] {
	const metadata = Container.get(ControllerRegistryMetadata);
	const resolved: ResolvedPublicApiRoute[] = [];

	for (const controllerClass of metadata.controllerClasses) {
		const controllerMetadata = metadata.getControllerMetadata(controllerClass);
		if (!controllerMetadata.isPublicApi) {
			continue;
		}

		const prefix = controllerMetadata.basePath.replace(/\/+/g, '/').replace(/\/$/, '');

		for (const [handlerName, route] of controllerMetadata.routes) {
			const args = resolveRouteArgs(controllerClass, handlerName, route.args);
			const requestBodyDto = args.find((arg) => isDtoArg(arg, 'body'))?.dto;
			const requestQueryDto = args.find((arg) => isDtoArg(arg, 'query'))?.dto;

			const joined = `${prefix}${route.path}`.replace(/\/+/g, '/');
			const path = joined.length > 1 ? joined.replace(/\/$/, '') : joined || '/';

			resolved.push({
				controllerClass,
				controllerName: controllerClass.name,
				handlerName,
				method: route.method,
				path,
				args,
				requestBodyDto,
				requestQueryDto,
				responseDto: route.responseDto,
				successStatus: resolveSuccessStatus(controllerClass.name, handlerName, route.successStatus),
				apiKeyScope: route.apiKeyScope,
				summary: route.summary,
				description: route.description,
				tags: route.tags,
				errorResponses: route.errorResponses,
			});
		}
	}

	return resolved;
}
