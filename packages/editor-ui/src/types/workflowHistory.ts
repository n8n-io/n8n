import type { IWorkflowDb } from '@/Interface';

export type WorkflowHistory = {
	versionId: string;
	authors: string;
	createdAt: string;
};

export type WorkflowVersionId = WorkflowHistory['versionId'];

export type WorkflowVersion = WorkflowHistory & {
	updatedAt: string;
	nodes: IWorkflowDb['nodes'];
	connections: IWorkflowDb['connections'];
	workflowId: IWorkflowDb['id'];
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

export type WorkflowHistoryRequestParams = { take: number; skip?: number };
