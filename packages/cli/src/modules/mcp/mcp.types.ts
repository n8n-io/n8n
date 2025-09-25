import { type ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IWorkflowDb } from '@n8n/db';
import type { INode, IWorkflowSettings, WorkflowFEMeta } from 'n8n-workflow';
import type z from 'zod';

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

export type WorkflowDetailsNode = Omit<INode, 'credentials'>;

/**
 * Workflow object used in 'Get workflow details' tool
 * We are deriving this from IWorkflowDB by omitting fields that are not surfaced through MCP
 * and overriding types for some
 */
export type WorkflowDetailsWorkflow = Omit<
	IWorkflowDb,
	| 'staticData'
	| 'pinData'
	| 'createdAt'
	| 'updatedAt'
	| 'nodes'
	| 'tags'
	| 'parentFolder'
	| 'settings'
> & {
	name: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	nodes: WorkflowDetailsNode[];
	tags: Array<{ id: string; name: string }>;
	parentFolderId: string | null;
	settings: IWorkflowSettings | null;
	meta: WorkflowFEMeta | null;
};

export type WorkflowDetailsResult = {
	workflow: WorkflowDetailsWorkflow;
	triggerInfo: string;
};

export type McpSettingsUpdateBody = {
	mcpAccessEnabled: boolean;
};
