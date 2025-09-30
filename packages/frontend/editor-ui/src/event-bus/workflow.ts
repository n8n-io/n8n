import { createEventBus } from '@n8n/utils/event-bus';

export interface WorkflowExecutionFinishedEvent {
	workflowId: string;
	executionId: string;
	templateId?: string;
	status: string;
}

export interface WorkflowEventBusEvents {
	/** Emitted when a workflow execution finishes (success, error, or canceled) */
	executionFinished: WorkflowExecutionFinishedEvent;
}

export const workflowEventBus = createEventBus<WorkflowEventBusEvents>();
