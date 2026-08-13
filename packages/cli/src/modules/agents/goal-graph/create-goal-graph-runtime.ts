import type { AgentPersistenceOptions, BuiltTool } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { migrateSlotAccess } from '@n8n/api-types';

import { deriveGoalStatuses } from './derive-status';
import { ensureExpressionIsolate } from './expressions';
import { createFillSlotTool } from './fill-slot-tool';
import type { GoalGraphStateService } from './goal-graph-state.service';
import { buildGoalGraphPrompt } from './prompt';
import type { AttachmentRef, GoalGraphDefinition, GoalStatuses, SlotValues } from './types';
import { findActiveAttachment, wrapGoalTool } from './wrap-tool';

/** A point-in-time view of a thread's goal-graph state, for the live canvas. */
export interface GoalGraphSnapshot {
	state: SlotValues;
	statuses: GoalStatuses;
}

export interface GoalGraphRuntime {
	/** Tool names referenced by goal attachments — these get wrapped and gated. */
	isManagedTool(name: string): boolean;
	/** Wrap a managed tool with bindings/mappings/gating. Pass-through otherwise. */
	wrapTool(tool: BuiltTool): BuiltTool;
	/** Built-in fill_slot tool, when `standard` (agent-writable) slots are declared. */
	fillSlotTool?: BuiltTool;
	/** Runtime hook: hides managed tools whose goals are not Active. */
	toolsFilter(tools: BuiltTool[], persistence?: AgentPersistenceOptions): BuiltTool[];
	/** Runtime hook: per-iteration goal overview + active instructions + state. */
	instructionsSuffix(persistence?: AgentPersistenceOptions): string | undefined;
	/** Hydrate persisted state before a run starts (hooks are sync, cache-only). */
	ensureLoaded(threadId: string | undefined): Promise<void>;
	/** Current slot values + derived statuses for a thread (live-canvas baseline). */
	getSnapshot(threadId: string | undefined): GoalGraphSnapshot;
}

export function hasGoalGraph(
	config: Pick<AgentJsonConfig, 'goals' | 'slots'>,
): config is Pick<AgentJsonConfig, 'goals' | 'slots'> & Required<Pick<AgentJsonConfig, 'goals'>> {
	return (config.goals?.length ?? 0) > 0;
}

/**
 * Assemble the goal-graph steering overlay for one agent. The returned object
 * is shared across runs of the (config-hash-cached) agent instance, so it
 * holds no per-thread state — all state reads go through the
 * `GoalGraphStateService` keyed by `persistence.threadId`.
 */
export function createGoalGraphRuntime(options: {
	agentId: string;
	config: Pick<AgentJsonConfig, 'goals' | 'slots'>;
	stateService: GoalGraphStateService;
}): GoalGraphRuntime {
	const { agentId, stateService } = options;
	const definition: GoalGraphDefinition = {
		slots: (options.config.slots ?? []).map(migrateSlotAccess),
		goals: options.config.goals ?? [],
	};

	const attachmentsByTool = new Map<string, AttachmentRef[]>();
	for (const goal of definition.goals) {
		for (const attachment of goal.tools ?? []) {
			const refs = attachmentsByTool.get(attachment.tool) ?? [];
			refs.push({ goalId: goal.id, attachment });
			attachmentsByTool.set(attachment.tool, refs);
		}
	}

	return {
		isManagedTool(name) {
			return attachmentsByTool.has(name);
		},

		wrapTool(tool) {
			const attachments = attachmentsByTool.get(tool.name);
			if (!attachments) return tool;
			return wrapGoalTool({ tool, attachments, definition, agentId, stateService });
		},

		fillSlotTool: createFillSlotTool({ agentId, definition, stateService }),

		toolsFilter(tools, persistence) {
			const state = stateService.getState(agentId, persistence?.threadId, definition);
			return tools.filter((tool) => {
				const attachments = attachmentsByTool.get(tool.name);
				if (!attachments) return true;
				return findActiveAttachment(attachments, definition, state) !== undefined;
			});
		},

		instructionsSuffix(persistence) {
			const state = stateService.getState(agentId, persistence?.threadId, definition);
			const statuses = deriveGoalStatuses(definition.goals, state);
			return buildGoalGraphPrompt(definition, state, statuses);
		},

		async ensureLoaded(threadId) {
			// The sync hooks below evaluate n8n expressions — under the VM
			// expression engine that needs an isolate acquired up front.
			await ensureExpressionIsolate();
			await stateService.ensureLoaded(agentId, threadId, definition);
		},

		getSnapshot(threadId) {
			const state = stateService.getState(agentId, threadId, definition);
			return { state, statuses: deriveGoalStatuses(definition.goals, state) };
		},
	};
}
