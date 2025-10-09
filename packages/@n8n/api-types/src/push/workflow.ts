export type WorkflowActivated = {
	type: 'workflowActivated';
	data: {
		workflowId: string;
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

export type WorkflowPushMessage =
	| WorkflowActivated
	| WorkflowFailedToActivate
	| WorkflowDeactivated;
