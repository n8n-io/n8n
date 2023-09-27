import type { IWorkflowDb } from '@/Interface';
import type { HasAtLeastOneKey } from '@/utils/typeHelpers';

export type WorkflowHistory = {
	versionId: string;
	authors: string;
	createdAt: string;
};

export type WorkflowVersion = WorkflowHistory & {
	nodes: IWorkflowDb['nodes'];
	connection: IWorkflowDb['connections'];
	workflow: IWorkflowDb;
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];

export type WorkflowHistoryRequestParams = HasAtLeastOneKey<{ take?: number; skip?: number }>;
