import { AgentsSkillsController } from '../agents-skills.controller.js';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata.js';

describe('AgentsSkillsController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentsSkillsController);

	const routes = getRoutesByHandlerName(AgentsSkillsController);

	it.each([
		['listSkills', 'agent:read'],
		['getSkill', 'agent:read'],
		['createSkill', 'agent:update'],
		['updateSkill', 'agent:update'],
		['deleteSkill', 'agent:update'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});
