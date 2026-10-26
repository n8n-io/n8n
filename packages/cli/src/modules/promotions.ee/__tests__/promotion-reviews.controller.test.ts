import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PromotionReviewsController } from '../promotion-reviews.controller';

const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	PromotionReviewsController as Controller,
);

// A route added later without a scope here fails.
const expectedScopes: Record<string, string> = {
	approve: 'gitConnection:approveReviews',
	getChanges: 'gitConnection:readReviews',
	getDetails: 'gitConnection:readReviews',
};

it.each([...routes])('%s needs a signed-in user with its global scope', (handlerName, route) => {
	expect(route.skipAuth).toBe(false);
	expect(route.accessScope).toEqual({ scope: expectedScopes[handlerName], globalOnly: true });
	expect(route.licenseFeature).toBe(LICENSE_FEATURES.GIT_CONNECTIONS);
});
