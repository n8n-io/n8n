import { z } from 'zod';

/**
 * `blocked` strips `ask-user` from the sub-agent's resolved tools and adds a
 * no-HITL instruction; the host runner must never let this definition suspend.
 * `allowed` means the host runner resolves suspends internally via the same
 * HITL flow the orchestrator uses, and never surfaces `status: 'suspended'`
 * to the SDK delegate tool (see `docs/subagents.md`).
 */
export const subAgentHitlModeSchema = z.enum(['blocked', 'allowed']);
export type SubAgentHitlMode = z.infer<typeof subAgentHitlModeSchema>;

/**
 * A tool a sub-agent may use. A plain string grants all of the tool's actions.
 * An object scopes a multi-action domain tool (e.g. `workflows`, `executions`)
 * down to an allowlist — enforced at runtime, not just described in prose.
 */
export const subAgentToolScopeSchema = z.union([
	z.string().min(1),
	z.object({
		id: z.string().min(1),
		actions: z.array(z.string().min(1)).min(1),
	}),
]);
export type SubAgentToolScope = z.infer<typeof subAgentToolScopeSchema>;

export const instanceAiSubAgentDefinitionSchema = z.object({
	/** Stable identifier — the `subAgentId` the delegate tool routes on. */
	id: z.string().min(1),
	/** Human-readable name shown in `availableSubAgents` and the UI timeline. */
	name: z.string().min(1),
	/**
	 * Free text rendered into the SDK's `availableSubAgents` listing. Include
	 * both when-to-use and when-not-to-use guidance — the SDK only renders this
	 * one field, there is no separate "don't use when" slot.
	 */
	useWhen: z.string().min(1),
	/** Max LLM steps for this sub-agent's run. */
	maxSteps: z.number().int().positive(),
	hitl: subAgentHitlModeSchema,
	/** Native domain tools this sub-agent may use. Never MCP, never orchestration tools. */
	tools: z.array(subAgentToolScopeSchema).min(1),
	/** Task-specific system prompt, appended to the shared sub-agent protocol. */
	instructions: z.string().min(1),
});

export type InstanceAiSubAgentDefinition = z.infer<typeof instanceAiSubAgentDefinitionSchema>;
