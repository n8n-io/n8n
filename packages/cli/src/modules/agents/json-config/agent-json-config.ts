import { z, type ZodError } from 'zod';

import { AgentIntegrationSchema } from './integration-config';

const SemanticRecallSchema = z.object({
	topK: z.number().int().min(1).max(100),
	scope: z.enum(['thread', 'resource']).optional(),
	messageRange: z
		.object({
			before: z.number().int().min(0),
			after: z.number().int().min(0),
		})
		.optional(),
	embedder: z.string().optional(),
});

// TODO: Create a list of all supported memory storages, define connection params for each storage
const MemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.enum(['n8n', 'sqlite', 'postgres']),
	connection: z.record(z.unknown()).optional(),
	lastMessages: z.number().int().min(1).max(200).optional(),
	semanticRecall: SemanticRecallSchema.optional(),
});

const ThinkingConfigSchema = z.object({
	provider: z.enum(['anthropic', 'openai']),
	budgetTokens: z.number().int().optional(),
	reasoningEffort: z.string().optional(),
});

const NodeToolCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
});

export const NodeConfigSchema = z.object({
	nodeType: z.string().min(1),
	nodeTypeVersion: z.number(),
	nodeParameters: z.record(z.unknown()).optional().default({}),
	credentials: z.record(NodeToolCredentialSchema).optional(),
});

const AgentJsonSkillConfigSchema = z.object({
	type: z.literal('skill'),
	id: z
		.string()
		.min(1)
		.regex(/^[A-Za-z0-9_-]+$/),
});

const AgentJsonToolConfigSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('custom'),
		id: z
			.string()
			.min(1)
			.regex(/^[A-Za-z0-9_-]+$/),
		requireApproval: z.boolean().optional(),
	}),
	z
		.object({
			type: z.literal('workflow'),
			workflow: z.string().min(1),
			name: z.string().optional(),
			description: z.string().optional(),
			requireApproval: z.boolean().optional(),
			allOutputs: z
				.boolean()
				.optional()
				.describe('Whether to return all node outputs instead of just the last node'),
		})
		.strict(),
	z
		.object({
			type: z.literal('node'),
			name: z.string().min(1),
			description: z.string().optional(),
			node: NodeConfigSchema,
			requireApproval: z.boolean().optional(),
		})
		.strict(),
]);

export const AgentJsonConfigSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().max(512).optional(),
	model: z
		.string()
		.min(1)
		.regex(
			/**
			 * [a-z0-9-]+: Provider name (e.g. "anthropic")
			 * (?:[a-z0-9._-]+\/)*: Zero or more sub-providers (e.g. "openrouter/amazon/nova-micro-v1")
			 * [a-z0-9._-]+: Model name (e.g. "claude-sonnet-4-5")
			 */
			/^[a-z0-9-]+\/(?:[a-z0-9._-]+\/)*[a-z0-9._-]+$/i,
			'Model must be "provider/model-name" format (e.g. "anthropic/claude-sonnet-4-5" or "openrouter/amazon/nova-micro-v1")',
		),
	credential: z.string().optional(),
	instructions: z.string(),
	memory: MemoryConfigSchema.optional(),
	tools: z.array(AgentJsonToolConfigSchema).optional(),
	skills: z.array(AgentJsonSkillConfigSchema).optional(),
	providerTools: z.record(z.record(z.unknown())).optional(),
	integrations: z.array(AgentIntegrationSchema).optional(),
	config: z
		.object({
			thinking: ThinkingConfigSchema.optional(),
			toolCallConcurrency: z.number().int().min(1).max(20).optional(),
			nodeTools: z
				.object({
					enabled: z.boolean(),
				})
				.optional(),
		})
		.optional(),
});

export const AgentJsonConfigPartialSchema = AgentJsonConfigSchema.partial();

export type AgentJsonConfig = z.infer<typeof AgentJsonConfigSchema>;
export type AgentJsonToolConfig = z.infer<typeof AgentJsonToolConfigSchema>;
export type AgentJsonSkillConfig = z.infer<typeof AgentJsonSkillConfigSchema>;
export type AgentJsonConfigRef = AgentJsonToolConfig | AgentJsonSkillConfig;
export type AgentJsonMemoryConfig = z.infer<typeof MemoryConfigSchema>;

export interface ConfigValidationError {
	path: string;
	message: string;
	expected?: string;
	received?: string;
}

export function tryParseConfigJson(
	raw: string,
): { ok: true; data: unknown } | { ok: false; errors: ConfigValidationError[] } {
	try {
		return { ok: true, data: JSON.parse(raw) };
	} catch (e) {
		const msg = e instanceof SyntaxError ? e.message : String(e);
		return { ok: false, errors: [{ path: '(root)', message: `JSON parse error: ${msg}` }] };
	}
}

export function formatZodErrors(error: ZodError): ConfigValidationError[] {
	return error.issues.map((issue) => ({
		path: issue.path.join('.') || '(root)',
		message: issue.message,
		expected: 'expected' in issue ? String(issue.expected) : undefined,
		received: 'received' in issue ? String(issue.received) : undefined,
	}));
}

/**
 * Returns whether the built-in node tool chain (search_nodes, get_node_types,
 * list_credentials, run_node_tool) should be attached to an agent runtime.
 *
 * Absent or partial config defaults to disabled — only an explicit
 * `nodeTools: { enabled: true }` opts an agent in.
 */
export function isNodeToolsEnabled(config: AgentJsonConfig['config']): boolean {
	return config?.nodeTools?.enabled === true;
}
