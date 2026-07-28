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
	summary?: string;
	description?: string;
	tags?: string[];
	errorResponses?: number[];
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
 *
 * Also throws if an undecorated parameter follows an already-decorated one - whether it's sandwiched
 * between two decorated params (`(@Param('id') id, extra, @Body body)`) or trailing after the last one
 * (`(@Query() query, extra)`). `PublicApiControllerRegistry` invokes the handler as
 * `controller[handlerName](req, res, ...resolvedArgsInOrder)` - a compacted, gap-free list, so either
 * shape would silently bind a later decorated arg's value to the wrong parameter (or, in the trailing
 * case, just never notice `extra` exists). Since there's no legitimate reason for an undecorated
 * parameter after the first `@Param`/`@Body`/`@Query` (`req`/`res` are the only parameters this pattern
 * ever leaves undecorated, and they're always first), rejecting the signature is safer than trying to
 * preserve and thread the gap through both this function and the registry's call-building loop.
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

	// A plain indexed loop, not .forEach() - route.args is a sparse array (each @Param/@Body/@Query
	// assigns only its own parameter index), and .forEach() silently skips holes, which would hide
	// exactly the gap this function needs to detect. Bounded by the greater of args.length and
	// argTypes.length, not just args.length: a *trailing* undecorated parameter (e.g. `(@Query()
	// query, extra)`) never gets an index assigned at all, so it never extends the sparse array -
	// argTypes (one entry per actual declared parameter, decorated or not) is what catches it.
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
