import { z } from 'zod';

/**
 * Goal-graph steering (experimental, gated by the `goal-graph` agents module).
 *
 * An agent definition may declare typed state `slots` and a graph of `goals`.
 * Goal statuses are never stored — they are derived from the current slot
 * values via n8n expressions, re-evaluated on every LLM iteration:
 *
 * - Achieved: `achievedWhen($state)` is truthy
 * - Failed:   `failedWhen($state)` is truthy (Achieved takes precedence)
 * - Active:   all `requires` goals are Achieved and `unlockedWhen($state)`
 *             (when present) is truthy
 * - Locked:   otherwise
 *
 * Tools attached to a goal are only callable while that goal is Active.
 * Attachment `bindings` remove the bound parameters from the LLM-visible
 * schema and inject their values from state at execution time;
 * `outputMappings` write tool results back into slots.
 */

/** An n8n expression string, e.g. `={{ $state.customerId !== null }}`. */
const GoalExpressionSchema = z.string().min(1);

export const AGENT_SLOT_TYPES = ['string', 'number', 'boolean', 'object'] as const;

/**
 * Slot access level — who may read and write the slot:
 * - `standard`  — the agent both reads it and writes it (via `fill_slot`).
 * - `protected` — the agent reads it but cannot write it; only tool output
 *                 mappings write it (so the agent cannot self-certify a gate).
 * - `private`   — the agent can neither read nor write it; only tools read it
 *                 (via bindings) and write it (via output mappings). Its value
 *                 never reaches the model, yet still drives goal statuses.
 */
export const AGENT_SLOT_ACCESS_LEVELS = ['standard', 'protected', 'private'] as const;
export type AgentSlotAccess = (typeof AGENT_SLOT_ACCESS_LEVELS)[number];

const AgentSlotObjectSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z][A-Za-z0-9_]*$/),
	/**
	 * Optional human-readable label shown in the UI. Expressions and tool
	 * mappings still reference the slot by `name`; this only affects display.
	 */
	displayName: z.string().max(128).optional(),
	type: z.enum(AGENT_SLOT_TYPES),
	access: z.enum(AGENT_SLOT_ACCESS_LEVELS),
	description: z.string().max(512).optional(),
	initialValue: z.unknown().optional(),
});

/**
 * Accepts the current `access` field and migrates the legacy `source` field
 * (`agent` → `standard`, `tool` → `protected`) so slots authored before the
 * access model keep loading.
 */
export const AgentSlotSchema = z.preprocess((value) => {
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		const record = value as Record<string, unknown>;
		if (record.access === undefined && record.source !== undefined) {
			const { source, ...rest } = record;
			return { ...rest, access: source === 'tool' ? 'protected' : 'standard' };
		}
	}
	return value;
}, AgentSlotObjectSchema);

export const GoalToolAttachmentSchema = z.object({
	/** Runtime tool name of a tool configured on this agent (custom tools only for now). */
	tool: z.string().min(1),
	/** Extra availability condition on top of the goal being Active. */
	availableWhen: GoalExpressionSchema.optional(),
	/**
	 * Parameter name → expression over `$state`. Bound parameters are removed
	 * from the LLM-visible input schema and injected at execution time.
	 */
	bindings: z.record(GoalExpressionSchema).optional(),
	/** Slot name → expression over the tool output (`$json`) and `$state`. */
	outputMappings: z.record(GoalExpressionSchema).optional(),
});

export const AgentGoalSchema = z.object({
	id: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z0-9_-]+$/),
	name: z.string().min(1).max(128),
	/** One-liner shown to the model for all goals regardless of status. */
	summary: z.string().max(512).optional(),
	/** Full instructions, shown to the model only while the goal is Active. */
	instructions: z.string(),
	/** Absent = the goal never auto-achieves (open-ended goal). */
	achievedWhen: GoalExpressionSchema.optional(),
	failedWhen: GoalExpressionSchema.optional(),
	/** Extra unlock condition, ANDed with `requires`. */
	unlockedWhen: GoalExpressionSchema.optional(),
	/** Prerequisite goal ids; all must be Achieved (AND). */
	requires: z.array(z.string().min(1)).optional(),
	tools: z.array(GoalToolAttachmentSchema).optional(),
});

export const AgentSlotsConfigSchema = z
	.array(AgentSlotSchema)
	.max(50)
	.refine((slots) => new Set(slots.map((s) => s.name)).size === slots.length, {
		message: 'Slot names must be unique within an agent',
	});

export const AgentGoalsConfigSchema = z
	.array(AgentGoalSchema)
	.max(50)
	.refine((goals) => new Set(goals.map((g) => g.id)).size === goals.length, {
		message: 'Goal ids must be unique within an agent',
	});

export type AgentSlotConfig = z.infer<typeof AgentSlotSchema>;
export type GoalToolAttachmentConfig = z.infer<typeof GoalToolAttachmentSchema>;
export type AgentGoalConfig = z.infer<typeof AgentGoalSchema>;

/**
 * Migrate a slot that may still carry the legacy `source` field
 * (`agent` → `standard`, `tool` → `protected`) to the `access` model. Slots
 * that already declare `access` pass through unchanged. Use wherever slots are
 * read outside the zod schema (which migrates via its own preprocess).
 */
export function migrateSlotAccess(slot: AgentSlotConfig): AgentSlotConfig {
	const raw = slot as { access?: AgentSlotAccess; source?: 'agent' | 'tool' };
	if (raw.access) return slot;
	const { source, ...rest } = raw;
	return { ...(rest as AgentSlotConfig), access: source === 'tool' ? 'protected' : 'standard' };
}

/** Derived, never stored. */
export type GoalStatus = 'locked' | 'active' | 'achieved' | 'failed';
