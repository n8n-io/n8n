export type WorkflowHistory = {
	id: string;
	createdAt: string;
	editors: string[];
};

export type WorkflowHistoryActionTypes = ['restore', 'clone', 'open', 'download'];
