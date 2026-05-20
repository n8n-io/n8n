import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AgentDebugController } from '../agent-debug.controller';

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentDebugController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

const writeHandlers = new Set(['upsertRunReview', 'deleteRunReview']);

describe('AgentDebugController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by the expected project-scoped agent check',
		({ handlerName, route }) => {
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope).toBe(
				writeHandlers.has(handlerName) ? 'agent:update' : 'agent:read',
			);
		},
	);
});
