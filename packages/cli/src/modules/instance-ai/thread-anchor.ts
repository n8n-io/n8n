import type { ThreadAnchor, ThreadAnchorWorkflow } from '@n8n/instance-ai';

/** Cap the stored goal so a pasted spec can't bloat every future system prompt. */
const MAX_GOAL_LENGTH = 2000;

/**
 * A user message is a goal candidate only when it carries real user intent —
 * not an empty resume turn, a system follow-up tag (`<...>`), or a bare
 * "(continue)". These never describe what the user wants built.
 */
export function isSubstantiveGoal(message: string | undefined): message is string {
	if (!message) return false;
	const trimmed = message.trim();
	if (trimmed.length === 0) return false;
	if (trimmed.startsWith('<')) return false;
	if (trimmed === '(continue)') return false;
	return true;
}

export interface ThreadAnchorInput {
	/** The current user message; becomes the original goal if none is set yet. */
	userMessage?: string;
	/** Workflow ids persisted this turn (created/edited, excluding throwaway previews). */
	builtWorkflowIds?: string[];
}

/**
 * Advance the durable thread anchor. Pure: takes the previous anchor and the
 * turn's inputs, returns the next anchor. The goal is captured once (first
 * substantive message); built workflows accumulate, de-duplicated.
 */
export function deriveThreadAnchor(
	prev: ThreadAnchor | undefined,
	input: ThreadAnchorInput,
): ThreadAnchor {
	const next: ThreadAnchor = {
		...(prev?.originalGoal ? { originalGoal: prev.originalGoal } : {}),
		...(prev?.builtWorkflows ? { builtWorkflows: [...prev.builtWorkflows] } : {}),
	};

	if (!next.originalGoal && isSubstantiveGoal(input.userMessage)) {
		const goal = input.userMessage.trim();
		next.originalGoal =
			goal.length > MAX_GOAL_LENGTH ? `${goal.slice(0, MAX_GOAL_LENGTH - 1)}…` : goal;
	}

	if (input.builtWorkflowIds && input.builtWorkflowIds.length > 0) {
		const existing = next.builtWorkflows ?? [];
		const known = new Set(existing.map((w) => w.id));
		const added: ThreadAnchorWorkflow[] = input.builtWorkflowIds
			.filter((id) => !known.has(id))
			.map((id) => ({ id }));
		if (added.length > 0) next.builtWorkflows = [...existing, ...added];
	}

	return next;
}

function parseAnchorWorkflow(value: unknown): ThreadAnchorWorkflow | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	if (!('id' in value) || typeof value.id !== 'string') return undefined;
	const name = 'name' in value && typeof value.name === 'string' ? value.name : undefined;
	return name ? { id: value.id, name } : { id: value.id };
}

/** Defensively read an anchor back from untyped thread metadata. */
export function parseThreadAnchor(value: unknown): ThreadAnchor | undefined {
	if (typeof value !== 'object' || value === null) return undefined;

	const anchor: ThreadAnchor = {};
	if (
		'originalGoal' in value &&
		typeof value.originalGoal === 'string' &&
		value.originalGoal.length > 0
	) {
		anchor.originalGoal = value.originalGoal;
	}
	if ('builtWorkflows' in value && Array.isArray(value.builtWorkflows)) {
		const workflows = value.builtWorkflows.flatMap((w) => {
			const parsed = parseAnchorWorkflow(w);
			return parsed ? [parsed] : [];
		});
		if (workflows.length > 0) anchor.builtWorkflows = workflows;
	}

	return (anchor.originalGoal ?? anchor.builtWorkflows) ? anchor : undefined;
}

/** Stable equality so we only write metadata when the anchor actually changed. */
export function threadAnchorsEqual(a: ThreadAnchor | undefined, b: ThreadAnchor): boolean {
	return JSON.stringify(a ?? {}) === JSON.stringify(b);
}
