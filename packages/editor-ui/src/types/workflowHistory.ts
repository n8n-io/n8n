import type { IWorkflowDb } from '@/Interface';

export type WorkflowHistory = {
	versionId: string;
	authors: string;
	createdAt: string;
	updatedAt: string;
};

export type WorkflowVersionId = WorkflowHistory['versionId'];

export type WorkflowVersion = WorkflowHistory &
	Pick<IWorkflowDb, 'nodes' | 'connections'> & { workflowId: IWorkflowDb['id'] };

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

export type WorkflowHistoryRequestParams = { take: number; skip?: number };
