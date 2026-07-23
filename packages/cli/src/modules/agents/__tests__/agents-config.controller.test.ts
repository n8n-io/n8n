import { AgentsConfigController } from '../agents-config.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentsConfigController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsConfigController);

	const routes = getRoutesByHandlerName(AgentsConfigController);

	it.each([
		['getConfig', 'agent:read'],
		['putConfig', 'agent:update'],
		['deleteTool', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
