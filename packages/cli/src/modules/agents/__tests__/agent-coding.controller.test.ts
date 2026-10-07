import { AgentCodingController } from '../agent-coding.controller';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

describe('AgentCodingController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentCodingController);

	it('requires agent execution access to start a chat', () => {
		const routes = getRoutesByHandlerName(AgentCodingController);
		expect(routes.get('createChat')?.accessScope?.scope).toBe('agent:execute');
	});
});
