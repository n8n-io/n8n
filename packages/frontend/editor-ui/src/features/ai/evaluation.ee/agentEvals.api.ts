import type {
	AgentEvalDatasetRecord,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

// REST path helper, kept inline so callers can't build a URL that drifts from
// the routes in the agent-evals controller. Every route below it is gated
// per-user on `101_agent_evals` server-side as well as by `useAgentEvalsFlag`.
//
// Reads the eval surface needs to render itself, and nothing more. Dataset
// create/update/delete belong with the dataset-management UI that uses them;
// run and result reads wait on their paginated response shapes.
const evalsPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/evals`;

export const getDatasets = async (context: IRestApiContext, projectId: string, agentId: string) => {
	return await makeRestApiRequest<AgentEvalDatasetRecord[]>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/datasets`,
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
