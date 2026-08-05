import type { NavigationGuardWithThis, RouteLocationNormalized } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { WorkflowReviewsModule } from './module.descriptor';

const feature = vi.hoisted(() => ({ enabled: false }));

vi.mock('./composables/useWorkflowReviewsFeature', () => ({
	useWorkflowReviewsFeature: () => ({
		isWorkflowReviewsEnabled: { value: feature.enabled },
	}),
}));

function enterRoute() {
	const [route] = WorkflowReviewsModule.routes ?? [];
	const beforeEnter = route?.beforeEnter as NavigationGuardWithThis<undefined> | undefined;
	if (!beforeEnter) throw new Error('the review route has no beforeEnter guard');

	const location = {} as RouteLocationNormalized;
	return beforeEnter.call(undefined, location, location, vi.fn());
}

describe('WorkflowReviewsModule route guard', () => {
	it('redirects to not-found while the feature is disabled', () => {
		feature.enabled = false;

		expect(enterRoute()).toEqual({ name: VIEWS.NOT_FOUND });
	});

	it('lets the route through once the feature is enabled', () => {
		feature.enabled = true;

		expect(enterRoute()).toBe(true);
	});
});
