import type { SelfHealingResultActionResponse, SelfHealingResultDetail } from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { InboxSelection } from '../inbox.constants';

export type SelfHealingSelection = Extract<InboxSelection, { type: 'self_healing_result' }>;
export type SelfHealingReviewAction = 'apply' | 'approve-and-publish' | 'dismiss';
export type SelfHealingResultAction = Exclude<SelfHealingReviewAction, 'apply'> | 'editor' | 'chat';
/** Fields the result view reads from the normal workflow endpoint. */
export type SelfHealingResultWorkflowMetadata = { name: string; scopes: string[] };
/** Unknown while workflow permissions load or after they fail to load. */
export type SelfHealingPublishAccess = 'allowed' | 'denied' | 'unknown';

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
