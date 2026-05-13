/**
 * Public entry point for the incremental (hackathon) builder.
 *
 * Behind a feature flag — when N8N_INSTANCE_AI_INCREMENTAL_BUILDER is set
 * the cli routes a sendMessage through `runIncrementalBuilder` instead of
 * the existing Mastra-backed orchestrator path.
 */

export { runIncrementalOrchestrator } from './agents/orchestrator';
export type { OrchestratorOptions, OrchestratorResult } from './agents/orchestrator';
export { HitlBroker } from './hitl-broker';
export type { HitlChoiceOption, HitlChoiceRequest, HitlResponse } from './hitl-broker';
export { DraftStore } from './draft-store';
export { ChecklistStore } from './checklist-store';
export type { IncrementalBuilderRunContext, IncrementalBuilderServices } from './types';

/**
 * Read the env feature flag. Cheap helper so call-sites don't sprinkle the
 * literal across the cli.
 */
export function isIncrementalBuilderEnabled(): boolean {
	const flag = process.env.N8N_INSTANCE_AI_INCREMENTAL_BUILDER;
	if (!flag) return false;
	return flag === '1' || flag.toLowerCase() === 'true';
}
