import type { Scope } from '@n8n/permissions';
import type { ProjectSharingData } from 'n8n-workflow';

/** Workflow fields the MCP views read off a list response. `WorkflowListItem` satisfies it. */
export type McpWorkflow = {
	id: string;
	name: string;
	description?: string | null;
	scopes?: Scope[];
	homeProject?: ProjectSharingData;
	parentFolder?: { id: string; name: string; parentFolderId: string | null };
};

/** Agent fields the MCP views read off a list response. `Agent` satisfies it. */
export type McpAgent = {
	id: string;
	name: string;
	projectId: string;
	project?: Pick<ProjectSharingData, 'id' | 'name' | 'type'> | null;
};

/** A credential that can be made available in MCP, as `GET /mcp/credentials` returns it. */
export type McpCredential = {
	id: string;
	name: string;
	type: string;
	availableInMCP: boolean;
	/** Whether the current user can change the MCP availability of this credential. */
	canUpdate: boolean;
	homeProject: Pick<ProjectSharingData, 'id' | 'name' | 'type'> | null;
	/** How many n8n nodes can run with this credential. */
	nodeCount: number;
	/** Greater than zero when the credential connects to an MCP server. */
	mcpServerCount: number;
};
