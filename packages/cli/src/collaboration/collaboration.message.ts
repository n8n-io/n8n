export type CollaborationMessage = WorkflowOpenedMessage | WorkflowClosedMessage;

export type WorkflowOpenedMessage = {
	type: 'workflowOpened';
	workflowId: string;
};

export type WorkflowClosedMessage = {
	type: 'workflowClosed';
	workflowId: string;
};

const isWorkflowMessage = (msg: unknown): msg is CollaborationMessage => {
	return typeof msg === 'object' && msg !== null && 'type' in msg;
};

export const isWorkflowOpenedMessage = (msg: unknown): msg is WorkflowOpenedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowOpened';
};

export const isWorkflowClosedMessage = (msg: unknown): msg is WorkflowClosedMessage => {
	return isWorkflowMessage(msg) && msg.type === 'workflowClosed';
};
