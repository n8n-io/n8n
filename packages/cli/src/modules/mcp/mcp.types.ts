import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { User } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import type z from 'zod';

import type { SUPPORTED_MCP_TRIGGERS } from './mcp.constants';
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
export type SearchWorkflowsParams = {
	limit?: number;
	query?: string;
	projectId?: string;
};

export type SearchWorkflowsItem = {
	id: string;
	name: string | null;
	active: boolean | null;
	createdAt: string | null;
	updatedAt: string | null;
	triggerCount: number | null;
	nodes: Array<{ name: string; type: string }>;
	scopes: string[];
	canExecute: boolean;
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

// Telemetry payloads
export type UserConnectedToMCPEventPayload = {
	user_id?: string;
	client_name?: string;
	client_version?: string;
	mcp_connection_status: 'success' | 'error';
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
	| 'unsupported_trigger';

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

type SupportedTriggerNodeTypes = keyof typeof SUPPORTED_MCP_TRIGGERS;

export type MCPTriggersMap = {
	[K in SupportedTriggerNodeTypes]: INode[];
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
	context?: TelemetryAuthContext;
};
