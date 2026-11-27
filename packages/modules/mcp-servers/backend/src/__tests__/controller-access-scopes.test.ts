import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { McpServersListController } from '../controllers/mcp-servers-list.controller';
import { McpServersController } from '../controllers/mcp-servers.controller';

function routesOf(controller: object) {
	const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		controller as never,
	);
	return Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
		handlerName,
		route,
	}));
}

// A new route without a scope fails here, so it cannot open a project's servers by mistake.
describe('McpServersController route access scopes', () => {
	it.each(routesOf(McpServersController))(
		'$handlerName is gated by a project-scoped mcpServer:* check',
		({ route }) => {
			expect(route.skipAuth).toBeFalsy();
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
			expect(route.accessScope?.scope.startsWith('mcpServer:')).toBe(true);
		},
	);
});

describe('McpServersListController route access scopes', () => {
	// The route has no project id. The service lists only projects with `mcpServer:list`.
	it.each(routesOf(McpServersListController))(
		'$handlerName needs a signed-in user and has no route scope',
		({ route }) => {
			expect(route.skipAuth).toBeFalsy();
			expect(route.accessScope).toBeUndefined();
		},
	);
});
