import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AgentEvaluationsController } from '../agent-evaluations.controller';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentEvaluationsController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('AgentEvaluationsController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by a project-scoped agent check',
		({ handlerName, route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe(
				handlerName === 'runSuite' ? 'agent:execute' : 'agent:read',
			);
		},
	);
});
