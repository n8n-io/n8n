// Re-exports from @n8n/api-types for consumer convenience — co-located with
// the other eval-collections FE files so callers don't reach across packages
// for every type. Adding a new shared type? Export it from `@n8n/api-types`
// first, then surface it here.

export type {
	AddRunToCollectionPayload,
	AiInsightsPayload,
	AiInsightsRegression,
	AiInsightsResponse,
	AiInsightsStatus,
	AiInsightsSuggestedNext,
	AiInsightsWinner,
	CreateEvaluationCollectionPayload,
	EvalCollectionRunStatus,
	EvalCollectionVersionEntry,
	EvalVersionEntry,
	EvalVersionsResponse,
	EvaluationCollectionDetail,
	EvaluationCollectionRecord,
	EvaluationCollectionRunSummary,
	GenerateInsightsPayload,
	UpdateEvaluationCollectionPayload,
} from '@n8n/api-types';

export type { CreateCollectionResponse } from './evalCollections.api';
