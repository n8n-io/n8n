import type { CallToolResult } from '@modelcontextprotocol/server';
import type { WorkflowPublishBlockedReason } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type z from 'zod';

import type { Mcpauth_type, McpCallerAuth } from '@/services/oauth-token-verifier-proxy.service';

import type { SUPPORTED_PRODUCTION_MCP_TRIGGERS } from './mcp.constants';
import type { WorkflowDetailsOutputSchema } from './tools/get-workflow-details.tool';

/**
 * Handler signature for MCP tools defined with classic-zod raw shapes. Tools
 * declare schemas as raw shapes; the registration layer bridges them to the
 * Standard Schema interface the v2 SDK expects (see tool-schema.util.ts), so
 * handlers keep receiving the zod-parsed args object.
 */
export type ToolHandler<InputArgs extends z.ZodRawShape = z.ZodRawShape> = (
	args: z.objectOutputType<InputArgs, z.ZodTypeAny>,
	extra?: unknown,
) => CallToolResult | Promise<CallToolResult>;

export type ToolDefinition<InputArgs extends z.ZodRawShape = z.ZodRawShape> = {
	name: string;
	config: {
		description?: string;
		inputSchema?: InputArgs;
		outputSchema?: z.ZodRawShape;
		annotations?: {
			title?: string;
			readOnlyHint?: boolean;
			destructiveHint?: boolean;
			idempotentHint?: boolean;
			openWorldHint?: boolean;
		};
		/** Arbitrary tool metadata, e.g. the MCP App resource marker. */
		_meta?: Record<string, unknown>;
	};
	handler: ToolHandler<InputArgs>;
};

/** Registers a tool on the per-request server if the granted scopes cover it. */
export type RegisterToolFn = <InputArgs extends z.ZodRawShape>(
	tool: ToolDefinition<InputArgs>,
) => void;

/** Read result for a static MCP resource (a single text document). */
type ResourceReadResult = {
	contents: Array<{
		uri: string;
		mimeType: string;
		text: string;
		_meta?: Record<string, unknown>;
	}>;
};

/**
 * A static MCP resource (no URI template). Resources register through the same
 * chokepoint as tools (see McpService.createResourceRegistrar), so no caller
 * touches the raw McpServer.
 */
export type ResourceDefinition = {
	name: string;
	uri: string;
	config: {
		description?: string;
		mimeType?: string;
		/** SEP-2549 client cache hint for this resource's reads. */
		cacheHint?: { ttlMs: number; cacheScope: 'private' | 'public' };
		_meta?: Record<string, unknown>;
	};
	read: () => ResourceReadResult | Promise<ResourceReadResult>;
};

/** Registers a static resource on the per-request server. */
export type RegisterResourceFn = (resource: ResourceDefinition) => void;

// Shared MCP tool types
export const SEARCH_WORKFLOWS_SORT_BY_VALUES = [
	'updatedAt:desc',
	'updatedAt:asc',
	'createdAt:desc',
	'createdAt:asc',
	'name:asc',
	'name:desc',
] as const;

export type SearchWorkflowsSortBy = (typeof SEARCH_WORKFLOWS_SORT_BY_VALUES)[number];

export type SearchWorkflowsParams = {
	limit?: number;
	query?: string;
	projectId?: string;
	tags?: string[];
	sortBy?: SearchWorkflowsSortBy;
	folderId?: string;
	includeSubfolders?: boolean;
};

export type SearchWorkflowsItem = {
	id: string;
	name: string | null;
	description?: string | null;
	active: boolean | null;
	createdAt: string | null;
	updatedAt: string | null;
	triggerCount: number | null;
	availableInMCP: boolean;
	parentFolderId: string | null;
	tags: Array<{ id: string; name: string }>;
};

export type SearchWorkflowsResult = {
	data: SearchWorkflowsItem[];
	count: number;
	error?: string;
};

export type WorkflowDetailsResult = z.infer<WorkflowDetailsOutputSchema>;
export type WorkflowDetailsWorkflow = WorkflowDetailsResult['workflow'];
export type WorkflowDetailsNode = NonNullable<WorkflowDetailsWorkflow['nodes']>[number];

// JSON-RPC types for MCP protocol
export type JSONRPCRequest = {
	jsonrpc?: string;
	method?: string;
	params?: {
		/** 2025-era location; superseded by the `_meta` envelope in 2026-07-28. */
		clientInfo?: McpClientInfo;
		/** Per-request envelope carrying protocol version and client identity. */
		_meta?: Record<string, unknown>;
		[key: string]: unknown;
	};
	id?: string | number | null;
};

export type McpClientInfo = {
	name?: string;
	version?: string;
};

/**
 * What the MCP auth middleware resolved from the bearer token, carried on the
 * request for the handlers downstream of it. Both fields are absent until the
 * middleware runs.
 */
export type McpAuthenticatedRequest = AuthenticatedRequest & {
	mcpCaller?: McpCallerAuth;
	/** `undefined` = not scope-bearing (API key) → full tool access. */
	mcpScopes?: string[];
};

/**
 * The same resolution, in the shape the MCP server is built from. Read off the
 * request by the controller so nothing below it touches Express, and passed as
 * one object because scopes gate which tools register while the caller only
 * labels the tool-call events.
 */
export type McpAuthContext = {
	/**
	 * Required, because this is the field that gates which tools register: a
	 * partial context must not be able to silently expose every tool. `undefined`
	 * = not scope-bearing (API key, legacy token) → all tools register.
	 */
	grantedScopes: string[] | undefined;
	caller?: McpCallerAuth;
};

export type McpAppsTelemetryVariant = 'env_override' | 'variant' | 'control' | 'unassigned';

// Telemetry payloads
export type UserConnectedToMCPEventPayload = {
	user_id?: string;
	client_name?: string;
	client_version?: string;
	/** Protocol revision the client declared in its `_meta` envelope (2026-07-28+). */
	protocol_version?: string;
	auth_type?: Mcpauth_type;
	mcp_connection_status: 'success' | 'error';
	mcp_apps_enabled?: boolean;
	mcp_apps_variant?: McpAppsTelemetryVariant;
	mcp_canvas_groups_enabled?: boolean;
	error?: string;
};

export type ExecuteWorkflowsInputMeta = {
	type?: 'webhook' | 'chat' | 'form';
	parameter_count?: number;
	triggerNodeName?: string;
};

export type WorkflowNotFoundReason =
	| 'workflow_does_not_exist'
	| 'no_permission'
	| 'workflow_archived'
	| 'not_available_in_mcp'
	| 'workflow_not_active'
	| 'unsupported_trigger'
	| 'execution_not_found'
	| 'invalid_pin_data'
	| 'invalid_inputs';

export type UserCalledMCPToolEventPayload = {
	user_id?: string;
	tool_name: string;
	parameters?: Record<string, unknown>;
	results?: {
		success: boolean;
		data?: unknown;
		error?: string | Record<string, unknown>;
		error_reason?: WorkflowNotFoundReason | WorkflowPublishBlockedReason;
	};
};

/**
 * n8n Connect coverage snapshot surfaced in tool output when the
 * gateway is available: the credential and node types it can provide managed
 * credentials for.
 */
export type N8nConnectCoverage = {
	credentialTypes: string[];
	nodes: string[];
};

export type MCPTriggersMap = {
	[K in keyof typeof SUPPORTED_PRODUCTION_MCP_TRIGGERS]: INode[];
};
