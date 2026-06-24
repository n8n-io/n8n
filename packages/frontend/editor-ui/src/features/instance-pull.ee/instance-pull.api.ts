import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { ReviewSummary, WorkflowDiffPayload } from '@n8n/api-types';

/** Dev instance: PRs this instance has raised ("My publish requests"). */
export async function getMyReviews(context: IRestApiContext): Promise<ReviewSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-pull/my-reviews');
}

/** Prd instance: the publish diff (current vs incoming) for a PR. */
export async function getWorkflowDiff(
	context: IRestApiContext,
	prNumber: number,
): Promise<WorkflowDiffPayload> {
	return await makeRestApiRequest(context, 'GET', `/instance-pull/diff/${prNumber}`);
}

/** Prd instance: incoming PRs awaiting validation/publish ("Incoming publish requests"). */
export async function getRequests(context: IRestApiContext): Promise<ReviewSummary[]> {
	return await makeRestApiRequest(context, 'GET', '/instance-pull/requests');
}
