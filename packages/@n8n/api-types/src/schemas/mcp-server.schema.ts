import type { Scope } from '@n8n/permissions';
import { z } from 'zod';

import { projectTypeSchema } from './project.schema';

/**
 * Per-instance PostHog flag for custom MCP servers, with the variants `control` and `test`.
 * Only `test` turns the feature on. Force it with `N8N_FEATURE_FLAG_OVERRIDES`.
 */
export const CUSTOM_MCP_SERVERS_FLAG = '155_custom_mcp_servers';
export const CUSTOM_MCP_SERVERS_FLAG_VARIANT = 'test';

export const MCP_SERVER_NAME_MAX_LENGTH = 128;
export const MCP_SERVER_SLUG_MAX_LENGTH = 64;
export const MCP_SERVER_DESCRIPTION_MAX_LENGTH = 2000;
export const MCP_SERVER_TOOL_NAME_MAX_LENGTH = 64;
export const MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH = 2000;

export const mcpServerNameSchema = z.string().trim().min(1).max(MCP_SERVER_NAME_MAX_LENGTH);

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

/**
 * The slug while the builder types it: lowercase letters, digits, and single dashes. A dash at
 * the end stays, so that the builder can type the next word.
 */
export function mcpServerSlugInput(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+/, '')
		.slice(0, MCP_SERVER_SLUG_MAX_LENGTH);
}

/** The slug that n8n makes from a server name. It is empty when the name has no letter or digit. */
export function mcpServerSlugFromName(name: string): string {
	return mcpServerSlugInput(name).replace(/-+$/, '');
}

/** Clients get the description as the MCP instructions. */
export const mcpServerDescriptionSchema = z.string().trim().max(MCP_SERVER_DESCRIPTION_MAX_LENGTH);

export const mcpServerToolNameSchema = z
	.string()
	.min(1)
	.max(MCP_SERVER_TOOL_NAME_MAX_LENGTH)
	.regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores.');

export const mcpServerToolDescriptionSchema = z
	.string()
	.trim()
	.max(MCP_SERVER_TOOL_DESCRIPTION_MAX_LENGTH);

export const mcpServerToolKindSchema = z.enum(['workflow', 'node', 'agent', 'skill']);
export type McpServerToolKind = z.infer<typeof mcpServerToolKindSchema>;

/** Who wrote the tool text. The UI does not show it. It is kept for the analysis of AI drafts. */
export const mcpServerToolDraftSourceSchema = z.enum(['ai', 'defaults', 'edited']);
export type McpServerToolDraftSource = z.infer<typeof mcpServerToolDraftSourceSchema>;

/** The fields that one "Generate" button writes again. */
export const mcpServerToolDraftFieldSchema = z.enum(['toolName', 'description']);
export type McpServerToolDraftField = z.infer<typeof mcpServerToolDraftFieldSchema>;

/**
 * Why a workflow cannot be a tool. `incompatible_nodes`: the trigger reaches a node that cannot
 * run as a tool, for example a Form node.
 */
export const mcpServerWorkflowUnavailableReasonSchema = z.enum([
	'not_published',
	'missing_trigger',
	'incompatible_nodes',
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

/** The `consentType` hint of a server, so the consent page uses the wording for a server. */
export const MCP_SERVER_CONSENT_TYPE = 'mcp-server';

/**
 * Why a person cannot connect to a server, for the refusal screen after sign-in:
 * - `not_member`: the person has no role in the project of the server.
 * - `no_connect_scope`: the role of the person in the project cannot connect.
 * - `blocked`: a builder blocked the person on this server.
 */
export const mcpServerConnectRefusalSchema = z.enum(['not_member', 'no_connect_scope', 'blocked']);
export type McpServerConnectRefusal = z.infer<typeof mcpServerConnectRefusalSchema>;

export const mcpServerSchema = z.object({
	id: z.string().uuid(),
	projectId: z.string(),
	/** The owner project. The UI names it where it says who can connect. */
	project: z.object({ name: z.string(), type: projectTypeSchema }),
	name: mcpServerNameSchema,
	slug: mcpServerSlugSchema,
	description: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type McpServerResponse = z.infer<typeof mcpServerSchema>;

/**
 * The share page of a server, for anyone with the link. `projectName` names who can connect: the
 * team project, or the owner of a personal project. It is `null` for an owner with no name.
 */
export const mcpServerSharePublicSchema = z.object({
	id: z.string().uuid(),
	slug: mcpServerSlugSchema,
	name: z.string(),
	serverUrl: z.string(),
	projectName: z.string().nullable(),
	projectType: projectTypeSchema,
	canConnect: z.literal(false),
});
export type McpServerSharePublic = z.infer<typeof mcpServerSharePublicSchema>;

/** The share page for a signed-in person who can connect. Broken tools are not in the list. */
export const mcpServerShareDetailSchema = mcpServerSharePublicSchema.extend({
	canConnect: z.literal(true),
	description: z.string(),
	tools: z.array(z.object({ toolName: z.string(), description: z.string() })),
});
export type McpServerShareDetail = z.infer<typeof mcpServerShareDetailSchema>;

export const mcpServerShareSchema = z.discriminatedUnion('canConnect', [
	mcpServerSharePublicSchema,
	mcpServerShareDetailSchema,
]);
export type McpServerShare = z.infer<typeof mcpServerShareSchema>;

/** `reserved`: a deleted server used the slug. Its URL never points to another server. */
export const mcpServerSlugAvailabilitySchema = z.object({
	available: z.boolean(),
	reason: z.enum(['taken', 'reserved']).nullable(),
});
export type McpServerSlugAvailability = z.infer<typeof mcpServerSlugAvailabilitySchema>;

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
	/**
	 * Whether the n8n Assistant can write tool drafts for the user. Without it, the tool keeps the
	 * workflow name and description, and the UI hides the "Generate" buttons.
	 */
	toolDraftsAvailable: z.boolean(),
});
export type McpServerDetailResponse = z.infer<typeof mcpServerDetailSchema>;

/**
 * The answer of a draft call. `not_available`: the n8n Assistant is off or has no model, so the
 * tool keeps its text.
 */
export const mcpServerToolDraftResponseSchema = z.object({
	status: z.enum(['drafted', 'not_available']),
	tool: mcpServerToolSchema,
});
export type McpServerToolDraftResponse = z.infer<typeof mcpServerToolDraftResponseSchema>;

export const mcpServerToolCandidateSchema = z.object({
	workflowId: z.string(),
	name: z.string(),
	description: z.string().nullable(),
	/** `null` when the workflow can be a tool. */
	reason: mcpServerToolCandidateReasonSchema.nullable(),
});
export type McpServerToolCandidate = z.infer<typeof mcpServerToolCandidateSchema>;

/** A person in the Connections tab. A service account never connects, so every row is a person. */
export const mcpServerPersonSchema = z.object({
	userId: z.string().uuid(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string().nullable(),
});
export type McpServerPerson = z.infer<typeof mcpServerPersonSchema>;

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

/**
 * The project scope of each action on custom MCP servers. The REST routes and the n8n Assistant
 * both read it here, so they always ask for the same scope.
 */
export const MCP_SERVER_ACTION_SCOPES = {
	list: 'mcpServer:list',
	create: 'mcpServer:create',
	read: 'mcpServer:read',
	update: 'mcpServer:update',
	delete: 'mcpServer:delete',
	// The workflow picker and every tool change are a change of the server.
	toolCandidates: 'mcpServer:update',
	addTools: 'mcpServer:update',
	updateTool: 'mcpServer:update',
	draftTool: 'mcpServer:update',
	removeTool: 'mcpServer:update',
	listConnections: 'mcpServer:read',
	// Block, restore access, and remove change who can use the server.
	blockPerson: 'mcpServer:update',
	restoreAccess: 'mcpServer:update',
	removePerson: 'mcpServer:update',
} as const satisfies Record<string, Scope>;
