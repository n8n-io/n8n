import { LICENSE_FEATURES } from '@n8n/constants';
import { ControllerRegistryMetadata, type Controller } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { PromotionReviewsController } from '../promotion-reviews.controller';

vi.mock('@/modules/n8n-packages/n8n-packages.service', () => ({
	N8nPackagesService: class {},
}));
vi.mock('@/services/folder.service', () => ({ FolderService: class {} }));

const { routes } = Container.get(ControllerRegistryMetadata).getControllerMetadata(
	PromotionReviewsController as Controller,
);

// No route has a scope decorator: the services check the role for each review, and the Inbox
// integration tests prove those checks. A new route fails here until it gets the same checks.
it('has only the routes whose services check the role for each review', () => {
	expect([...routes.keys()].sort()).toEqual(['approve', 'close', 'getChanges', 'getDetails']);
});

it.each([...routes])('%s needs a signed-in user and the license', (_handlerName, route) => {
	expect(route.skipAuth).toBe(false);
	expect(route.accessScope).toBeUndefined();
	expect(route.licenseFeature).toBe(LICENSE_FEATURES.PROMOTIONS);
});
