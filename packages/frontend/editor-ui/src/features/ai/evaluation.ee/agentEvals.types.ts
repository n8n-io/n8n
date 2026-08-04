// Re-exports from @n8n/api-types so agent-eval FE callers don't reach across
// packages. New shared type? Export it from `@n8n/api-types` first.
//
// Run/result/rating shapes are deliberately absent: their response types are
// still being reshaped into paginated envelopes, so nothing here should bind to
// them yet.

export type {
	AgentEvalDatasetRecord,
	AgentEvalDraftCase,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
} from '@n8n/api-types';
