import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type z from 'zod';

import type { WorkflowDetailsOutputSchema } from './tools/get-workflow-details.tool';

export type ToolDefinition<InputArgs extends z.ZodRawShape = z.ZodRawShape> = {
	name: string;
	config: {
		description?: string;
		inputSchema?: InputArgs;
		outputSchema?: z.ZodRawShape;
	};
	handler: ToolCallback<InputArgs>;
};

// Shared MCP tool types
export type SearchWorkflowsParams = {
	limit?: number;
	active?: boolean;
	name?: string;
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

export type UserCalledMCPToolEventPayload = {
	user_id?: string;
	tool_name: string;
	parameters?: Record<string, unknown>;
};
