import { getRouteCases } from '@test/controller-route-metadata';

export {
	getControllerMetadata,
	getRouteCases,
	getRoutesByHandlerName,
} from '@test/controller-route-metadata';

type ControllerClass = new (...args: never[]) => unknown;

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
