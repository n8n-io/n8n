export type WorkflowHistory = {
	id: string;
	createdAt: string;
	authors: string;
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
