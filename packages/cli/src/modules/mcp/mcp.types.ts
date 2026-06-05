import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type z from 'zod';

import type { SUPPORTED_PRODUCTION_MCP_TRIGGERS } from './mcp.constants';
import type { WorkflowDetailsOutputSchema } from './tools/get-workflow-details.tool';

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
	};
	handler: ToolCallback<InputArgs>;
};

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
	sortBy?: SearchWorkflowsSortBy;
};

export type SearchWorkflowsItem = {
	id: string;
	name: string | null;
	description?: string | null;
	active: boolean | null;
	createdAt: string | null;
	updatedAt: string | null;
	triggerCount: number | null;
	scopes: string[];
	canExecute: boolean;
	availableInMCP: boolean;
};

export type SearchWorkflowsResult = {
	data: SearchWorkflowsItem[];
	count: number;
};

export type WorkflowDetailsResult = z.infer<WorkflowDetailsOutputSchema>;
export type WorkflowDetailsWorkflow = WorkflowDetailsResult['workflow'];
export type WorkflowDetailsNode = WorkflowDetailsWorkflow['nodes'][number];

// JSON-RPC types for MCP protocol
export type JSONRPCRequest = {
	jsonrpc?: string;
	method?: string;
	params?: {
		clientInfo?: {
			name?: string;
			version?: string;
		};
		[key: string]: unknown;
	};
	id?: string | number | null;
};

export type McpAppsTelemetryVariant = 'env_override' | 'variant' | 'control' | 'unassigned';

// Telemetry payloads
export type UserConnectedToMCPEventPayload = {
	user_id?: string;
	client_name?: string;
	client_version?: string;
	auth_type?: Mcpauth_type;
	mcp_connection_status: 'success' | 'error';
	mcp_apps_enabled?: boolean;
	mcp_apps_variant?: McpAppsTelemetryVariant;
	error?: string;
};

export type ExecuteWorkflowsInputMeta = {
	type: 'webhook' | 'chat' | 'schedule' | 'form';
	parameter_count: number;
};

export type WorkflowNotFoundReason =
	| 'workflow_does_not_exist'
	| 'no_permission'
	| 'workflow_archived'
	| 'not_available_in_mcp'
	| 'workflow_not_active'
	| 'unsupported_trigger'
	| 'execution_not_found'
	| 'invalid_pin_data';

export type UserCalledMCPToolEventPayload = {
	user_id?: string;
	tool_name: string;
	parameters?: Record<string, unknown>;
	results?: {
		success: boolean;
		data?: unknown;
		error?: string | Record<string, unknown>;
		error_reason?: WorkflowNotFoundReason;
	};
};

export type MCPTriggersMap = {
	[K in keyof typeof SUPPORTED_PRODUCTION_MCP_TRIGGERS]: INode[];
};

export type AuthFailureReason =
	| 'missing_authorization_header'
	| 'invalid_bearer_format'
	| 'jwt_decode_failed'
	| 'invalid_token'
	| 'token_not_found_in_db'
	| 'user_not_found'
	| 'user_id_not_in_auth_info'
	| 'unknown_error';

export type Mcpauth_type = 'oauth' | 'api_key' | 'unknown';

export type TelemetryAuthContext = {
	reason: AuthFailureReason;
	auth_type: Mcpauth_type;
	error_details?: string;
};

export type UserWithContext = {
	user: User | null;
	actor?: User;
	context?: TelemetryAuthContext;
	authType?: Mcpauth_type;
};
