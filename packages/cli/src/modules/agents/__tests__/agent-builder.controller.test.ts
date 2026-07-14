import { AgentBuilderController } from '../agent-builder.controller.js';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata.js';

describe('AgentBuilderController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentBuilderController);

	const routes = getRoutesByHandlerName(AgentBuilderController);

	it.each([
		['getBuilderMessages', 'agent:read'],
		['clearBuilderMessages', 'agent:update'],
		['build', 'agent:update'],
		['buildResume', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
