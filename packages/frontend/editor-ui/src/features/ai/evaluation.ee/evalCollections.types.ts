// Re-exports from @n8n/api-types so eval-collections FE callers don't reach
// across packages. New shared type? Export it from `@n8n/api-types` first.

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
	MetricScale,
	UpdateEvaluationCollectionPayload,
} from '@n8n/api-types';

export type { CreateCollectionResponse } from './evalCollections.api';
