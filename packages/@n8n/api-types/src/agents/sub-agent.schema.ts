import { z } from 'zod';

import type { RunnableAgentJsonConfig } from './agent-json-config.schema';

// The `/root[/segment]*` task-path shape is owned and validated by `@n8n/agents`
// (`assertSubAgentTaskPath`), which the n8n runner calls before running a child.
// This schema only types the spawn request, so a plain string suffices and we
// avoid duplicating the SDK's pattern here.
export const SubAgentTaskPathSchema = z.string().min(1);

// Only 'fresh' (a brand-new child conversation) is implemented today.
export const SubAgentContextModeSchema = z.enum(['fresh']);

/**
 * 'foreground' blocks the parent turn until the subagent completes — the only
 * mode implemented today. 'background' (dispatch, return a receipt, reconcile
 * the result later) is not yet implemented and is a consumer/product concern,
 * not an SDK one. Tracked in AGENT-186:
 * https://linear.app/n8n/issue/AGENT-186
 */
export const SubAgentExecutionModeSchema = z.enum(['foreground', 'background']);

/**
 * A sub-agent is always a saved n8n agent — optionally pinned to a published
 * version.
 */
export const SubAgentSourceSchema = z.object({
	agentId: z.string().min(1),
	versionId: z.string().min(1).optional(),
});

export const SubAgentRunPolicySchema = z.object({
	maxDepth: z.number().int().min(1).optional(),
	maxChildren: z.number().int().min(1).optional(),
	/** Host-enforced wall-clock timeout for a child run — the n8n runner aborts the child. */
	timeoutMs: z.number().int().min(1).optional(),
	canSpawnSubAgents: z.boolean().optional(),
});

export const SubAgentSpawnRequestSchema = z.object({
	taskName: z.string().min(1),
	goal: z.string().min(1),
	context: z.string().optional(),
	expectedOutput: z.string().optional(),
	source: SubAgentSourceSchema,
	contextMode: SubAgentContextModeSchema.optional(),
	executionMode: SubAgentExecutionModeSchema.optional(),
	policy: SubAgentRunPolicySchema.optional(),
	parentThreadId: z.string().min(1).optional(),
	/** Parent's episodic-memory resource id, inherited so the child shares its scope. */
	parentResourceId: z.string().min(1).optional(),
	/** This delegation's task path — already assigned and policy-checked by the SDK delegate tool. */
	taskPath: SubAgentTaskPathSchema,
});

export type SubAgentSource = {
	agentId: string;
	versionId?: string;
};

export interface ResolvedSubAgentSource {
	config: RunnableAgentJsonConfig;
	sourceId: string;
	versionId?: string;
}

export type SubAgentRunPolicy = z.infer<typeof SubAgentRunPolicySchema>;
export type SubAgentSpawnRequest = z.infer<typeof SubAgentSpawnRequestSchema>;
