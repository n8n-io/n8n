import type {
	AgentEvalDatasetRecord,
	AgentEvalRatingRecord,
	AgentEvalRunDetail,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	CreateAgentEvalRatingPayload,
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
// create/update/delete belong with the dataset-management UI that uses them.
const evalsPath = (projectId: string, agentId: string) =>
	`/projects/${projectId}/agents/v2/${agentId}/evals`;

/** `take`/`skip` reach the server as query params — see `makeRestApiRequest`. */
type PageQuery = { take?: number; skip?: number };

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

// Newest first, and unbounded over a dataset's life — every "Run all" adds one —
// so callers window it rather than reading the lot.
export const listRuns = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
	query: PageQuery = {},
) => {
	return await makeRestApiRequest<AgentEvalRunList>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`,
		query,
	);
};

// `take`/`skip` page the run's cases, not the run itself: each case carries its
// full input/output JSON, so a wide run arrives over several reads.
export const getRunDetail = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
	query: PageQuery = {},
) => {
	return await makeRestApiRequest<AgentEvalRunDetail>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/runs/${runId}`,
		query,
	);
};

// Status plus tallies, no per-case rows — the shape to poll while a run is in flight.
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

// The newest rating per rated case, for the whole run in one read — what
// reopening a run hydrates from. The per-case history route
// (`GET /results/:resultId/ratings`) is deliberately absent: the review view
// renders only the latest rating, so binding it would be dead code.
export const listLatestRatingsForRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
) => {
	return await makeRestApiRequest<AgentEvalRatingRecord[]>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/runs/${runId}/ratings`,
	);
};

// Ratings are append-only, so this records a new one rather than editing the
// previous vote. The response is the row that now counts as the case's latest.
export const rateResult = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	resultId: string,
	payload: CreateAgentEvalRatingPayload,
) => {
	return await makeRestApiRequest<AgentEvalRatingRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/results/${resultId}/ratings`,
		payload,
	);
};

// Runs the dataset's cases against the agent's current config. `agentVersionId`
// is omitted deliberately — the API rejects it until the runner can execute a
// published snapshot.
/** Names a hand-written check from its content. */
export const nameCheck = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	payload: { input: string; whatToCheck: string },
) => {
	return await makeRestApiRequest<{ name: string }>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/checks/name`,
		payload,
	);
};

export const startRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
	payload: { rowIds?: string[] } = {},
) => {
	return await makeRestApiRequest<AgentEvalRunRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`,
		payload,
	);
};

// Asks the runner to stop; the cases already in flight settle on their own, so the
// caller keeps polling the summary until nothing is pending. Gated on `agent:update`
// server-side rather than `agent:execute` — cancelling stops work someone else may
// have started, which is a write.
export const cancelRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	runId: string,
) => {
	return await makeRestApiRequest<AgentEvalRunRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/runs/${runId}/cancel`,
	);
};
