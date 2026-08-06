import type {
	AgentEvalDatasetRecord,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	CreateAgentEvalRunPayload,
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
// per-case results stay out until something renders them.
//
// Cases are absent by design: they are rows of the dataset's Data Table, so they
// are read and written through the Data Table client rather than a route here.
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

// Resolves once the run is seeded, not once it finishes — a run executes the agent
// per case, so progress comes from polling the summary route below.
export const startRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
	payload: CreateAgentEvalRunPayload = {},
) => {
	return await makeRestApiRequest<AgentEvalRunRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`,
		payload,
	);
};

// Status and tallies with no per-case rows, which is what makes it cheap enough to
// poll. `counts.pending` folds `new` and `running`, so it reaching zero is exactly
// "settled" without reading the status enum.
export const getRunSummary = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
) => {
	return await makeRestApiRequest<AgentEvalRunSummary>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/runs/${runId}/summary`,
	);
};

// Newest first, and paginated because nothing caps how many runs a dataset
// accumulates. Read with `take: 1` to recover the in-flight run after a reload —
// without it a page refresh mid-run shows an idle view that never updates.
export const listRuns = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
	options: { skip?: number; take?: number } = {},
) => {
	return await makeRestApiRequest<AgentEvalRunList>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`,
		options,
	);
};
