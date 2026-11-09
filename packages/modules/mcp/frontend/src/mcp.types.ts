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
