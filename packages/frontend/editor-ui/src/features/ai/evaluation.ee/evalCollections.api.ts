import type {
	AddRunToCollectionPayload,
	AiInsightsResponse,
	CreateEvaluationCollectionPayload,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	GenerateInsightsPayload,
	UpdateEvaluationCollectionPayload,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

// REST path helpers. Kept inline (not exported) so callers can't accidentally
// build a URL that drifts from the backend routes registered in
// `evaluation-collections.controller.ee.ts` / `eval-insights.controller.ee.ts`.
const collectionsPath = (workflowId: string, collectionId?: string) =>
	`/workflows/${workflowId}/eval-collections${collectionId ? `/${collectionId}` : ''}`;

// Server returns the created record plus the ids of any runs that were
// scheduled (versions without an `existingTestRunId`). The store needs both —
// the record to add to the list, and the run ids to start polling.
export type CreateCollectionResponse = EvaluationCollectionRecord & {
	runsStartedIds: string[];
};

export const getCollections = async (context: IRestApiContext, workflowId: string) => {
	return await makeRestApiRequest<EvaluationCollectionRecord[]>(
		context,
		'GET',
		collectionsPath(workflowId),
	);
};

export const getCollection = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
) => {
	return await makeRestApiRequest<EvaluationCollectionDetail>(
		context,
		'GET',
		collectionsPath(workflowId, collectionId),
	);
};

export const createCollection = async (
	context: IRestApiContext,
	workflowId: string,
	payload: CreateEvaluationCollectionPayload,
) => {
	return await makeRestApiRequest<CreateCollectionResponse>(
		context,
		'POST',
		collectionsPath(workflowId),
		payload as unknown as Record<string, unknown>,
	);
};

export const updateCollection = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
	payload: UpdateEvaluationCollectionPayload,
) => {
	return await makeRestApiRequest<EvaluationCollectionRecord>(
		context,
		'PATCH',
		collectionsPath(workflowId, collectionId),
		payload as unknown as Record<string, unknown>,
	);
};

export const deleteCollection = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
) => {
	return await makeRestApiRequest<{ success: boolean; runsUnlinked: number }>(
		context,
		'DELETE',
		collectionsPath(workflowId, collectionId),
	);
};

export const addRunToCollection = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
	payload: AddRunToCollectionPayload,
) => {
	return await makeRestApiRequest<EvaluationCollectionDetail>(
		context,
		'POST',
		`${collectionsPath(workflowId, collectionId)}/runs`,
		payload as unknown as Record<string, unknown>,
	);
};

export const removeRunFromCollection = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
	runId: string,
) => {
	return await makeRestApiRequest<{ success: boolean; affected: number }>(
		context,
		'DELETE',
		`${collectionsPath(workflowId, collectionId)}/runs/${runId}`,
	);
};

export const getEvalVersions = async (
	context: IRestApiContext,
	workflowId: string,
	evaluationConfigId: string,
) => {
	return await makeRestApiRequest<EvalVersionsResponse>(
		context,
		'GET',
		`/workflows/${workflowId}/eval-versions`,
		{ evaluationConfigId },
	);
};

// Lightweight eval-config record for the wizard's dataset picker. Mirrors
// the columns that `EvaluationConfigController.list()` returns. Kept as a
// FE-local type to avoid widening `@n8n/api-types` until other callers need
// the shape too.
//
// `metrics` is intentionally typed loose — the controller returns the full
// `EvaluationMetric[]` discriminated union but the wizard only displays the
// `name`. Tightening this would force every metric-shape change to ripple
// through unrelated wizard code.
export type EvaluationConfigSummary = {
	id: string;
	name: string;
	status: string;
	datasetSource: string;
	updatedAt: string;
	metrics?: Array<{ name: string }>;
};

export const getEvaluationConfigs = async (context: IRestApiContext, workflowId: string) => {
	return await makeRestApiRequest<EvaluationConfigSummary[]>(
		context,
		'GET',
		`/workflows/${workflowId}/evaluation-configs`,
	);
};

export const generateInsights = async (
	context: IRestApiContext,
	workflowId: string,
	collectionId: string,
	payload: GenerateInsightsPayload = {},
) => {
	return await makeRestApiRequest<AiInsightsResponse>(
		context,
		'POST',
		`${collectionsPath(workflowId, collectionId)}/insights`,
		payload as unknown as Record<string, unknown>,
	);
};
