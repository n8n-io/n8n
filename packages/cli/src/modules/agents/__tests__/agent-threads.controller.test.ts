import { AgentThreadsController } from '../agent-threads.controller';
import {
	getControllerMetadata,
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentThreadsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentThreadsController);

	const routes = getRoutesByHandlerName(AgentThreadsController);

	it('uses a project-level agent threads collection route', () => {
		const metadata = getControllerMetadata(AgentThreadsController);

		expect(metadata.basePath).toBe('/projects/:projectId/agent-threads/v2');
	});

	it.each([
		['listThreads', 'get', '/'],
		['getThread', 'get', '/:threadId'],
		['deleteThread', 'delete', '/:threadId'],
	])('%s uses %s %s', (handlerName, method, path) => {
		expect(routes.get(handlerName)).toMatchObject({ method, path });
		expect(routes.get(handlerName)?.path).not.toContain('/threads');
	});

	it.each([
		['listThreads', 'agent:read'],
		['getThread', 'agent:read'],
		['deleteThread', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
