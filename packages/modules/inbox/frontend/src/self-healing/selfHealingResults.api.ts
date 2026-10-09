import type {
	SelfHealingResultActionResponse,
	SelfHealingResultDetail,
	SelfHealingResultWorkflowMetadata,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { InboxSelection } from '../inbox.constants';

export type SelfHealingSelection = Extract<InboxSelection, { type: 'self_healing_result' }>;
export type SelfHealingReviewAction = 'approve-and-publish' | 'apply' | 'dismiss';

function resultPath({ projectId, workflowId, id }: SelfHealingSelection) {
	return `/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(workflowId)}/self-healing-results/${encodeURIComponent(id)}`;
}

export async function fetchSelfHealingResult(
	context: IRestApiContext,
	selection: SelfHealingSelection,
): Promise<SelfHealingResultDetail> {
	return await makeRestApiRequest(context, 'GET', resultPath(selection));
}

export async function reviewSelfHealingResult(
	context: IRestApiContext,
	selection: SelfHealingSelection,
	action: SelfHealingReviewAction,
): Promise<SelfHealingResultActionResponse> {
	return await makeRestApiRequest(context, 'POST', `${resultPath(selection)}/${action}`);
}

export async function fetchResultWorkflow(
	context: IRestApiContext,
	workflowId: string,
): Promise<SelfHealingResultWorkflowMetadata> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${encodeURIComponent(workflowId)}`);
}
