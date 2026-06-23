import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

type ControllerClass = new (...args: never[]) => unknown;

export function getControllerMetadata(Controller: ControllerClass) {
	return Container.get(ControllerRegistryMetadata).getControllerMetadata(Controller as never);
}

export function getRouteCases(Controller: ControllerClass) {
	const metadata = getControllerMetadata(Controller);
	return Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));
}

export function getRoutesByHandlerName(Controller: ControllerClass) {
	return new Map(getRouteCases(Controller).map(({ handlerName, route }) => [handlerName, route]));
}

export function expectProjectScopedAgentRoutes(
	Controller: ControllerClass,
	unauthenticatedHandlers = new Set<string>(),
) {
	it.each(getRouteCases(Controller))(
		'$handlerName is gated by a project-scoped agent:* check',
		({ handlerName, route }) => {
			if (unauthenticatedHandlers.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				expect(route.skipAuth).toBe(true);
				return;
			}

			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('agent:')).toBe(true);
		},
	);
}
