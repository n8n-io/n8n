import { z } from 'zod';

import { Z } from '../zod-class';

/**
 * MCP Servers: user-built MCP servers on one instance. Each server exposes
 * selected workflows and agents as tools, and skills and texts as resources.
 * Not the instance MCP server (`/mcp-server/http`) and not the MCP Server Trigger node.
 */

/** Path prefix of the runtime. `/mcp/*` belongs to the MCP Server Trigger node. */
export const MCP_SERVERS_RUNTIME_PREFIX = 'mcp-servers';

/** Thread metadata key that binds an Assistant thread to one MCP server. */
export const INSTANCE_AI_MCP_SERVER_TARGET_METADATA_KEY = 'instanceAiMcpServerTarget';

export const mcpServerAccessModeSchema = z.enum(['public', 'apiKey', 'oauth']);
export type McpServerAccessMode = z.infer<typeof mcpServerAccessModeSchema>;

export const mcpServerToolBehaviorSchema = z.enum(['read', 'write', 'delete']);
export type McpServerToolBehavior = z.infer<typeof mcpServerToolBehaviorSchema>;

export const mcpServerShareVisibilitySchema = z.enum(['instance', 'public']);
export type McpServerShareVisibility = z.infer<typeof mcpServerShareVisibilitySchema>;

export const mcpServerToolKindSchema = z.enum(['workflow', 'agent']);
export type McpServerToolKind = z.infer<typeof mcpServerToolKindSchema>;

export const mcpServerResourceKindSchema = z.enum(['skill', 'text', 'file']);
export type McpServerResourceKind = z.infer<typeof mcpServerResourceKindSchema>;

export const mcpServerCallStatusSchema = z.enum(['ok', 'error', 'declined', 'rateLimited']);
export type McpServerCallStatus = z.infer<typeof mcpServerCallStatusSchema>;

export const mcpServerCallerTypeSchema = z.enum(['user', 'apiKey', 'anonymous', 'playground']);
export type McpServerCallerType = z.infer<typeof mcpServerCallerTypeSchema>;

export const mcpServerSlugSchema = z
	.string()
	.trim()
	.min(2)
	.max(64)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes');

export const mcpServerToolNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.regex(/^[a-zA-Z0-9_-]+$/, 'Use letters, numbers, underscores and dashes');

export const mcpServerToolInputSchema = z.object({
	name: z.string().trim().min(1).max(64),
	type: z.enum(['string', 'number', 'boolean', 'object', 'array']),
	description: z.string().max(1000).optional(),
	required: z.boolean().optional(),
});
export type McpServerToolInput = z.infer<typeof mcpServerToolInputSchema>;

// ---------------------------------------------------------------------------
// Read models
// ---------------------------------------------------------------------------

export interface McpServerToolDto {
	id: string;
	kind: McpServerToolKind;
	targetId: string;
	/** Name of the linked workflow or agent. */
	targetName: string;
	targetProjectId: string | null;
	/** What the AI client sees: the override, else a name derived from the target. */
	name: string;
	nameOverride: string | null;
	description: string;
	descriptionOverride: string | null;
	behavior: McpServerToolBehavior;
	/** Effective inputs: the override, else the inputs of the target. */
	inputs: McpServerToolInput[];
	inputsOverridden: boolean;
	enabled: boolean;
	position: number;
	/** False when the target is missing or cannot run as a tool. */
	available: boolean;
	unavailableReason?: string;
	/** Node names of the workflow, in order, for the preview. */
	previewNodes?: Array<{ name: string; type: string }>;
	calls7d: number;
}

export interface McpServerResourceDto {
	id: string;
	kind: McpServerResourceKind;
	targetId: string | null;
	name: string;
	description: string;
	uri: string;
	mimeType: string;
	size: number;
}

export interface McpServerApiKeyDto {
	id: string;
	label: string;
	keyHint: string;
	createdAt: string;
	lastUsedAt: string | null;
	calls7d: number;
}

export interface McpServerOAuthConnectionDto {
	userId: string;
	userEmail: string;
	userName: string;
	clientName: string;
	firstUsedAt: string;
	lastUsedAt: string;
	revoked: boolean;
}

export interface McpServerSummaryDto {
	id: string;
	slug: string;
	name: string;
	description: string;
	active: boolean;
	accessMode: McpServerAccessMode;
	shareVisibility: McpServerShareVisibility;
	url: string;
	workflowToolCount: number;
	agentToolCount: number;
	skillCount: number;
	resourceCount: number;
	apiKeyCount: number;
	calls7d: number;
	errorRate7d: number;
	ownerName: string;
	updatedAt: string;
}

export interface McpServerDetailDto extends McpServerSummaryDto {
	instructions: string;
	rateLimitPerMinute: number;
	confirmDestructive: boolean;
	confirmWrite: boolean;
	tools: McpServerToolDto[];
	resources: McpServerResourceDto[];
	apiKeys: McpServerApiKeyDto[];
	oauthConnections: McpServerOAuthConnectionDto[];
	shareUrl: string;
}

export interface McpServerCallDto {
	id: string;
	kind: 'tool' | 'resource';
	name: string;
	callerType: McpServerCallerType;
	caller: string;
	clientName: string | null;
	status: McpServerCallStatus;
	durationMs: number | null;
	input: unknown;
	output: unknown;
	error: string | null;
	executionId: string | null;
	workflowId: string | null;
	createdAt: string;
}

export interface McpServerCallListDto {
	items: McpServerCallDto[];
	tools: string[];
	callers: string[];
}

export interface McpServerCountDto {
	name: string;
	count: number;
}

export interface McpServerAnalyticsDto {
	days: number;
	calls: number;
	errorRate: number;
	medianDurationMs: number | null;
	callers: number;
	byTool: McpServerCountDto[];
	byClient: McpServerCountDto[];
	byCaller: McpServerCountDto[];
	byDay: Array<{ date: string; calls: number; errors: number }>;
}

export interface McpServerShareDto {
	slug: string;
	name: string;
	description: string;
	url: string;
	accessMode: McpServerAccessMode;
	ownerName: string;
	active: boolean;
	tools: Array<{ name: string; description: string; behavior: McpServerToolBehavior }>;
	resources: Array<{ name: string; kind: McpServerResourceKind; description: string }>;
}

export interface McpServerCreatedApiKeyDto {
	apiKey: McpServerApiKeyDto;
	/** The raw key. Shown once. */
	key: string;
}

export interface McpServerToolTargetDto {
	kind: McpServerToolKind;
	id: string;
	name: string;
	description: string;
	projectId: string | null;
	/** True when the target can run as a tool. */
	compatible: boolean;
	reason?: string;
}

export interface McpServerSkillTargetDto {
	id: string;
	name: string;
	description: string;
}

export interface McpServerPlaygroundToolCallDto {
	id: string;
	name: string;
	input: unknown;
	output?: unknown;
	status: McpServerCallStatus | 'pending' | 'confirm';
	durationMs?: number;
	/** Set when the tool needs a confirmation from the person. */
	confirmMessage?: string;
}

export interface McpServerPlaygroundMessageDto {
	role: 'user' | 'assistant';
	text: string;
	toolCalls?: McpServerPlaygroundToolCallDto[];
}

export interface McpServerPlaygroundResultDto {
	messages: McpServerPlaygroundMessageDto[];
	/** Set when no model is available on the instance. */
	unavailableReason?: string;
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

export class CreateMcpServerDto extends Z.class({
	name: z.string().trim().min(1).max(128),
	description: z.string().max(2000).optional(),
	slug: mcpServerSlugSchema.optional(),
}) {}

export class UpdateMcpServerDto extends Z.class({
	name: z.string().trim().min(1).max(128).optional(),
	slug: mcpServerSlugSchema.optional(),
	description: z.string().max(2000).optional(),
	instructions: z.string().max(20000).optional(),
	active: z.boolean().optional(),
	accessMode: mcpServerAccessModeSchema.optional(),
	rateLimitPerMinute: z.number().int().min(0).max(100000).optional(),
	shareVisibility: mcpServerShareVisibilitySchema.optional(),
	confirmDestructive: z.boolean().optional(),
	confirmWrite: z.boolean().optional(),
}) {}

export class AddMcpServerToolDto extends Z.class({
	kind: mcpServerToolKindSchema,
	targetId: z.string().min(1),
	name: mcpServerToolNameSchema.optional(),
	description: z.string().max(4000).optional(),
	behavior: mcpServerToolBehaviorSchema.optional(),
}) {}

export class UpdateMcpServerToolDto extends Z.class({
	targetId: z.string().min(1).optional(),
	name: mcpServerToolNameSchema.nullable().optional(),
	description: z.string().max(4000).nullable().optional(),
	behavior: mcpServerToolBehaviorSchema.optional(),
	inputs: z.array(mcpServerToolInputSchema).max(50).nullable().optional(),
	enabled: z.boolean().optional(),
	position: z.number().int().min(0).optional(),
}) {}

export class AddMcpServerResourceDto extends Z.class({
	kind: mcpServerResourceKindSchema,
	/** Skill id, for kind `skill`. */
	targetId: z.string().optional(),
	name: z.string().trim().max(256).optional(),
	description: z.string().max(2000).optional(),
	/** Text body, for kind `text`; UTF-8 text or base64, for kind `file`. */
	content: z
		.string()
		.max(2 * 1024 * 1024)
		.optional(),
	mimeType: z.string().max(128).optional(),
}) {}

export class CreateMcpServerApiKeyDto extends Z.class({
	label: z.string().trim().min(1).max(128),
}) {}

export class McpServerCallsQueryDto extends Z.class({
	tool: z.string().optional(),
	caller: z.string().optional(),
	status: mcpServerCallStatusSchema.optional(),
	limit: z.coerce.number().int().min(1).max(500).optional(),
}) {}

export class McpServerAnalyticsQueryDto extends Z.class({
	days: z.coerce.number().int().min(1).max(365).optional(),
}) {}

export class McpServerPlaygroundRequestDto extends Z.class({
	messages: z
		.array(
			z.object({
				role: z.enum(['user', 'assistant']),
				text: z.string().max(20000),
			}),
		)
		.min(1)
		.max(50),
	/** Answer to a pending confirmation: the tool call id and the decision. */
	confirmation: z
		.object({
			toolCallId: z.string(),
			name: z.string(),
			input: z.record(z.unknown()),
			approved: z.boolean(),
		})
		.optional(),
}) {}
