export type WorkflowActivated = {
	type: 'workflowActivated';
	data: {
		workflowId: string;
		activeVersionId: string;
	};
};

export type WorkflowFailedToActivate = {
	type: 'workflowFailedToActivate';
	data: {
		workflowId: string;
		errorMessage: string;
	};
};

export type WorkflowDeactivated = {
	type: 'workflowDeactivated';
	data: {
		workflowId: string;
	};
};

export type WorkflowAutoDeactivated = {
	type: 'workflowAutoDeactivated';
	data: {
		workflowId: string;
	};
};

export type WorkflowUpdated = {
	type: 'workflowUpdated';
	data: {
		workflowId: string;
		userId: string;
	};
};

export type WorkflowPushMessage =
	| WorkflowActivated
	| WorkflowFailedToActivate
	| WorkflowDeactivated
	| WorkflowAutoDeactivated
	| WorkflowUpdated;
