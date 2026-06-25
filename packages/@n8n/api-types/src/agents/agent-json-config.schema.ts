import { z, type ZodError } from 'zod';

import { AgentIntegrationConfigSchema } from './agent-integration.schema';
import {
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_MAX_CHILDREN_MAX,
	SUB_AGENT_MAX_CHILDREN_MIN,
} from './sub-agent.schema';

export const AgentModelSchema = z
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
	);

const MemoryWorkerModelSchema = z.object({
	model: AgentModelSchema,
	credential: z.string().trim(),
});

const ObservationalMemoryConfigSchema = z.object({
	enabled: z.boolean().optional(),
	observerModel: MemoryWorkerModelSchema.optional(),
	reflectorModel: MemoryWorkerModelSchema.optional(),
	observerThresholdTokens: z.number().int().min(1).optional(),
	reflectorThresholdTokens: z.number().int().min(1).optional(),
	renderTokenBudget: z.number().int().min(1).optional(),
	observationLogTailLimit: z.number().int().min(1).optional(),
	lockTtlMs: z.number().int().min(0).optional(),
});

const EpisodicMemoryConfigSchema = z.discriminatedUnion('enabled', [
	z.object({
		enabled: z.literal(false),
	}),
	z.object({
		enabled: z.literal(true),
		credential: z.string().trim(),
		extractorModel: MemoryWorkerModelSchema.optional(),
		reflectorModel: MemoryWorkerModelSchema.optional(),
		topK: z.number().int().min(1).max(100).optional(),
		maxEntriesPerRun: z.number().int().min(1).max(50).optional(),
	}),
]);

const MemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.enum(['n8n']),
	observationalMemory: ObservationalMemoryConfigSchema.optional(),
	episodicMemory: EpisodicMemoryConfigSchema.optional(),
});

const ThinkingConfigSchema = z.object({
	provider: z.enum(['anthropic', 'openai']),
	budgetTokens: z.number().int().optional(),
	reasoningEffort: z.string().optional(),
});

const WebSearchConfigSchema = z.object({
	enabled: z.boolean(),
	provider: z.enum(['auto', 'native', 'brave', 'searxng']).optional(),
	credential: z.string().optional(),
});

export const SUB_AGENT_USE_WHEN_MAX_LENGTH = 512;

const SubAgentConfigSchema = z
	.object({
		agentId: z.string().trim().min(1),
		useWhen: z.string().trim().max(SUB_AGENT_USE_WHEN_MAX_LENGTH).optional(),
	})
	.strict();

export const SUB_AGENT_TASK_DIFFICULTIES = ['low', 'medium', 'high'] as const;
const SubAgentTaskDifficultySchema = z.enum(SUB_AGENT_TASK_DIFFICULTIES);

const SubAgentDifficultyModelConfigSchema = z
	.object({
		model: AgentModelSchema,
		credential: z.string().trim(),
	})
	.strict();

const SubAgentsConfigSchema = z
	.object({
		maxChildren: z
			.number()
			.int()
			.min(SUB_AGENT_MAX_CHILDREN_MIN)
			.max(SUB_AGENT_MAX_CHILDREN_MAX)
			.optional()
			.describe(
				`Maximum number of child sub-agent runs this parent agent may run in parallel. Defaults to ${SUB_AGENT_MAX_CHILDREN_DEFAULT} when unset.`,
			),
		agents: z.array(SubAgentConfigSchema).optional(),
		modelsByDifficulty: z
			.object({
				low: SubAgentDifficultyModelConfigSchema.optional(),
				medium: SubAgentDifficultyModelConfigSchema.optional(),
				high: SubAgentDifficultyModelConfigSchema.optional(),
			})
			.strict()
			.optional()
			.describe(
				'Optional inline sub-agent model mappings by task difficulty. Missing mappings fall back to the parent agent model.',
			),
	})
	.strict();

const NodeToolCredentialSchema = z.object({
	id: z.string(),
	name: z.string(),
});

const DraftAgentModelSchema = z.union([z.literal(''), AgentModelSchema]);

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

const AgentJsonTaskConfigSchema = z.object({
	type: z.literal('task'),
	id: z
		.string()
		.min(1)
		.regex(/^[A-Za-z0-9_-]+$/),
	enabled: z.boolean(),
});

export const McpAuthenticationSchemaTypes = z.enum([
	'none',
	'bearerAuth',
	'headerAuth',
	'multipleHeadersAuth',
	'mcpOAuth2Api',
]);

/**
 * Configuration for a single MCP (Model Context Protocol) server attached to
 * an agent. Tool entries from MCP servers are sourced separately from the
 * `tools[]` array — the SDK's `McpClient` prefixes each tool name with the
 * server name to avoid collisions.
 */
export const McpServerConfigSchema = z
	.object({
		name: z
			.string()
			.min(1)
			.max(64)
			.regex(/^[a-zA-Z0-9_-]+$/)
			.describe(
				'Unique server name, also used as the SDK tool-name prefix (e.g. github -> github_create_issue)',
			),
		description: z.string().max(512).optional().describe('Human-readable server description'),
		url: z.string().min(1).describe('MCP server endpoint URL'),
		transport: z
			.enum(['sse', 'streamableHttp'])
			.default('streamableHttp')
			.describe('Transport protocol'),
		authentication: z
			.union([McpAuthenticationSchemaTypes, z.string().endsWith('McpOAuth2Api')])
			.default('none')
			.describe(
				'Auth method. Named variants or any string ending in McpOAuth2Api for registry credential types',
			),
		credential: z
			.string()
			.optional()
			.describe('Credential id from ask_credential. Required when authentication is not "none"'),
		metadata: z
			.object({
				nodeTypeName: z
					.string()
					.optional()
					.describe(
						'Source node type for registry servers (e.g. @n8n/mcp-registry.github). Enables correct UI form',
					),
			})
			.optional()
			.describe(
				'Server-generated metadata. Do not set this manually, only copy from search_mcp_servers result if present',
			),
		toolFilter: z
			.discriminatedUnion('mode', [
				z
					.object({
						mode: z.literal('allow'),
						tools: z.array(z.string().min(1)).default([]),
					})
					.strict(),
				z
					.object({
						mode: z.literal('exclude'),
						tools: z.array(z.string().min(1)).default([]),
					})
					.strict(),
			])
			.optional()
			.describe('Restricts which tools are surfaced. Tools matched by original un-prefixed name'),
		approval: z
			.discriminatedUnion('mode', [
				z.object({ mode: z.literal('global') }).strict(),
				z
					.object({
						mode: z.literal('selected'),
						tools: z.array(z.string().min(1)).min(1),
					})
					.strict(),
			])
			.optional()
			.describe('Human-in-the-loop approval. Absent = no approval required'),
		connectionTimeoutMs: z
			.number()
			.int()
			.min(1)
			.max(120_000)
			.optional()
			.describe('Connection timeout in milliseconds'),
	})
	.strict();

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
			inputSchema: z.never().optional(),
			node: NodeConfigSchema,
			requireApproval: z.boolean().optional(),
		})
		.strict(),
]);

export const AgentJsonConfigSchema = z.object({
	name: z.string().min(1).max(128),
	model: DraftAgentModelSchema,
	credential: z.string().optional(),
	instructions: z.string(),
	memory: MemoryConfigSchema.optional(),
	subAgents: SubAgentsConfigSchema.optional(),
	tools: z.array(AgentJsonToolConfigSchema).optional(),
	skills: z.array(AgentJsonSkillConfigSchema).optional(),
	tasks: z.array(AgentJsonTaskConfigSchema).optional(),
	providerTools: z.record(z.record(z.unknown())).optional(),
	integrations: z.array(AgentIntegrationConfigSchema).optional(),
	mcpServers: z
		.array(McpServerConfigSchema)
		.max(20)
		.refine((servers) => new Set(servers.map((s) => s.name)).size === servers.length, {
			message: 'MCP server names must be unique within an agent',
		})
		.optional(),
	config: z
		.object({
			thinking: ThinkingConfigSchema.optional(),
			webSearch: WebSearchConfigSchema.optional(),
			toolCallConcurrency: z.number().int().min(1).max(100).optional(),
			maxIterations: z
				.number()
				.int()
				.min(1)
				.max(200)
				.optional()
				.describe(
					'Maximum number of agent loop iterations per run. Do not set unless the user explicitly asks.',
				),
		})
		.optional(),
});

export const RunnableAgentJsonConfigSchema = AgentJsonConfigSchema.extend({
	model: AgentModelSchema,
	credential: z.string().refine((value) => value.trim().length > 0, {
		message: 'Credential is required',
	}),
});

export const AgentJsonConfigPartialSchema = AgentJsonConfigSchema.partial();

export type AgentJsonConfig = z.infer<typeof AgentJsonConfigSchema>;
export type RunnableAgentJsonConfig = z.infer<typeof RunnableAgentJsonConfigSchema>;
export type AgentJsonToolConfig = z.infer<typeof AgentJsonToolConfigSchema>;
export type AgentJsonWorkflowToolConfig = Extract<AgentJsonToolConfig, { type: 'workflow' }>;
export type AgentJsonNodeToolConfig = Extract<AgentJsonToolConfig, { type: 'node' }>;
export type AgentJsonCustomToolConfig = Extract<AgentJsonToolConfig, { type: 'custom' }>;
export type AgentJsonSkillConfig = z.infer<typeof AgentJsonSkillConfigSchema>;
export type AgentJsonTaskConfig = z.infer<typeof AgentJsonTaskConfigSchema>;
export type AgentJsonMemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type NodeToolConfig = z.infer<typeof NodeConfigSchema>;
export type AgentJsonMcpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpAuthenticationSchemaType = z.infer<typeof McpAuthenticationSchemaTypes>;
export type SubAgentTaskDifficulty = z.infer<typeof SubAgentTaskDifficultySchema>;

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
