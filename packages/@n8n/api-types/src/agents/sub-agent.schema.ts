import { z } from 'zod';

import {
	RunnableAgentJsonConfigSchema,
	type RunnableAgentJsonConfig,
} from './agent-json-config.schema';

export const SubAgentTaskPathSchema = z.string().regex(/^\/root(?:\/[a-z0-9_]+)*$/);

export const SubAgentContextModeSchema = z.enum(['fresh', 'fork-filtered', 'selected-summary']);

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

export const ResolvedSubAgentSourceSchema = z.object({
	config: RunnableAgentJsonConfigSchema,
	/** The saved agent id this source resolved from. */
	sourceId: z.string().min(1),
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

export type SubAgentTaskPath = `/root${'' | `/${string}`}`;
export type SubAgentContextMode = z.infer<typeof SubAgentContextModeSchema>;
export type SubAgentExecutionMode = z.infer<typeof SubAgentExecutionModeSchema>;

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
