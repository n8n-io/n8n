import type { AgentGoalConfig, AgentSlotConfig } from '@n8n/api-types';

/**
 * Pure mutation helpers for editing a goal-graph config. Every function
 * returns new arrays/objects and never mutates its input, so callers can
 * emit the result directly and Vue's deep watchers fire cleanly.
 */

export function generateGoalId(goals: AgentGoalConfig[]): string {
	const taken = new Set(goals.map((g) => g.id));
	let n = goals.length + 1;
	while (taken.has(`goal-${n}`)) n += 1;
	return `goal-${n}`;
}

export function createDefaultGoal(goals: AgentGoalConfig[], name = 'New goal'): AgentGoalConfig {
	return { id: generateGoalId(goals), name, instructions: '' };
}

export function addGoal(goals: AgentGoalConfig[], goal: AgentGoalConfig): AgentGoalConfig[] {
	return [...goals, goal];
}

function withoutRequirement(goal: AgentGoalConfig, requiredId: string): AgentGoalConfig {
	if (!goal.requires?.includes(requiredId)) return goal;
	const requires = goal.requires.filter((id) => id !== requiredId);
	const { requires: _, ...rest } = goal;
	return requires.length > 0 ? { ...rest, requires } : rest;
}

export function removeGoal(goals: AgentGoalConfig[], id: string): AgentGoalConfig[] {
	return goals.filter((g) => g.id !== id).map((g) => withoutRequirement(g, id));
}

export function renameGoalId(
	goals: AgentGoalConfig[],
	oldId: string,
	newId: string,
): AgentGoalConfig[] {
	return goals.map((g) => {
		const next = g.id === oldId ? { ...g, id: newId } : g;
		if (!next.requires?.includes(oldId)) return next;
		return { ...next, requires: next.requires.map((id) => (id === oldId ? newId : id)) };
	});
}

/** Replaces the goal that had `originalId`, cascading a rename into `requires` if the id changed. */
export function updateGoal(
	goals: AgentGoalConfig[],
	originalId: string,
	next: AgentGoalConfig,
): AgentGoalConfig[] {
	const renamed = next.id === originalId ? goals : renameGoalId(goals, originalId, next.id);
	return renamed.map((g) => (g.id === next.id ? next : g));
}

/**
 * True iff `fromId` (transitively) requires `toId` — so adding `fromId` to
 * `toId`'s requires would close a cycle. Also true when fromId === toId.
 */
export function wouldCreateCycle(goals: AgentGoalConfig[], fromId: string, toId: string): boolean {
	const byId = new Map(goals.map((g) => [g.id, g]));
	const seen = new Set<string>();
	const stack = [fromId];
	while (stack.length > 0) {
		const id = stack.pop() as string;
		if (id === toId) return true;
		if (seen.has(id)) continue;
		seen.add(id);
		for (const req of byId.get(id)?.requires ?? []) stack.push(req);
	}
	return false;
}

export type ConnectError = 'self' | 'duplicate' | 'cycle' | 'unknown-goal';

export type ConnectResult =
	| { ok: true; goals: AgentGoalConfig[] }
	| { ok: false; error: ConnectError };

/** Adds `fromId` as a prerequisite of `toId` (an edge from → to on the canvas). */
export function connectGoals(
	goals: AgentGoalConfig[],
	fromId: string,
	toId: string,
): ConnectResult {
	const from = goals.find((g) => g.id === fromId);
	const to = goals.find((g) => g.id === toId);
	if (!from || !to) return { ok: false, error: 'unknown-goal' };
	if (fromId === toId) return { ok: false, error: 'self' };
	if (to.requires?.includes(fromId)) return { ok: false, error: 'duplicate' };
	if (wouldCreateCycle(goals, fromId, toId)) return { ok: false, error: 'cycle' };
	return {
		ok: true,
		goals: goals.map((g) =>
			g.id === toId ? { ...g, requires: [...(g.requires ?? []), fromId] } : g,
		),
	};
}

/** Removes `fromId` from `toId`'s prerequisites. */
export function disconnectGoals(
	goals: AgentGoalConfig[],
	fromId: string,
	toId: string,
): AgentGoalConfig[] {
	return goals.map((g) => (g.id === toId ? withoutRequirement(g, fromId) : g));
}

export function generateSlotName(slots: AgentSlotConfig[]): string {
	const taken = new Set(slots.map((s) => s.name));
	let n = slots.length + 1;
	while (taken.has(`slot${n}`)) n += 1;
	return `slot${n}`;
}

export function createDefaultSlot(slots: AgentSlotConfig[]): AgentSlotConfig {
	return { name: generateSlotName(slots), type: 'string', access: 'standard' };
}

/** Replaces the slot at `index`, or appends when `index` is null. */
export function upsertSlot(
	slots: AgentSlotConfig[],
	index: number | null,
	slot: AgentSlotConfig,
): AgentSlotConfig[] {
	if (index === null || index < 0 || index >= slots.length) return [...slots, slot];
	return slots.map((s, i) => (i === index ? slot : s));
}

export function removeSlot(slots: AgentSlotConfig[], index: number): AgentSlotConfig[] {
	return slots.filter((_, i) => i !== index);
}
