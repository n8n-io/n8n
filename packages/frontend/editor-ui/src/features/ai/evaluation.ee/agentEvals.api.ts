import type {
	AgentEvalDatasetRecord,
	CreateAgentEvalDatasetDto,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
	UpdateAgentEvalDatasetPayload,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

// REST path helper, kept inline so callers can't build a URL that drifts from
// the routes in the agent-evals controller. Every route below it is gated
// per-user on `101_agent_evals` server-side as well as by `useAgentEvalsFlag`.
const evalsPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/evals`;

const datasetsPath = (projectId: string, agentId: string, datasetId?: string) =>
	`${evalsPath(projectId, agentId)}/datasets${datasetId ? `/${datasetId}` : ''}`;

export const getDatasets = async (context: IRestApiContext, projectId: string, agentId: string) => {
	return await makeRestApiRequest<AgentEvalDatasetRecord[]>(
		context,
		'GET',
		datasetsPath(projectId, agentId),
	);
};

export const getDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
) => {
	return await makeRestApiRequest<AgentEvalDatasetRecord>(
		context,
		'GET',
		datasetsPath(projectId, agentId, datasetId),
	);
};

export const createDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: CreateAgentEvalDatasetDto,
) => {
	return await makeRestApiRequest<AgentEvalDatasetRecord>(
		context,
		'POST',
		datasetsPath(projectId, agentId),
		payload as unknown as Record<string, unknown>,
	);
};

export const updateDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
	payload: UpdateAgentEvalDatasetPayload,
) => {
	return await makeRestApiRequest<AgentEvalDatasetRecord>(
		context,
		'PATCH',
		datasetsPath(projectId, agentId, datasetId),
		payload,
	);
};

export const deleteDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
) => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		datasetsPath(projectId, agentId, datasetId),
	);
};

// Drafts cases from the agent's own config and persists them as a new dataset,
// so the response carries both the dataset it created and the drafts to review.
export const generateDraftCases = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: GenerateDraftCasesOptions = {},
) => {
	return await makeRestApiRequest<GenerateDraftCasesResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/generate`,
		options,
	);
};
