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
export const AGENT_SLOT_SOURCES = ['agent', 'tool'] as const;

export const AgentSlotSchema = z.object({
	name: z
		.string()
		.min(1)
		.max(64)
		.regex(/^[A-Za-z][A-Za-z0-9_]*$/),
	type: z.enum(AGENT_SLOT_TYPES),
	/**
	 * Who may write the slot: `agent` slots are fillable via the built-in
	 * `fill_slot` tool; `tool` slots can only be written by attachment
	 * `outputMappings` (the agent cannot self-certify).
	 */
	source: z.enum(AGENT_SLOT_SOURCES),
	description: z.string().max(512).optional(),
	initialValue: z.unknown().optional(),
});

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

/** Derived, never stored. */
export type GoalStatus = 'locked' | 'active' | 'achieved' | 'failed';
