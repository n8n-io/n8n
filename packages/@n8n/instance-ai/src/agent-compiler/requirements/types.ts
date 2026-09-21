import { z } from 'zod';

import {
	requirementValueSchema,
	requestedActionSchema,
} from '../../workflow-compiler/requirements/types';
import { agentChannelTypeSchema } from '../ir/schema';

export const agentIntentSchema = z.enum(['create', 'edit']);
export type AgentIntent = z.infer<typeof agentIntentSchema>;

/** A chat surface the user named, supported or not. */
export const channelMentionSchema = z.object({
	/** Normalized name, e.g. `slack`, `whatsapp`. */
	name: z.string(),
	supported: z.boolean(),
	type: agentChannelTypeSchema.optional(),
});
export type ChannelMention = z.infer<typeof channelMentionSchema>;

export const scheduleRequestSchema = z.object({
	text: z.string(),
	cron: z.string().optional(),
});

export const agentRequirementsSchema = z.object({
	intent: requirementValueSchema,
	name: requirementValueSchema,
	purpose: requirementValueSchema,
	channels: z.array(channelMentionSchema).default([]),
	/** Tool actions the agent must be able to take (same decomposition as workflows). */
	toolActions: z.array(requestedActionSchema).default([]),
	/** Existing workflows the user wants attached, by name. */
	workflowTools: z.array(z.string()).default([]),
	subAgentNames: z.array(z.string()).default([]),
	schedules: z.array(scheduleRequestSchema).default([]),
	memory: z
		.object({ observational: z.boolean(), episodic: z.boolean() })
		.default({ observational: false, episodic: false }),
	webSearch: z.boolean().default(false),
	modelProvider: z.string().optional(),
	explicitModel: z.string().optional(),
	approvalPolicy: z.enum(['ask_for_writes', 'ask_always', 'never_ask']).default('ask_for_writes'),
	rules: z.array(z.string()).default([]),
	answers: z.record(z.string(), z.unknown()).default({}),
});
export type AgentRequirements = z.infer<typeof agentRequirementsSchema>;
