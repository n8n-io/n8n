import type { AgentJsonConfig } from '@n8n/api-types';
import { TELEMETRY_EVENT, type TelemetryEventDef } from '@n8n/telemetry';
import type { GenericValue } from 'n8n-workflow';

/**
 * Identifier extraction intentionally mirrors
 * `packages/frontend/editor-ui/src/features/agents/composables/agentTelemetry.utils.ts`
 * so the builder's `Builder added *` events and the frontend's `User added *`
 * events use the same identifier values and can be unioned in the warehouse.
 */
export function toolIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return (config?.tools ?? [])
		.map((ref) => {
			if (ref.type === 'custom') return ref.id ?? '';
			if (ref.type === 'workflow') return ref.name ?? ref.workflow ?? '';
			return ref.name ?? ref.node?.nodeType ?? '';
		})
		.filter(Boolean)
		.sort();
}

export function skillIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return (config?.skills ?? [])
		.map((ref) => ref.id)
		.filter(Boolean)
		.sort();
}

export function taskIdentifiersFromConfig(config: AgentJsonConfig | null): string[] {
	return Array.from(new Set((config?.tasks ?? []).map((ref) => ref.id).filter(Boolean))).sort();
}

export interface BuilderConfigDiffEvent {
	entry: TelemetryEventDef;
	properties: Record<string, GenericValue>;
}

/**
 * Diff the previous and next agent config and return one event per added
 * tool, added skill, added task, and removed task — matching the frontend's
 * `trackToolsAdded` / `trackSkillsAdded` / `trackTasksChanged` loops. There is
 * intentionally no removed-tools or removed-skills event: the frontend
 * doesn't track those either.
 */
export function collectBuilderConfigDiffEvents(
	oldConfig: AgentJsonConfig | null,
	newConfig: AgentJsonConfig,
): BuilderConfigDiffEvent[] {
	const events: BuilderConfigDiffEvent[] = [];

	const previousTools = toolIdentifiersFromConfig(oldConfig);
	const currentTools = toolIdentifiersFromConfig(newConfig);
	const addedTools = currentTools.filter((tool) => !previousTools.includes(tool));
	for (const toolAdded of addedTools) {
		events.push({
			entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TOOLS,
			properties: { tool_added: toolAdded, tools: currentTools },
		});
	}

	const previousSkills = skillIdentifiersFromConfig(oldConfig);
	const currentSkills = skillIdentifiersFromConfig(newConfig);
	const addedSkills = currentSkills.filter((skill) => !previousSkills.includes(skill));
	for (const skillAdded of addedSkills) {
		events.push({
			entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_SKILLS,
			properties: { skill_added: skillAdded, skills: currentSkills },
		});
	}

	const previousTasks = taskIdentifiersFromConfig(oldConfig);
	const currentTasks = taskIdentifiersFromConfig(newConfig);
	const addedTasks = currentTasks.filter((task) => !previousTasks.includes(task));
	for (const taskAdded of addedTasks) {
		events.push({
			entry: TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TASKS,
			properties: { task_added: taskAdded, tasks: currentTasks },
		});
	}
	const removedTasks = previousTasks.filter((task) => !currentTasks.includes(task));
	for (const taskRemoved of removedTasks) {
		events.push({
			entry: TELEMETRY_EVENT.AGENTS.BUILDER_REMOVED_TASKS,
			properties: { task_removed: taskRemoved, tasks: currentTasks },
		});
	}

	return events;
}

export type BuilderTrackFn = (
	entry: TelemetryEventDef,
	properties: Record<string, GenericValue>,
) => void;
