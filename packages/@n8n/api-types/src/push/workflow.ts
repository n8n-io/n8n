type WorkflowActivated = {
	type: 'workflowActivated';
	data: {
		workflowId: string;
	};
};

type WorkflowFailedToActivate = {
	type: 'workflowFailedToActivate';
	data: {
		workflowId: string;
		errorMessage: string;
	};
};

type WorkflowDeactivated = {
	type: 'workflowDeactivated';
	data: {
		workflowId: string;
	};
};

export type WorkflowPushMessage =
	| WorkflowActivated
	| WorkflowFailedToActivate
	| WorkflowDeactivated;
