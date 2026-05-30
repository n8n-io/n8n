import { z } from 'zod';

import {
	AgentJsonConfigPartialSchema,
	AgentJsonConfigSchema,
	RunnableAgentJsonConfigSchema,
	type AgentJsonConfig,
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

export const SubAgentSourceSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('inline'),
		config: AgentJsonConfigSchema,
	}),
	z.object({
		type: z.literal('built-in'),
		id: z.string().min(1),
		overrides: AgentJsonConfigPartialSchema.optional(),
	}),
	z.object({
		type: z.literal('n8n-agent'),
		agentId: z.string().min(1),
		versionId: z.string().min(1).optional(),
		overrides: AgentJsonConfigPartialSchema.optional(),
	}),
]);

export const ResolvedSubAgentSourceSchema = z.object({
	type: z.enum(['inline', 'built-in', 'n8n-agent']),
	config: RunnableAgentJsonConfigSchema,
	sourceId: z.string().min(1).optional(),
	versionId: z.string().min(1).optional(),
});

export const SubAgentRunPolicySchema = z.object({
	maxDepth: z.number().int().min(1).optional(),
	maxChildren: z.number().int().min(1).optional(),
	timeoutMs: z.number().int().min(1).optional(),
	allowedToolNames: z.array(z.string().min(1)).optional(),
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
	parentRunId: z.string().min(1).optional(),
	parentThreadId: z.string().min(1).optional(),
	/** Parent's episodic-memory resource id, inherited so the child shares its scope. */
	parentResourceId: z.string().min(1).optional(),
	parentToolCallId: z.string().min(1).optional(),
	parentTaskPath: SubAgentTaskPathSchema.optional(),
});

export type SubAgentTaskPath = `/root${'' | `/${string}`}`;
export type SubAgentContextMode = z.infer<typeof SubAgentContextModeSchema>;
export type SubAgentExecutionMode = z.infer<typeof SubAgentExecutionModeSchema>;

export type SubAgentSource =
	| { type: 'inline'; config: AgentJsonConfig }
	| { type: 'built-in'; id: string; overrides?: Partial<AgentJsonConfig> }
	| {
			type: 'n8n-agent';
			agentId: string;
			versionId?: string;
			overrides?: Partial<AgentJsonConfig>;
	  };

export interface ResolvedSubAgentSource {
	type: SubAgentSource['type'];
	config: RunnableAgentJsonConfig;
	sourceId?: string;
	versionId?: string;
}

export type SubAgentRunPolicy = z.infer<typeof SubAgentRunPolicySchema>;
export type SubAgentSpawnRequest = z.infer<typeof SubAgentSpawnRequestSchema>;
