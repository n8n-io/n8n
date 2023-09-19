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

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
