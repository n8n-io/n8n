import type { ToolDescriptor } from '@n8n/agents';
import {
	AgentJsonConfigSchema,
	agentSkillSchema,
	agentTaskSchema,
	AGENT_TASK_ID_MAX_LENGTH,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import { manifestEntrySchema } from '../manifest.schema';

export const serializedAgentSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		config: AgentJsonConfigSchema.nullable(),
		availableInMCP: z.boolean(),
		skills: z.array(manifestEntrySchema),
		tools: z.array(manifestEntrySchema),
		tasks: z.array(manifestEntrySchema),
	})
	.strict();

export const serializedAgentMetadataSchema = z
	.object({
		versionId: z.string().min(1).nullable(),
		publishedVersionId: z.string().min(1).nullable(),
	})
	.strict();

export const serializedAgentSkillSchema = z
	.object({
		id: z.string().min(1),
		...agentSkillSchema.shape,
	})
	.strict();

export const serializedAgentToolSchema = z
	.object({
		id: z.string().min(1),
		code: z.string(),
		descriptor: z
			.object({
				name: z.string().min(1),
				description: z.string(),
				systemInstruction: z.string().nullable(),
				inputSchema: z.custom<NonNullable<ToolDescriptor['inputSchema']>>(isRecord).nullable(),
				outputSchema: z.custom<NonNullable<ToolDescriptor['outputSchema']>>(isRecord).nullable(),
				hasSuspend: z.boolean(),
				hasResume: z.boolean(),
				hasToMessage: z.boolean(),
				requireApproval: z.boolean(),
				outputTrust: z.literal('untrusted').nullable().optional(),
				providerOptions: z.record(z.unknown()).nullable(),
			})
			.strict(),
	})
	.strict();

export const serializedAgentTaskSchema = z
	.object({
		id: z.string().min(1).max(AGENT_TASK_ID_MAX_LENGTH),
		...agentTaskSchema.shape,
		timezone: agentTaskSchema.shape.timezone.default(null),
	})
	.strict();

export type SerializedAgent = z.infer<typeof serializedAgentSchema>;
export type SerializedAgentTask = z.infer<typeof serializedAgentTaskSchema>;
