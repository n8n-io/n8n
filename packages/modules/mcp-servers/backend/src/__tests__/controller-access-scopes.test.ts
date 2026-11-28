import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { McpServerToolsController } from '../controllers/mcp-server-tools.controller';
import { McpServersListController } from '../controllers/mcp-servers-list.controller';
import { McpServersController } from '../controllers/mcp-servers.controller';
import { McpServerRuntimeController } from '../controllers/mcp-server-runtime.controller';

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

describe('McpServerToolsController route access scopes', () => {
	// Reading one tool needs `read`; the picker and every write route need `update`.
	const READ_HANDLERS = new Set(['get']);

	it.each(routesOf(McpServerToolsController))(
		'$handlerName is gated by its expected project-scoped mcpServer:* check',
		({ handlerName, route }) => {
			expect(route.skipAuth).toBeFalsy();
			const expectedScope = READ_HANDLERS.has(handlerName) ? 'mcpServer:read' : 'mcpServer:update';
			expect(route.accessScope).toEqual({ scope: expectedScope, globalOnly: false });
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

describe('McpServerRuntimeController routes', () => {
	// The token check runs in the handler, so the routes skip the session and get an IP limit.
	it.each(routesOf(McpServerRuntimeController))(
		'$handlerName skips the session, has no scope, and has an IP rate limit',
		({ route }) => {
			expect(route.skipAuth).toBe(true);
			expect(route.accessScope).toBeUndefined();
			expect(route.ipRateLimit).toEqual({ limit: 100 });
		},
	);
});
