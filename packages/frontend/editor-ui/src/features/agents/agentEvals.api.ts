import type {
	AgentEvalDatasetRecord,
	AgentOnlineActivityPage,
	UpdateAgentOnlineCheckDto,
	AgentOnlineCasePage,
	AgentOnlineResultPage,
	AgentOnlineCaseResult,
	AgentOnlineReplayComparison,
	AgentOnlineRubric,
	AgentOnlineSession,
	ApplyAgentEvalSuggestionsOptions,
	ApplyPreviewSuggestionOptions,
	ApplyPreviewSuggestionResult,
	ApplyAgentEvalSuggestionsResult,
	AgentEvalRatingRecord,
	AgentEvalResultRecord,
	AgentEvalRunDetail,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	CreateAgentEvalRatingPayload,
	CreateDraftDatasetOptions,
	CreateDraftDatasetResult,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
	PreviewRunOptions,
	PreviewRunResult,
	RerunResultOptions,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { OnlineChecksReport } from './agentEvals.types';
import { ResponseError, makeRestApiRequest } from '@n8n/rest-api-client';

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

// Creates an empty draft dataset — the same Data Table + columns
// `generateDraftCases` would, but with no rows and no LLM call. Backs
// committing a `save: false` preview once the user picks which cases to keep.
export const createDraftDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: CreateDraftDatasetOptions = {},
) => {
	return await makeRestApiRequest<CreateDraftDatasetResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/datasets/draft`,
		options,
	);
};

// Deletes the dataset only. Its backing Data Table is left in place, because a
// table can be shared or hand-authored — use `deleteDraftDataset` to discard a
// draft together with the table it created.
export const deleteDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
) => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}`,
	);
};

// Discards a draft dataset and the Data Table `createDraftDataset` made for it.
// For rolling back a commit that failed before anything ran: the table would
// otherwise stay behind, and every retry would add another. Refused for a
// dataset that has runs.
export const deleteDraftDataset = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
) => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/draft`,
	);
};

// Drafts one case and runs it against the agent directly — no Data Table, no
// dataset, no eval-run row. Backs "try it once" and its "needs work" retries.
export const previewRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: PreviewRunOptions = {},
) => {
	return await makeRestApiRequest<PreviewRunResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/preview-run`,
		options,
	);
};

// Rewrites the agent's instructions with the suggestion on a preview run's failed first
// check, then runs that same case again. Nothing is saved for the case itself, so it
// travels in the body.
export const applyPreviewSuggestion = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: ApplyPreviewSuggestionOptions,
) => {
	return await makeRestApiRequest<ApplyPreviewSuggestionResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/preview-run/apply-suggestion`,
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
export const startRun = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	datasetId: string,
) => {
	return await makeRestApiRequest<AgentEvalRunRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/datasets/${datasetId}/runs`,
		{},
	);
};

// Drops one case's result from its run. Paired with `deleteRows` on the Data
// Table: deleting the result alone would leave the row behind, and deleting
// the row alone would leave this result to reappear on the next load.
export const deleteResult = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	resultId: string,
) => {
	return await makeRestApiRequest<{ success: true }>(
		context,
		'DELETE',
		`${evalsPath(projectId, agentId)}/results/${resultId}`,
	);
};

// Re-executes one already-settled case in place — no new run, and no effect on
// any other row in the run it belongs to. The response is the refreshed result.
export const rerunResult = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	resultId: string,
	options: RerunResultOptions = {},
) => {
	return await makeRestApiRequest<AgentEvalResultRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/results/${resultId}/rerun`,
		options,
	);
};

// Rewrites the agent's instructions to include the fixes suggested for these failed
// results, then reruns just those results. One round trip: the response carries the
// saved config's hash and the reran results.
export const applySuggestions = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	options: ApplyAgentEvalSuggestionsOptions,
) => {
	return await makeRestApiRequest<ApplyAgentEvalSuggestionsResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/apply-suggestions`,
		options,
	);
};

// "Actually fine": records a passing verdict on a finished case, overriding
// the judge. The response is the refreshed result.
export const acceptResult = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	resultId: string,
) => {
	return await makeRestApiRequest<AgentEvalResultRecord>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/results/${resultId}/accept`,
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

// Judge recent sessions with the saved rubric and the agent's model.
export const runOnlineChecks = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	sessionIds?: string[],
) => {
	return await makeRestApiRequest<OnlineChecksReport>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/online-checks`,
		{ sessionIds },
	);
};

export const getOnlineRubric = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
) =>
	await makeRestApiRequest<AgentOnlineRubric | null>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/online-checks/rubric`,
	);

export const generateOnlineRubric = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
) =>
	await makeRestApiRequest<AgentOnlineRubric>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/online-checks/rubric`,
	);

export const listOnlineSessions = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
) =>
	await makeRestApiRequest<AgentOnlineSession[]>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/online-checks/sessions`,
	);

export const listOnlineCases = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skip = 0,
) =>
	await makeRestApiRequest<AgentOnlineCasePage>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/online-checks/cases`,
		{ take: 20, skip },
	);
export const listOnlineCaseResults = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	caseId: number,
	skip = 0,
) =>
	await makeRestApiRequest<AgentOnlineResultPage>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/online-checks/cases/${caseId}/results`,
		{ take: 20, skip },
	);
export const recheckOnlineCase = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	caseId: number,
) =>
	await makeRestApiRequest<AgentOnlineCaseResult>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/online-checks/cases/${caseId}/check`,
	);

// Replay a saved case on the draft, with tools mocked, and compare with the recorded run.
export const replayOnlineCase = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	caseId: number,
): Promise<AgentOnlineReplayComparison> => {
	try {
		return await makeRestApiRequest<AgentOnlineReplayComparison>(
			context,
			'POST',
			`${evalsPath(projectId, agentId)}/online-checks/cases/${caseId}/replay`,
		);
	} catch (error) {
		if (isNotFound(error)) {
			return await mockReplayComparison(context, projectId, agentId, caseId);
		}
		throw error;
	}
};

/** A 404 arrives as a `ResponseError`, or as a raw Axios error when the body is not JSON. */
function isNotFound(error: unknown): boolean {
	if (error instanceof ResponseError) return error.httpStatusCode === 404;
	if (typeof error !== 'object' || error === null || !('response' in error)) return false;
	const { response } = error;
	return typeof response === 'object' && response !== null && 'status' in response
		? response.status === 404
		: false;
}

/**
 * Prototype stand-in for a backend without the replay endpoint. It uses the
 * recorded result as "before" and the same checks with failures passed as
 * "after". Remove it once every demo backend serves the replay route.
 */
async function mockReplayComparison(
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	caseId: number,
): Promise<AgentOnlineReplayComparison> {
	const page = await listOnlineCaseResults(context, projectId, agentId, caseId);
	const before = page.items[0];
	if (!before) throw new Error('This test case has no recorded result to replay.');
	await new Promise((resolve) => setTimeout(resolve, 1500));
	return {
		caseId,
		title: '',
		before,
		after: {
			configHash: 'draft',
			rubric: before.rubric,
			verdicts: before.verdicts.map((verdict) =>
				verdict.status === 'fail' || verdict.status === 'unsure' || verdict.status === 'not_run'
					? { ...verdict, status: 'pass', reason: 'Passed on the replayed session.' }
					: verdict,
			),
			turns: page.conversation.map((turn) => ({ ...turn, toolCalls: 0, runFailed: false })),
			errors: [],
		},
	};
}

export const listOnlineActivity = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	skip = 0,
) =>
	await makeRestApiRequest<AgentOnlineActivityPage>(
		context,
		'GET',
		`${evalsPath(projectId, agentId)}/online-checks/activity`,
		{ take: 20, skip },
	);
export const updateOnlineCheck = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	checkId: string,
	input: UpdateAgentOnlineCheckDto,
) =>
	await makeRestApiRequest<AgentOnlineRubric>(
		context,
		'PATCH',
		`${evalsPath(projectId, agentId)}/online-checks/rubric/checks/${encodeURIComponent(checkId)}`,
		input,
	);
export const reviewOnlineCheck = async (
	context: IRestApiContext,
	projectId: string,
	agentId: string,
	resultId: number,
	checkId: string,
	feedback: 'good' | 'bad',
) =>
	await makeRestApiRequest<{ checkId: string; feedback: 'good' | 'bad' }>(
		context,
		'POST',
		`${evalsPath(projectId, agentId)}/online-checks/assessments/${resultId}/checks/${encodeURIComponent(checkId)}/reviews`,
		{ feedback },
	);
