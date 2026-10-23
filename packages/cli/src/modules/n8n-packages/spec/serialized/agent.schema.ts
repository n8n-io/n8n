import type { ToolDescriptor } from '@n8n/agents';
import {
	AgentJsonConfigBaseSchema,
	AgentJsonConfigSchema,
	agentSkillSchema,
	agentTaskSchema,
	AGENT_TASK_ID_MAX_LENGTH,
	CUSTOM_TOOL_ID_REGEX,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

const skillIdSchema = AgentJsonConfigBaseSchema.shape.skills.unwrap().innerType().element.shape.id;
const taskIdSchema = AgentJsonConfigBaseSchema.shape.tasks
	.unwrap()
	.element.shape.id.max(AGENT_TASK_ID_MAX_LENGTH);
const customToolIdSchema = z.string().min(1).regex(CUSTOM_TOOL_ID_REGEX);

const toolDescriptorSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		systemInstruction: z.string().nullable(),
		inputSchema: z.custom<NonNullable<ToolDescriptor['inputSchema']>>(isRecord).nullable(),
		outputSchema: z.custom<NonNullable<ToolDescriptor['outputSchema']>>(isRecord).nullable(),
		hasSuspend: z.boolean(),
		hasResume: z.boolean(),
		hasToMessage: z.boolean(),
		requireApproval: z.boolean(),
		outputTrust: z.literal('untrusted').nullish(),
		providerOptions: z.record(z.unknown()).nullable(),
	})
	.strict() satisfies z.ZodType<ToolDescriptor>;

export const serializedAgentToolSchema = z
	.object({
		code: z.string(),
		descriptor: toolDescriptorSchema,
	})
	.strict();

export const serializedAgentTaskSchema = agentTaskSchema
	.extend({
		timezone: agentTaskSchema.shape.timezone.default(null),
	})
	.strict();

export const serializedAgentSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1).max(128),
		config: AgentJsonConfigSchema.nullable(),
		availableInMCP: z.boolean(),
		skills: z.record(skillIdSchema, agentSkillSchema),
		tools: z.record(customToolIdSchema, serializedAgentToolSchema),
		tasks: z.record(taskIdSchema, serializedAgentTaskSchema),
	})
	.strict();

export const serializedAgentMetadataSchema = z
	.object({
		versionId: z.string().min(1).nullable(),
		publishedVersionId: z.string().min(1).nullable(),
	})
	.strict();

export type SerializedAgent = z.infer<typeof serializedAgentSchema>;
export type SerializedAgentMetadata = z.infer<typeof serializedAgentMetadataSchema>;
export type SerializedAgentSkill = z.infer<typeof agentSkillSchema>;
export type SerializedAgentTool = z.infer<typeof serializedAgentToolSchema>;
export type SerializedAgentTask = z.infer<typeof serializedAgentTaskSchema>;
