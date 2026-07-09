import type { IWorkflowSettings } from 'n8n-workflow';

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
		errorDescription?: string;
		nodeId?: string;
	};
};

/**
 * Sent when publishing a workflow succeeds for some triggers but not all: the
 * new version stays published with the surviving triggers running, while
 * `failedNodes` lists the triggers that could not be (re)activated (e.g. a
 * webhook path conflict or a third-party registration error). The client
 * surfaces the error and re-syncs the viewed workflow to `activeVersionId`.
 */
export type WorkflowPartiallyActivated = {
	type: 'workflowPartiallyActivated';
	data: {
		workflowId: string;
		activeVersionId: string;
		errorMessage: string;
		failedNodes: Array<{
			nodeId: string;
			nodeName: string;
			errorMessage: string;
		}>;
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

export type WorkflowSettingsUpdated = {
	type: 'workflowSettingsUpdated';
	data: {
		workflowId: string;
		settings: Partial<IWorkflowSettings>;
		checksum?: string;
	};
};

export type WorkflowPushMessage =
	| WorkflowActivated
	| WorkflowFailedToActivate
	| WorkflowPartiallyActivated
	| WorkflowDeactivated
	| WorkflowAutoDeactivated
	| WorkflowUpdated
	| WorkflowSettingsUpdated;
