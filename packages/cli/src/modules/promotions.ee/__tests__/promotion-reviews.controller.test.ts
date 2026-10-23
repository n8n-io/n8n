import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PromotionReviewsController } from '../promotion-reviews.controller';

describe('PromotionReviewsController route access scopes', () => {
	const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
		PromotionReviewsController as Controller,
	);

	it('gates approve behind gitConnection:approveReviews', () => {
		expect(routes.get('approve')?.accessScope).toEqual({
			scope: 'gitConnection:approveReviews',
			globalOnly: true,
		});
	});

	// Fails when a later route forgets its scope.
	it.each([...routes.entries()])('%s has a global gitConnection scope', (_handler, route) => {
		expect(route.accessScope?.globalOnly).toBe(true);
		expect(route.accessScope?.scope).toMatch(/^gitConnection:/);
	});
});
