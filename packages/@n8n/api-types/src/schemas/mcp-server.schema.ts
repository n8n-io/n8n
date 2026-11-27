import { z } from 'zod';

/**
 * Per-instance PostHog flag for custom MCP servers, with the variants `control` and `test`.
 * Only `test` turns the feature on. Force it with `N8N_FEATURE_FLAG_OVERRIDES`.
 */
export const CUSTOM_MCP_SERVERS_FLAG = '155_custom_mcp_servers';
export const CUSTOM_MCP_SERVERS_FLAG_VARIANT = 'test';

export const MCP_SERVER_SLUG_MAX_LENGTH = 128;
export const MCP_SERVER_TOOL_NAME_MAX_LENGTH = 64;

export const mcpServerNameSchema = z.string().trim().min(1).max(128);

/** Path segment of the server URL `/mcp-servers/<slug>`. It never changes after the create. */
export const mcpServerSlugSchema = z
	.string()
	.trim()
	.min(1)
	.max(MCP_SERVER_SLUG_MAX_LENGTH)
	.regex(
		/^[a-z0-9]+(-[a-z0-9]+)*$/,
		'Use lowercase letters, numbers, and single hyphens between them.',
	);

/** Clients get the description as the MCP instructions. */
export const mcpServerDescriptionSchema = z.string().trim().max(2000);

export const mcpServerToolNameSchema = z
	.string()
	.min(1)
	.max(MCP_SERVER_TOOL_NAME_MAX_LENGTH)
	.regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores.');

export const mcpServerToolDescriptionSchema = z.string().trim().max(2000);

export const mcpServerToolKindSchema = z.enum(['workflow', 'node', 'agent', 'skill']);
export type McpServerToolKind = z.infer<typeof mcpServerToolKindSchema>;

/** Who wrote the tool text. The UI does not show it. It is kept for the analysis of AI drafts. */
export const mcpServerToolDraftSourceSchema = z.enum(['ai', 'defaults', 'edited']);
export type McpServerToolDraftSource = z.infer<typeof mcpServerToolDraftSourceSchema>;

/** The fields that one "Generate" button writes again. */
export const mcpServerToolDraftFieldSchema = z.enum(['toolName', 'description']);
export type McpServerToolDraftField = z.infer<typeof mcpServerToolDraftFieldSchema>;

/** Why a workflow cannot be a tool. */
export const mcpServerWorkflowUnavailableReasonSchema = z.enum([
	'not_published',
	'missing_trigger',
	'caller_policy',
]);
export type McpServerWorkflowUnavailableReason = z.infer<
	typeof mcpServerWorkflowUnavailableReasonSchema
>;

export const mcpServerToolCandidateReasonSchema = z.enum([
	...mcpServerWorkflowUnavailableReasonSchema.options,
	'already_added',
]);
export type McpServerToolCandidateReason = z.infer<typeof mcpServerToolCandidateReasonSchema>;

/** Why a tool is broken. A broken tool stays in the list, and a call returns the reason. */
export const mcpServerToolBrokenReasonSchema = z.enum([
	...mcpServerWorkflowUnavailableReasonSchema.options,
	'deleted',
]);
export type McpServerToolBrokenReason = z.infer<typeof mcpServerToolBrokenReasonSchema>;

export const mcpServerSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string(),
	name: mcpServerNameSchema,
	slug: mcpServerSlugSchema,
	description: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type McpServerResponse = z.infer<typeof mcpServerSchema>;

export const mcpServerToolSchema = z.object({
	id: z.string().uuid(),
	serverId: z.string().uuid(),
	kind: mcpServerToolKindSchema,
	targetId: z.string().nullable(),
	toolName: mcpServerToolNameSchema,
	description: z.string(),
	draftSource: mcpServerToolDraftSourceSchema,
	position: z.number().int(),
	brokenReason: mcpServerToolBrokenReasonSchema.nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type McpServerToolResponse = z.infer<typeof mcpServerToolSchema>;

export const mcpServerDetailSchema = mcpServerSchema.extend({
	tools: z.array(mcpServerToolSchema),
});
export type McpServerDetailResponse = z.infer<typeof mcpServerDetailSchema>;

export const mcpServerToolCandidateSchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	/** `null` when the workflow can be a tool. */
	reason: mcpServerToolCandidateReasonSchema.nullable(),
});
export type McpServerToolCandidate = z.infer<typeof mcpServerToolCandidateSchema>;

const mcpServerPersonSchema = z.object({
	userId: z.string().uuid(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
});

export const mcpServerConnectionSchema = mcpServerPersonSchema.extend({
	oauthClientId: z.string(),
	clientName: z.string(),
	firstUsedAt: z.string().datetime(),
	lastUsedAt: z.string().datetime(),
});
export type McpServerConnectionResponse = z.infer<typeof mcpServerConnectionSchema>;

export const mcpServerBlockSchema = mcpServerPersonSchema.extend({
	blockedById: z.string().uuid().nullable(),
	blockedAt: z.string().datetime(),
});
export type McpServerBlockResponse = z.infer<typeof mcpServerBlockSchema>;

export const mcpServerConnectionsResponseSchema = z.object({
	connections: z.array(mcpServerConnectionSchema),
	blocks: z.array(mcpServerBlockSchema),
});
export type McpServerConnectionsResponse = z.infer<typeof mcpServerConnectionsResponseSchema>;

/** Where a builder action came from. Telemetry and the Assistant tool use it. */
export const mcpServerActionSourceSchema = z.enum(['ui', 'assistant']);
export type McpServerActionSource = z.infer<typeof mcpServerActionSourceSchema>;
