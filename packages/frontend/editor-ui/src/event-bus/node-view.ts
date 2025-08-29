import { createEventBus } from '@n8n/utils/event-bus';
import type { IDataObject } from 'n8n-workflow';

export interface NodeViewEventBusEvents {
	/** Command to create a new workflow */
	newWorkflow: never;

	/** Command to open the chat */
	openChat: never;

	/** Command to import a workflow from given data */
	importWorkflowData: IDataObject;

	/** Command to import a workflow from given URL */
	importWorkflowUrl: IDataObject;

	'runWorkflowButton:mouseenter': never;

	'runWorkflowButton:mouseleave': never;

	/** Command to tidy up the canvas */
	tidyUp: never;
}

export const nodeViewEventBus = createEventBus<NodeViewEventBusEvents>();
