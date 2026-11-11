import { getRouteCases } from '@test/controller-route-metadata';

import { WorkflowReviewPolicyController } from '../workflow-review-policy.controller';

describe('WorkflowReviewPolicyController route access', () => {
	const routeCases = getRouteCases(WorkflowReviewPolicyController);

	it.each(routeCases)(
		'$handlerName carries the review license and a project scope',
		({ route }) => {
			expect(route.licenseFeature).toBe('feat:workflowReviews');
			expect(route.skipAuth).toBe(false);
			expect(route.accessScope).toBeDefined();
			expect(route.accessScope?.scope).toMatch(/^(project|workflow):/);
		},
	);
});
