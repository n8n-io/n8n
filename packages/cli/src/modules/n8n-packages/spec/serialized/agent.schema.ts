import type { ToolDescriptor } from '@n8n/agents';
import { AgentJsonConfigSchema, agentSkillSchema } from '@n8n/api-types';
import { z } from 'zod';

const serializedAgentTaskSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	objective: z.string(),
	cronExpression: z.string().min(1),
	timezone: z.string().nullable(),
});

// `target` is the package path of the file's bytes: the manifest has no
// per-file entries, so agent.json is the index of its own binary payloads.
const serializedAgentFileSchema = z.object({
	fileName: z.string().min(1),
	mimeType: z.string().min(1),
	fileSizeBytes: z.number().int().nonnegative(),
	target: z.string().min(1),
});

const toolDescriptorSchema = z.custom<ToolDescriptor>(
	(value) => typeof value === 'object' && value !== null && !Array.isArray(value),
);

export const serializedAgentSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	// The composed view (integrations inlined), the same shape the config API serves.
	config: AgentJsonConfigSchema.nullable(),
	tools: z.record(z.object({ code: z.string(), descriptor: toolDescriptorSchema })),
	skills: z.record(agentSkillSchema),
	tasks: z.array(serializedAgentTaskSchema),
	availableInMCP: z.boolean(),
	files: z.array(serializedAgentFileSchema),
});

export type SerializedAgent = z.infer<typeof serializedAgentSchema>;
export type SerializedAgentTask = z.infer<typeof serializedAgentTaskSchema>;
export type SerializedAgentFile = z.infer<typeof serializedAgentFileSchema>;
