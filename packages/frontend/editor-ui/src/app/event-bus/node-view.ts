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

	/** Command to open import workflow from file picker */
	importWorkflowFromFile: never;

	/** Command to archive current workflow */
	archiveWorkflow: never;

	/** Command to unarchive current workflow */
	unarchiveWorkflow: never;

	/** Command to delete current workflow */
	deleteWorkflow: never;

	/** Command to rename current workflow */
	renameWorkflow: never;

	addTag: never;
}

export const nodeViewEventBus = createEventBus<NodeViewEventBusEvents>();
