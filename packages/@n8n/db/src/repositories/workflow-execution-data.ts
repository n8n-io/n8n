import type { IWorkflowBase } from 'n8n-workflow';

export type AgentToolWorkflowReference = Readonly<{
	workflowId?: string;
	workflowName: string;
}>;

export type WorkflowVersionFingerprint = Readonly<{
	workflowId: string;
	versionId: string;
}>;

export type PublishedWorkflowDataForExecution = Pick<
	IWorkflowBase,
	| 'id'
	| 'name'
	| 'description'
	| 'active'
	| 'isArchived'
	| 'createdAt'
	| 'updatedAt'
	| 'settings'
	| 'staticData'
	| 'activeVersionId'
	| 'versionCounter'
	| 'nodes'
	| 'connections'
	| 'nodeGroups'
> & { versionId: string };
