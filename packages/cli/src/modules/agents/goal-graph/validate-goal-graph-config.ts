import type { AgentJsonConfig } from '@n8n/api-types';

/**
 * Cross-field validation for the goal-graph sections of an agent config.
 * Shape validation is handled by the Zod schema; this checks referential
 * consistency that Zod cannot express:
 *
 * - `requires` entries reference existing goal ids (and not the goal itself)
 * - `requires` edges form no cycle (a cycle would lock all involved goals forever)
 * - `outputMappings` keys reference declared slots
 *
 * Attachment tool names are intentionally not validated here — they reference
 * runtime tool names (stored on the agent entity, not in the config); unknown
 * names fail soft at runtime.
 *
 * Returns a human-readable error message, or `null` when valid.
 */
export function validateGoalGraphConfig(config: AgentJsonConfig): string | null {
	const goals = config.goals ?? [];
	const slots = config.slots ?? [];
	if (goals.length === 0 && slots.length === 0) return null;

	const slotNames = new Set(slots.map((slot) => slot.name));
	const goalIds = new Set(goals.map((goal) => goal.id));

	for (const goal of goals) {
		for (const requiredId of goal.requires ?? []) {
			if (requiredId === goal.id) {
				return `Goal "${goal.id}" cannot require itself.`;
			}
			if (!goalIds.has(requiredId)) {
				return `Goal "${goal.id}" requires unknown goal "${requiredId}".`;
			}
		}

		for (const attachment of goal.tools ?? []) {
			for (const slotName of Object.keys(attachment.outputMappings ?? {})) {
				if (!slotNames.has(slotName)) {
					return `Goal "${goal.id}" tool "${attachment.tool}" maps output to unknown slot "${slotName}".`;
				}
			}
		}
	}

	const cycleGoalId = findRequiresCycle(goals);
	if (cycleGoalId !== null) {
		return `Goal "${cycleGoalId}" is part of a cycle in "requires" — prerequisite edges must form a DAG.`;
	}

	return null;
}

/** Returns the id of a goal participating in a `requires` cycle, or null. */
function findRequiresCycle(goals: NonNullable<AgentJsonConfig['goals']>): string | null {
	const requiresById = new Map(goals.map((goal) => [goal.id, goal.requires ?? []]));
	const visited = new Set<string>();
	const inStack = new Set<string>();

	const visit = (id: string): string | null => {
		if (inStack.has(id)) return id;
		if (visited.has(id)) return null;
		visited.add(id);
		inStack.add(id);
		for (const requiredId of requiresById.get(id) ?? []) {
			const cycle = visit(requiredId);
			if (cycle !== null) return cycle;
		}
		inStack.delete(id);
		return null;
	};

	for (const goal of goals) {
		const cycle = visit(goal.id);
		if (cycle !== null) return cycle;
	}
	return null;
}
