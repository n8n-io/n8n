import type { AgentJsonConfig } from '@n8n/api-types';
import { TELEMETRY_EVENT, type TelemetryEventDef } from '@n8n/telemetry';
import type { GenericValue } from 'n8n-workflow';

export function taskIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return Array.from(new Set((config?.tasks ?? []).map((ref) => ref.id).filter(Boolean))).sort();
}

export interface BuilderConfigDiffEvent {
	entry: TelemetryEventDef;
	properties: Record<string, GenericValue>;
}

/**
 * Diff the previous and next agent config and return one event per added task.
 *
 * Task creation persists outside `AgentConfigService.updateConfig`, so it is
 * the one builder mutation the "Builder modified agent" event does not cover.
 * The tool, skill and removed-task diffs this used to produce are covered by
 * that event's `changed_parts`.
 */
export function collectBuilderConfigDiffEvents(
	oldConfig: AgentJsonConfig | null,
	newConfig: AgentJsonConfig,
): BuilderConfigDiffEvent[] {
	const previousTasks = taskIdentifiersFromConfig(oldConfig);
	const currentTasks = taskIdentifiersFromConfig(newConfig);

	return currentTasks
		.filter((task) => !previousTasks.includes(task))
		.map((taskAdded) => ({
			entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TASKS,
			properties: { task_added: taskAdded, tasks: currentTasks },
		}));
}

export type BuilderTrackFn = (
	entry: TelemetryEventDef,
	properties: Record<string, GenericValue>,
) => void;
