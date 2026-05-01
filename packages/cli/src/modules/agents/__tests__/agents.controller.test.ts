import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { AgentsController } from '../agents.controller';

// The webhook route is the single exception: it is `skipAuth: true` (no
// req.user) and authenticates inbound third-party callbacks via per-platform
// signature verification inside the handler.
const UNAUTHENTICATED_HANDLERS = new Set(['handleWebhook']);

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	AgentsController as never,
);

const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
	handlerName,
	route,
}));

describe('AgentsController route access scopes', () => {
	it.each(routeCases)(
		'$handlerName is gated by a project-scoped agent:* check',
		({ handlerName, route }) => {
			if (UNAUTHENTICATED_HANDLERS.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				expect(route.skipAuth).toBe(true);
				return;
			}

			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('agent:')).toBe(true);
		},
	);

	it.each([
		['listSkills', 'agent:read'],
		['getSkill', 'agent:read'],
		['createSkill', 'agent:update'],
		['updateSkill', 'agent:update'],
		['deleteSkill', 'agent:update'],
		['revertToPublished', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(metadata.routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
