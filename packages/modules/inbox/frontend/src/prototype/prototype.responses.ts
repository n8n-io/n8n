import {
	promotionResourceDetails,
	promotionReviewChanges,
	promotionReviewItem,
	selfHealingDetail,
	selfHealingItem,
	selfHealingWorkflow,
	workflowReviewActivity,
	workflowReviewDetail,
	workflowReviewItem,
} from './prototype.fixtures';

const selfHealingPath = `/projects/${selfHealingItem.projectId}/workflows/${selfHealingItem.workflowId}/self-healing-results/${selfHealingItem.id}`;

/** The read requests of the real detail views, by method and path below the REST base URL. */
const responses: Record<string, unknown> = {
	[`GET /workflow-review-requests/${workflowReviewItem.id}`]: workflowReviewDetail,
	[`GET /workflow-review-requests/${workflowReviewItem.id}/activity`]: workflowReviewActivity,
	[`GET ${selfHealingPath}`]: selfHealingDetail,
	[`GET /workflows/${selfHealingItem.workflowId}`]: selfHealingWorkflow,
	[`GET /promotions/reviews/${promotionReviewItem.id}/changes`]: promotionReviewChanges,
	[`POST /promotions/reviews/${promotionReviewItem.id}/changes/details`]: {
		details: promotionResourceDetails,
		missingKeys: [],
	},
};

/**
 * Returns the sample response for a request, or `undefined` when the request is not for a
 * prototype item. The path can carry the REST base URL and a query string.
 */
export function prototypeResponse(method: string, url: string): unknown {
	const { pathname } = new URL(url, 'http://prototype.invalid');
	const path = pathname.replace(/^.*?\/rest(?=\/)/, '');
	return responses[`${method.toUpperCase()} ${path}`];
}
