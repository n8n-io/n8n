import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	AgentDebugInsightsResponse,
	AgentDebugRunDetail,
	AgentDebugRunsResponse,
	AgentReviewCase,
	AgentReviewCasesResponse,
	UpsertAgentReviewCaseDto,
} from '@n8n/api-types';

export const listAgentDebugRuns = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	limit: number,
	cursor?: string,
): Promise<AgentDebugRunsResponse> => {
	const params = new URLSearchParams({ limit: String(limit) });
	if (cursor) params.set('cursor', cursor);

	return await makeRestApiRequest<AgentDebugRunsResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/debug/runs?${params.toString()}`,
	);
};

export const getAgentDebugRunDetail = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
): Promise<AgentDebugRunDetail> => {
	return await makeRestApiRequest<AgentDebugRunDetail>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/debug/runs/${runId}`,
	);
};

export const getAgentDebugInsights = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
): Promise<AgentDebugInsightsResponse> => {
	return await makeRestApiRequest<AgentDebugInsightsResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/debug/insights`,
	);
};

export const listAgentDebugReviewCases = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	limit: number,
	cursor?: string,
): Promise<AgentReviewCasesResponse> => {
	const params = new URLSearchParams({ limit: String(limit) });
	if (cursor) params.set('cursor', cursor);

	return await makeRestApiRequest<AgentReviewCasesResponse>(
		context,
		'GET',
		`/projects/${projectId}/agents/v2/${agentId}/debug/reviews?${params.toString()}`,
	);
};

export const upsertAgentDebugRunReview = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
	payload: UpsertAgentReviewCaseDto,
): Promise<AgentReviewCase> => {
	return await makeRestApiRequest<AgentReviewCase>(
		context,
		'PUT',
		`/projects/${projectId}/agents/v2/${agentId}/debug/runs/${runId}/review`,
		payload,
	);
};

export const deleteAgentDebugRunReview = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
): Promise<{ ok: true }> => {
	return await makeRestApiRequest<{ ok: true }>(
		context,
		'DELETE',
		`/projects/${projectId}/agents/v2/${agentId}/debug/runs/${runId}/review`,
	);
};
