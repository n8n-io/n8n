import { getRouteCases } from '@test/controller-route-metadata';

import { WorkflowReviewRequestsController } from '../workflow-review-requests.controller';

/**
 * Every route here is keyed by a review id, from which `@ProjectScope` cannot resolve a
 * project — it would throw — and `@GlobalScope` would lock out the project members who
 * must read. Authorization therefore lives in the services, and this list makes that an
 * enforced decision rather than an omission.
 */
const serviceGatedHandlers = new Set([
	'list',
	'getEligibleReviewers',
	'create',
	'updateVersion',
	'decide',
	'listInbox',
	'getSummary',
	'listActivity',
	'createComment',
	'getDetail',
]);

describe('WorkflowReviewRequestsController route access', () => {
	const routeCases = getRouteCases(WorkflowReviewRequestsController);

	it.each(routeCases)('$handlerName carries the review license gate', ({ route }) => {
		expect(route.licenseFeature).toBe('feat:workflowReviews');
		expect(route.skipAuth).toBe(false);
	});

	it.each(routeCases)(
		'$handlerName is guarded either by a route scope or by its service',
		({ handlerName, route }) => {
			if (serviceGatedHandlers.has(handlerName)) {
				expect(route.accessScope).toBeUndefined();
				return;
			}

			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.globalOnly).toBe(false);
		},
	);
});
