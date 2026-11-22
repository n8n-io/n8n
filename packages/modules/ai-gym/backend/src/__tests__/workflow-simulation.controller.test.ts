import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { describe, expect, it } from 'vitest';

import { WorkflowSimulationController } from '../workflow-simulation.controller';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	WorkflowSimulationController as never,
);
const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('WorkflowSimulationController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by a project-scoped workflow:execute check',
		({ route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe('workflow:execute');
		},
	);
});
