import { AGENT_MODEL_STRING_REGEX, AGENT_REASONING_LEVELS } from '@n8n/api-types';
import { z } from 'zod';

/**
 * Agent intermediate representation. The planner produces this from
 * requirements and bounded decisions; the compiler turns it into
 * `AgentJsonConfig` plus skill and task bodies. Everything that decides what
 * the agent is (channels, tools, memory, schedule, model, approval policy)
 * lives here; the JSON config is only the compiled artifact.
 */

export const AGENT_CHANNEL_TYPES = ['telegram', 'slack', 'discord', 'linear'] as const;
export const agentChannelTypeSchema = z.enum(AGENT_CHANNEL_TYPES);
export type AgentChannelType = z.infer<typeof agentChannelTypeSchema>;

export const agentChannelIrSchema = z.object({
	type: agentChannelTypeSchema,
	credentialId: z.string().optional(),
	/** Channel settings in the integration schema's shape; the compiler fills defaults. */
	settings: z.record(z.string(), z.unknown()).optional(),
});
export type AgentChannelIR = z.infer<typeof agentChannelIrSchema>;

export const agentModelIrSchema = z.discriminatedUnion('mode', [
	/** Host-resolved default model and credential. */
	z.object({ mode: z.literal('default') }),
	z.object({
		mode: z.literal('explicit'),
		model: z.string().regex(AGENT_MODEL_STRING_REGEX, 'Model must be "provider/model-name"'),
		credentialId: z.string().optional(),
	}),
	/** Provider named by the user; the model is resolved from the catalog or asked for. */
	z.object({ mode: z.literal('provider'), provider: z.string().min(1) }),
]);
export type AgentModelIR = z.infer<typeof agentModelIrSchema>;

const toolBase = {
	/** Stable id inside the IR, becomes the tool name after sanitization. */
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	/** When the agent must ask before the tool runs. Policy sets it for writes. */
	requireApproval: z.boolean().optional(),
	/** Sentence the instructions use to say when the agent should reach for this tool. */
	useWhen: z.string().optional(),
};

export const agentToolIrSchema = z.discriminatedUnion('kind', [
	z.object({
		...toolBase,
		kind: z.literal('workflow'),
		workflowId: z.string().optional(),
		workflowName: z.string().min(1),
		allOutputs: z.boolean().optional(),
	}),
	z.object({
		...toolBase,
		kind: z.literal('node'),
		/** Workflow compiler registry operation id, e.g. `slack.message.post`. */
		operationId: z.string().min(1),
		params: z.record(z.string(), z.unknown()).default({}),
		credentialId: z.string().optional(),
		credentialName: z.string().optional(),
	}),
	z.object({ ...toolBase, kind: z.literal('custom') }),
]);
export type AgentToolIR = z.infer<typeof agentToolIrSchema>;

export const agentSkillIrSchema = z.object({
	id: z.string().regex(/^[A-Za-z0-9_-]+$/),
	name: z.string().min(1).max(128),
	description: z.string().min(1).max(512),
	instructions: z.string().min(1),
});
export type AgentSkillIR = z.infer<typeof agentSkillIrSchema>;

export const agentTaskIrSchema = z.object({
	id: z.string().regex(/^[A-Za-z0-9_-]+$/),
	name: z.string().min(1).max(128),
	objective: z.string().min(1),
	cron: z.string().min(1),
	timezone: z.string().min(1).default('UTC'),
	enabled: z.boolean().default(true),
});
export type AgentTaskIR = z.infer<typeof agentTaskIrSchema>;

export const agentInstructionsIrSchema = z.object({
	role: z.string().min(1),
	goals: z.array(z.string()).default([]),
	rules: z.array(z.string()).default([]),
	style: z.string().optional(),
	escalation: z.string().optional(),
	/** The user's own instruction text, kept verbatim. */
	userText: z.string().optional(),
});
export type AgentInstructionsIR = z.infer<typeof agentInstructionsIrSchema>;

export const agentIrSchema = z.object({
	/** Stable addressing key inside the conversation (the `agentRef`). */
	ref: z.string().min(1),
	name: z.string().min(1).max(128),
	purpose: z.string().min(1),
	instructions: agentInstructionsIrSchema,
	channels: z.array(agentChannelIrSchema).default([]),
	model: agentModelIrSchema.default({ mode: 'default' }),
	tools: z.array(agentToolIrSchema).default([]),
	skills: z.array(agentSkillIrSchema).default([]),
	tasks: z.array(agentTaskIrSchema).default([]),
	subAgents: z
		.array(
			z.object({
				agentId: z.string().min(1),
				name: z.string().optional(),
				useWhen: z.string().optional(),
			}),
		)
		.default([]),
	memory: z
		.object({ observational: z.boolean().default(false), episodic: z.boolean().default(false) })
		.default({}),
	mcpServers: z
		.array(
			z.object({
				name: z.string().min(1).max(64),
				url: z.string().min(1),
				transport: z.enum(['sse', 'streamableHttp']).default('streamableHttp'),
				authentication: z.string().default('none'),
				credentialId: z.string().optional(),
			}),
		)
		.default([]),
	options: z
		.object({
			reasoning: z.enum(AGENT_REASONING_LEVELS).optional(),
			webSearch: z.boolean().optional(),
			maxIterations: z.number().int().min(1).max(200).optional(),
		})
		.default({}),
	patternIds: z.array(z.string()).default([]),
});
export type AgentIR = z.infer<typeof agentIrSchema>;
