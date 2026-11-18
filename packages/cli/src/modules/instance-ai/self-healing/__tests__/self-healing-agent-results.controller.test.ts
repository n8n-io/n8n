import { getRouteCases } from '@test/controller-route-metadata';

import { SelfHealingAgentResultsController } from '../agents/self-healing-agent-results.controller';

describe('SelfHealingAgentResultsController route access', () => {
	const routes = getRouteCases(SelfHealingAgentResultsController);

	it('registers the read and each review action', () => {
		expect(routes.map(({ route }) => route.path).sort()).toEqual([
			'/:resultId',
			'/:resultId/apply',
			'/:resultId/dismiss',
		]);
	});

	it.each(routes)('$handlerName checks the required agent scope', ({ handlerName, route }) => {
		expect(route.skipAuth).toBe(false);
		expect(route.licenseFeature).toBeUndefined();
		expect(route.accessScope).toEqual({
			scope: handlerName === 'getDetail' ? 'agent:read' : 'agent:update',
			globalOnly: false,
		});
	});
});
