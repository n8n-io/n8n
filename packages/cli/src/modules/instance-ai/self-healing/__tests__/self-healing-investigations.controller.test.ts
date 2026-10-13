import { getRouteCases } from '@test/controller-route-metadata';

import { SelfHealingInvestigationsController } from '../self-healing-investigations.controller';

describe('SelfHealingInvestigationsController', () => {
	const routes = getRouteCases(SelfHealingInvestigationsController);

	it('exposes only a status read', () => {
		expect(routes.map(({ route }) => route.path)).toEqual(['/:investigationId']);
	});

	it.each(routes)('$handlerName requires workflow edit access', ({ route }) => {
		expect(route.skipAuth).toBe(false);
		expect(route.accessScope).toEqual({ scope: 'workflow:update', globalOnly: false });
	});
});
