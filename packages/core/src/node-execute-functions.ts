import type {
	INode,
	IPollFunctions,
	ITriggerFunctions,
	IWorkflowExecuteAdditionalData,
	Workflow,
	WorkflowActivateMode,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { PollContext, TriggerContext } from './execution-engine/node-execution-context';

/**
 * Returns the execute functions the poll nodes have access to.
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowManager.add
export function getExecutePollFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
): IPollFunctions {
	return new PollContext(workflow, node, additionalData, mode, activation);
}

/**
 * Returns the execute functions the trigger nodes have access to.
 */
// TODO: Check if I can get rid of: additionalData, and so then maybe also at ActiveWorkflowManager.add
export function getExecuteTriggerFunctions(
	workflow: Workflow,
	node: INode,
	additionalData: IWorkflowExecuteAdditionalData,
	mode: WorkflowExecuteMode,
	activation: WorkflowActivateMode,
): ITriggerFunctions {
	return new TriggerContext(workflow, node, additionalData, mode, activation);
}
