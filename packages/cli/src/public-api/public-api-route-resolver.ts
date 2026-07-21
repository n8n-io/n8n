import type { ZodClass } from '@n8n/api-types';
import type {
	ApiKeyScopeRequirement,
	Arg,
	Controller,
	HandlerName,
	Method,
	ResponseDtoClass,
} from '@n8n/decorators';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

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
	apiKeyScope?: ApiKeyScopeRequirement;
	description?: string;
}

/**
 * Resolves each route argument's declared type via TypeScript's own `design:paramtypes`
 * reflection metadata. Reads off `controllerClass.prototype` rather than a DI-resolved instance —
 * decorator metadata lives on the prototype, and this lets doc generation (which has no DB,
 * config, or other business-service dependencies available) resolve routes without instantiating
 * the controller or any of its constructor dependencies.
 *
 * Throws eagerly (matching what a request would eventually hit) when a `@Body`/`@Query` arg has
 * no resolvable Zod DTO — a controller like this errors on every request already, so surfacing it
 * at resolution time (route registration, or doc generation) catches the bug earlier than the
 * first live request would.
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

	args.forEach((arg, index) => {
		if (!arg) return;

		if (arg.type === 'param') {
			resolved.push(arg);
			return;
		}

		const paramType = argTypes?.[index] as ZodClass | undefined;
		if (!paramType || !('safeParse' in paramType)) {
			throw new UnexpectedError(
				`Public API route ${controllerClass.name}.${handlerName} is missing a Zod DTO for @${arg.type}`,
			);
		}

		resolved.push({ type: arg.type, dto: paramType });
	});

	return resolved;
}

/**
 * Renders an `ApiKeyScopeRequirement` as the flat, comma-joined string the hand-written
 * `x-required-scope` YAML convention already uses (see `scope-parity.test.ts`'s `requiredScope`
 * parsing) — `anyOf`/`allOf` semantics aren't distinguished there today, so this doesn't invent a
 * new format, just matches the existing one.
 */
export function scopeRequirementToString(requirement: ApiKeyScopeRequirement): string {
	if (typeof requirement === 'string') return requirement;
	if ('anyOf' in requirement) return requirement.anyOf.join(',');
	return requirement.allOf.join(',');
}

/**
 * Discovers every route registered on a `@PublicApiController`-decorated class, resolving its
 * request/response DTOs and API-key scope from decorator metadata. This is the single source of
 * truth for "what does a decorator-routed public API endpoint look like" — both
 * `PublicApiControllerRegistry` (runtime routing) and the OpenAPI generator (`openapi-gen/`) call
 * this instead of maintaining separate copies of the same reflection logic.
 */
export function resolvePublicApiRoutes(): ResolvedPublicApiRoute[] {
	const metadata = Container.get(ControllerRegistryMetadata);
	const resolved: ResolvedPublicApiRoute[] = [];

	for (const controllerClass of metadata.controllerClasses) {
		const controllerMetadata = metadata.getControllerMetadata(controllerClass);
		if (!controllerMetadata.isPublicApi) continue;

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
				apiKeyScope: route.apiKeyScope,
				description: route.description,
			});
		}
	}

	return resolved;
}
