import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { McpServerToolsController } from '../controllers/mcp-server-tools.controller';
import { McpServersListController } from '../controllers/mcp-servers-list.controller';
import { McpServersController } from '../controllers/mcp-servers.controller';
import { McpServerRuntimeController } from '../runtime/mcp-server-runtime.controller';

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
	// The picker is part of the editor, so its read route also needs `update`.
	it.each(routesOf(McpServerToolsController))(
		'$handlerName is gated by a project-scoped mcpServer:update check',
		({ route }) => {
			expect(route.skipAuth).toBeFalsy();
			expect(route.accessScope).toEqual({ scope: 'mcpServer:update', globalOnly: false });
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
