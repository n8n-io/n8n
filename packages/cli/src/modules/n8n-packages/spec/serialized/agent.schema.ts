import { AgentJsonConfigSchema, agentSkillSchema } from '@n8n/api-types';
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
		descriptor: z.record(z.unknown()),
	})
	.strict();

export const serializedAgentTaskSchema = z
	.object({
		id: z.string().min(1),
		name: z.string(),
		objective: z.string(),
		cronExpression: z.string(),
		timezone: z.string().nullable(),
	})
	.strict();

export type SerializedAgent = z.infer<typeof serializedAgentSchema>;
export type SerializedAgentTask = z.infer<typeof serializedAgentTaskSchema>;
