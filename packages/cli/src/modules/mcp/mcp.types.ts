import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
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

// Prompt-related types
export type PromptOperation = 'create' | 'update' | 'delete' | 'search';

export type PromptData = {
	id: string;
	name: string;
	content: string;
	description: string;
	category: string;
	tags: string;
	version: string;
	availableInMCP: boolean;
	isPublic: boolean;
	createdAt: string;
	updatedAt: string;
};

export type PromptListItem = {
	uri: string;
	name: string;
	description: string;
	category: string;
	tags: string[];
	version: string;
	projectId: string;
	projectName?: string;
};

export type ManagePromptsParams = {
	operation: PromptOperation;
	projectId?: string;
	promptName?: string;
	content?: string;
	description?: string;
	category?: string;
	tags?: string;
	version?: string;
	searchQuery?: string;
};

export type ManagePromptsResult = {
	success: boolean;
	message: string;
	data?: unknown;
};

// MCP Trigger types
type SupportedTriggerNodeTypes = keyof typeof SUPPORTED_MCP_TRIGGERS;

export type MCPTriggersMap = {
	[K in SupportedTriggerNodeTypes]: INode[];
};
