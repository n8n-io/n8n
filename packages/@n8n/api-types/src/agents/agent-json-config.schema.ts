import { z, type ZodError } from 'zod';

import { AgentIntegrationSchema } from './agent-integration.schema';

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

const ObservationalMemoryConfigSchema = z.object({
	enabled: z.boolean().optional(),
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
		credential: z.string().trim().min(1),
		topK: z.number().int().min(1).max(100).optional(),
		maxEntriesPerRun: z.number().int().min(1).max(50).optional(),
	}),
]);

const MemoryConfigSchema = z.object({
	enabled: z.boolean(),
	storage: z.enum(['n8n']),
	lastMessages: z.number().int().min(1).max(200).optional(),
	semanticRecall: SemanticRecallSchema.optional(),
	observationalMemory: ObservationalMemoryConfigSchema.optional(),
	episodicMemory: EpisodicMemoryConfigSchema.optional(),
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

/**
 * Configuration for a single MCP (Model Context Protocol) server attached to
 * an agent. Tool entries from MCP servers are sourced separately from the
 * `tools[]` array — the SDK's `McpClient` prefixes each tool name with the
 * server name to avoid collisions.
 */
const McpServerConfigSchema = z
	.object({
		/**
		 * Unique-per-agent server name. Also used as the SDK tool-name prefix
		 * (e.g. a server named `github` exposes its `create_issue` tool as
		 * `github_create_issue` to the LLM).
		 */
		name: z
			.string()
			.min(1)
			.max(64)
			.regex(/^[a-zA-Z0-9_-]+$/),
		description: z.string().max(512).optional(),
		url: z.string().min(1),
		transport: z.enum(['sse', 'streamableHttp']).default('streamableHttp'),
		/**
		 * Authentication method. In addition to the five named variants, any string
		 * ending in `McpOAuth2Api` is accepted to accommodate registry-specific
		 * credential types (e.g. `notionMcpOAuth2Api`, `githubMcpOAuth2Api`).
		 */
		authentication: z
			.union([
				z.enum(['none', 'bearerAuth', 'headerAuth', 'multipleHeadersAuth', 'mcpOAuth2Api']),
				z.string().endsWith('McpOAuth2Api'),
			])
			.default('none'),
		/** Credential id required when `authentication` is anything other than `none`. */
		credential: z.string().optional(),
		metadata: z
			.object({
				/**
				 * The node-type name this server was created from (e.g. `@n8n/mcp-registry.github`).
				 * When present the config modal renders with the registry node type's form
				 * (correct credential selector, preset field visibility) instead of the generic
				 * MCP Client Tool form.
				 */
				nodeTypeName: z.string().optional(),
			})
			.optional(),
		/**
		 * Restricts which tools from this server are surfaced to the agent.
		 * Tools are matched by their original (un-prefixed) name.
		 *
		 * - `{ mode: 'allow', tools: [...] }` — only the listed tools are surfaced.
		 * - `{ mode: 'exclude', tools: [...] }` — every tool except the listed ones is surfaced.
		 * - absent — every tool the server advertises is surfaced.
		 */
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
			.optional(),
		/**
		 * Human-in-the-loop approval requirements.
		 *
		 * - absent — no approval required (default).
		 * - `{ mode: 'global' }` — every tool from this server requires approval.
		 * - `{ mode: 'selected', tools: [...] }` — only listed tool names
		 *   (un-prefixed) require approval; non-empty.
		 *
		 * Maps onto the SDK's `McpServerConfig.requireApproval`
		 * (`true` / `string[]`) at reconstruction time.
		 */
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
			.optional(),
		connectionTimeoutMs: z.number().int().min(1).max(120_000).optional(),
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
			node: NodeConfigSchema,
			requireApproval: z.boolean().optional(),
		})
		.strict(),
]);

export const AgentJsonConfigSchema = z.object({
	name: z.string().min(1).max(128),
	description: z.string().max(512).optional(),
	model: DraftAgentModelSchema,
	credential: z.string().optional(),
	instructions: z.string(),
	memory: MemoryConfigSchema.optional(),
	tools: z.array(AgentJsonToolConfigSchema).optional(),
	skills: z.array(AgentJsonSkillConfigSchema).optional(),
	providerTools: z.record(z.record(z.unknown())).optional(),
	integrations: z.array(AgentIntegrationSchema).optional(),
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
			toolCallConcurrency: z.number().int().min(1).max(20).optional(),
			maxIterations: z
				.number()
				.int()
				.min(1)
				.max(200)
				.optional()
				.describe(
					'Maximum number of agent loop iterations per run. Do not set unless the user explicitly asks.',
				),
			nodeTools: z
				.object({
					enabled: z.boolean(),
				})
				.optional(),
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
export type AgentJsonToolConfig = z.infer<typeof AgentJsonToolConfigSchema>;
export type AgentJsonWorkflowToolConfig = Extract<AgentJsonToolConfig, { type: 'workflow' }>;
export type AgentJsonNodeToolConfig = Extract<AgentJsonToolConfig, { type: 'node' }>;
export type AgentJsonCustomToolConfig = Extract<AgentJsonToolConfig, { type: 'custom' }>;
export type AgentJsonSkillConfig = z.infer<typeof AgentJsonSkillConfigSchema>;
export type AgentJsonMemoryConfig = z.infer<typeof MemoryConfigSchema>;
export type NodeToolConfig = z.infer<typeof NodeConfigSchema>;
export type AgentJsonMcpServerConfig = z.infer<typeof McpServerConfigSchema>;

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

export function isNodeToolsEnabled(config: AgentJsonConfig['config']): boolean {
	return config?.nodeTools?.enabled === true;
}
