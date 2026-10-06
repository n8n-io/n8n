import { getRouteCases } from '@test/controller-route-metadata';

import { SelfHealingResultsController } from '../self-healing-results.controller';

describe('SelfHealingResultsController route access', () => {
	const routes = getRouteCases(SelfHealingResultsController);

	it('registers every review action and read', () => {
		expect(routes.map(({ route }) => route.path).sort()).toEqual([
			'/:resultId',
			'/:resultId/apply',
			'/:resultId/approve-and-publish',
			'/:resultId/discard',
			'/:resultId/dismiss',
		]);
	});

	it.each(routes)('$handlerName checks the required workflow scope', ({ handlerName, route }) => {
		expect(route.skipAuth).toBe(false);
		expect(route.licenseFeature).toBeUndefined();
		expect(route.accessScope).toEqual({
			scope: handlerName === 'approveAndPublish' ? 'workflow:publish' : 'workflow:update',
			globalOnly: false,
		});
	});
});
