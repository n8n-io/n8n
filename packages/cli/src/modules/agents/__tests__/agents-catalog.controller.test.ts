import { AgentsCatalogController } from '../agents-catalog.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentsCatalogController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsCatalogController);

	const routes = getRoutesByHandlerName(AgentsCatalogController);

	it.each([
		['getModelCatalog', 'agent:read'],
		['listIntegrations', 'agent:read'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
