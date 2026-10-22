import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PromotionReviewsController } from '../promotion-reviews.controller';

// A route added later without the scope fails here.
const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	PromotionReviewsController as Controller,
);

it.each([...routes])(
	'%s needs a signed-in user with the global scope to read reviews',
	(_handlerName, route) => {
		expect(route.skipAuth).toBe(false);
		expect(route.accessScope).toEqual({ scope: 'gitConnection:readReviews', globalOnly: true });
		expect(route.licenseFeature).toBe(LICENSE_FEATURES.GIT_CONNECTIONS);
	},
);
