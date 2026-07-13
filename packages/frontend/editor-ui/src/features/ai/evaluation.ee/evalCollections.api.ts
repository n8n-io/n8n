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

// Server returns the created record plus the ids of any runs it scheduled
// (versions without an `existingTestRunId`). The store adds the record to the
// list and arms polling by refetching the collection detail, so it reads the
// record here; `runsStartedIds` is exposed for callers that want to surface
// "N runs started" without a second round-trip.
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

// Both add and remove return the freshly-recomputed collection detail — the
// server rebuilds it from `getCollectionDetail` after mutating membership, so
// the caller replaces its cached detail wholesale rather than patching runs.
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
	return await makeRestApiRequest<EvaluationCollectionDetail>(
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
