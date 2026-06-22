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
 * Attachment tool names are validated separately (`findUnknownGoalTools`),
 * since resolving a custom tool's runtime name needs the agent entity's tool
 * descriptors, which aren't available here.
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

/**
 * Verify every goal tool attachment references a tool the agent actually has.
 * A mismatch (e.g. goal references "lookup_customer" but the tool is named
 * "verify_customer") otherwise fails silently: the tool is never wrapped, its
 * output mappings never run, and the goal never achieves. Caught at save time
 * with the real tool names so the fix is obvious.
 *
 * `availableToolNames` is the set of runtime tool names attached to the agent
 * (custom tool descriptor names + workflow/node tool names). Returns an error
 * message, or `null` when every attachment resolves.
 */
export function findUnknownGoalTools(
	config: AgentJsonConfig,
	availableToolNames: Set<string>,
): string | null {
	for (const goal of config.goals ?? []) {
		for (const attachment of goal.tools ?? []) {
			if (!availableToolNames.has(attachment.tool)) {
				const known = [...availableToolNames].sort().join(', ') || 'none';
				return `Goal "${goal.id}" references tool "${attachment.tool}", which is not one of this agent's tools (${known}). Rename the goal's tool reference or the tool itself so they match exactly.`;
			}
		}
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
