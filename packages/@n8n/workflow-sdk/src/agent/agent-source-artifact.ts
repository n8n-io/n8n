import { z } from 'zod';

function isJsonCompatible(value: unknown): boolean {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'boolean' ||
		(typeof value === 'number' && Number.isFinite(value))
	) {
		return true;
	}
	if (Array.isArray(value)) return value.every(isJsonCompatible);
	if (typeof value !== 'object' || value === null) return false;
	const prototype = Reflect.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return false;
	return Object.values(value).every(isJsonCompatible);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Reflect.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

const JsonObjectSchema = z
	.custom<Record<string, unknown>>(isJsonObject, {
		message: 'Agent source value must be an object.',
	})
	.superRefine((value, context) => {
		if (!isJsonCompatible(value)) {
			context.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Agent source values must be JSON-serializable data.',
			});
		}
	});

const AgentSourceCredentialSchema = z
	.object({
		id: z.string(),
		name: z.string(),
	})
	.strict();

const AgentSourceNodeToolSchema = z
	.object({
		type: z.literal('node'),
		name: z.string().trim().min(1),
		description: z.string().optional(),
		requireApproval: z.boolean().optional(),
		node: z
			.object({
				nodeType: z.string().min(1),
				nodeTypeVersion: z.number().finite(),
				nodeParameters: JsonObjectSchema,
				credentials: z.record(z.string(), AgentSourceCredentialSchema).optional(),
			})
			.strict(),
	})
	.strict();

const AgentSourceWorkflowToolSchema = z
	.object({
		type: z.literal('workflow'),
		workflow: z.string().min(1),
		name: z.string().trim().min(1).optional(),
		description: z.string().optional(),
		requireApproval: z.boolean().optional(),
		allOutputs: z.boolean().optional(),
	})
	.strict();

const AgentSourceCustomToolSchema = z
	.object({
		type: z.literal('custom'),
		id: z.string().min(1),
		requireApproval: z.boolean().optional(),
	})
	.strict();

export const AgentSourceToolSchema = z.discriminatedUnion('type', [
	AgentSourceNodeToolSchema,
	AgentSourceWorkflowToolSchema,
	AgentSourceCustomToolSchema,
]);

export const AgentSourceSkillSchema = z
	.object({
		type: z.literal('skill'),
		id: z.string().min(1),
	})
	.strict();

const AgentSourceSubAgentSchema = z
	.object({
		agentId: z.string().min(1),
		useWhen: z.string().optional(),
	})
	.strict();

export const AgentSourceCoreConfigSchema = z
	.object({
		name: z.string().trim().min(1),
		model: z.string(),
		credential: z.string(),
		instructions: z.string(),
		memory: JsonObjectSchema,
		subAgents: z
			.object({
				maxChildren: z.number().int().optional(),
				agents: z.array(AgentSourceSubAgentSchema),
				modelsByDifficulty: JsonObjectSchema.optional(),
			})
			.strict(),
		tools: z.array(AgentSourceToolSchema),
		skills: z.array(AgentSourceSkillSchema),
		providerTools: z.record(z.string(), JsonObjectSchema),
		mcpServers: z.array(JsonObjectSchema),
		vectorStores: z.array(JsonObjectSchema),
		config: JsonObjectSchema,
	})
	.strict();

export const AgentSourceDiagnosticSchema = z
	.object({
		code: z.string(),
		message: z.string(),
		filePath: z.string().optional(),
		line: z.number().int().positive().optional(),
		column: z.number().int().positive().optional(),
		path: z.string().optional(),
		toolName: z.string().optional(),
		nodeType: z.string().optional(),
		nodeTypeVersion: z.number().finite().optional(),
		suggestion: z.string().optional(),
	})
	.strict();

export const AgentSourceArtifactV1Schema = z
	.object({
		kind: z.literal('n8n-agent-source'),
		version: z.literal(1),
		core: AgentSourceCoreConfigSchema,
		warnings: z.array(AgentSourceDiagnosticSchema),
	})
	.strict();

export type AgentSourceTool = z.infer<typeof AgentSourceToolSchema>;
export type AgentSourceSkill = z.infer<typeof AgentSourceSkillSchema>;
export type AgentSourceCoreConfig = z.infer<typeof AgentSourceCoreConfigSchema>;
export type AgentSourceDiagnostic = z.infer<typeof AgentSourceDiagnosticSchema>;
export type AgentSourceArtifactV1 = z.infer<typeof AgentSourceArtifactV1Schema>;
