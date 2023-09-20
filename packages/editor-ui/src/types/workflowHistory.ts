import type { IWorkflowDb } from '@/Interface';

type WorkflowHistoryBase = {
	id: string;
	authors: string;
};

export type WorkflowHistory = WorkflowHistoryBase & {
	createdAt: string;
};

export type WorkflowHistoryUnsaved = WorkflowHistoryBase & {
	title: string;
};

export type WorkflowVersion = WorkflowHistory & {
	workflow: IWorkflowDb;
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
