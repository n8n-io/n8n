import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { WorkflowDependencyController } from '../workflow-dependency.controller';

/**
 * Routes that take resource ids in the body instead of a `:projectId` path param, so no
 * `@ProjectScope` can bind. They authorize per resource inside
 * `WorkflowDependencyQueryService.filterByAccess` instead. Do not add to this list: a new route
 * belongs under `/projects/:projectId/...` with a scope decorator.
 */
const SERVICE_FILTERED_HANDLERS = new Set([
	'getResourceDependencyCounts',
	'getResourceDependencies',
]);

const EXPECTED_SCOPES: Record<string, string> = {
	getFolderDependencies: 'folder:read',
};

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	WorkflowDependencyController as never,
);
const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('WorkflowDependencyController route access scopes', () => {
	it.each(routeCases)('$handlerName is gated as expected', ({ handlerName, route }) => {
		if (SERVICE_FILTERED_HANDLERS.has(handlerName)) {
			expect(route.accessScope).toBeUndefined();
			return;
		}

		expect(route.accessScope).toBeDefined();
		expect(route.accessScope?.globalOnly).toBe(false);
		expect(route.accessScope?.scope).toBe(EXPECTED_SCOPES[handlerName]);
	});

	it('covers every handler on the controller', () => {
		const handlerNames = routeCases.map((route) => route.handlerName).sort();

		expect(handlerNames).toEqual(
			[...SERVICE_FILTERED_HANDLERS, ...Object.keys(EXPECTED_SCOPES)].sort(),
		);
	});
});
