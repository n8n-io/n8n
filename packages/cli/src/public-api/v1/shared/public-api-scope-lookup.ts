import type { ApiKeyScopeRequirement } from '@n8n/decorators';
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { ApiKeyScope } from '@n8n/permissions';

import type { ScopeTaggedMiddleware } from './middlewares/global.middleware';

/** Collapse OpenAPI `{id}` / Express `:id` params so controller and YAML paths can match. */
function normalizePath(pathStr: string): string {
	return (
		pathStr
			.replace(/\{[^}]+\}/g, '{}')
			.replace(/:[^/]+/g, '{}')
			.replace(/\/+/g, '/')
			.replace(/\/$/, '') || '/'
	);
}

function joinPaths(basePath: string, routePath: string): string {
	const base = basePath.replace(/\/$/, '') || '';
	if (routePath === '/' || routePath === '') {
		return base || '/';
	}
	return `${base}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
}

function serializeScope(requirement: ApiKeyScopeRequirement | undefined): string | undefined {
	if (requirement === undefined) return undefined;
	if (typeof requirement === 'string') return requirement;
	return ('anyOf' in requirement ? requirement.anyOf : requirement.allOf).join(',');
}

export function publicApiRouteKey(method: string, pathStr: string): string {
	return `${method.toLowerCase()} ${normalizePath(pathStr)}`;
}

/**
 * Map of `method path` → serialized `@ApiKeyScope` for every `@PublicApiController` route.
 * Controllers must already be side-effect-imported so their metadata is registered.
 *
 * Value `undefined` means the route exists and declares no API-key scope (`none`).
 */
export function loadPublicControllerScopeMap(): Map<string, string | undefined> {
	const map = new Map<string, string | undefined>();
	const metadata = Container.get(ControllerRegistryMetadata);

	for (const controllerClass of metadata.controllerClasses) {
		const controller = metadata.getControllerMetadata(controllerClass);
		if (!controller.isPublicApi) continue;

		for (const route of controller.routes.values()) {
			if (!route.method || route.path === undefined) continue;
			map.set(
				publicApiRouteKey(route.method, joinPaths(controller.basePath, route.path)),
				serializeScope(route.apiKeyScope),
			);
		}
	}

	return map;
}

export function extractScopeFromEovHandlerChain(handlerChain: unknown[]): ApiKeyScope | undefined {
	for (const middleware of handlerChain) {
		if (typeof middleware !== 'function' || !('__apiKeyScope' in middleware)) continue;
		return (middleware as ScopeTaggedMiddleware).__apiKeyScope;
	}
	return undefined;
}

/**
 * Prefer `@PublicApiController` `@ApiKeyScope`, then fall back to eov `__apiKeyScope`.
 * Uses `.has()` so a controller route with scope `none` (`undefined`) is not overridden by eov.
 */
export function resolvePublicApiImplementedScope(
	controllerScopes: Map<string, string | undefined>,
	method: string,
	pathStr: string,
	eovHandlerScope?: ApiKeyScope,
): string | undefined {
	const key = publicApiRouteKey(method, pathStr);
	return controllerScopes.has(key) ? controllerScopes.get(key) : eovHandlerScope;
}
