import {
	Db,
	IWorkflowErrorData,
	NodeTypes,
	WorkflowExecuteAdditionalData,
} from './';

import {
	WorkflowExecute,
} from 'n8n-core';

import {
	IExecuteData,
	INode,
	IRunExecutionData,
	Workflow,
} from 'n8n-workflow';

import * as config from '../config';

const ERROR_TRIGGER_TYPE = config.get('nodes.errorTriggerType') as string;

/**
 * Returns if the given id is a valid workflow id
 *
 * @param {(string | null | undefined)} id The id to check
 * @returns {boolean}
 * @memberof App
 */
export function isWorkflowIdValid (id: string | null | undefined | number): boolean {
	if (typeof id === 'string') {
		id = parseInt(id, 10);
	}

	if (isNaN(id as number)) {
		return false;

	}
	return true;
}



/**
 * Executes the error workflow
 *
 * @export
 * @param {string} workflowId The id of the error workflow
 * @param {IWorkflowErrorData} workflowErrorData The error data
 * @returns {Promise<void>}
 */
export async function executeErrorWorkflow(workflowId: string, workflowErrorData: IWorkflowErrorData): Promise<void> {
	// Wrap everything in try/catch to make sure that no errors bubble up and all get caught here
	try {
		const workflowData = await Db.collections.Workflow!.findOne({ id: workflowId });

		if (workflowData === undefined) {
			// The error workflow could not be found
			console.error(`ERROR: Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`);
			return;
		}

		const executionMode = 'error';
		const nodeTypes = NodeTypes();

		const workflowInstance = new Workflow(workflowId, workflowData.nodes, workflowData.connections, workflowData.active, nodeTypes, undefined, workflowData.settings);


		let node: INode;
		let workflowStartNode: INode | undefined;
		for (const nodeName of Object.keys(workflowInstance.nodes)) {
			node = workflowInstance.nodes[nodeName];
			if (node.type === ERROR_TRIGGER_TYPE) {
				workflowStartNode = node;
			}
		}

		if (workflowStartNode === undefined) {
			console.error(`ERROR: Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${ERROR_TRIGGER_TYPE}" in workflow "${workflowId}"`);
			return;
		}

		const additionalData = await WorkflowExecuteAdditionalData.get(executionMode, workflowData, workflowInstance);

		// Can execute without webhook so go on
		const workflowExecute = new WorkflowExecute(additionalData, executionMode);

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [];
		nodeExecutionStack.push(
			{
				node: workflowStartNode,
				data: {
					main: [
						[
							{
								json: workflowErrorData
							}
						]
					],
				},
			},
		);

		const runExecutionData: IRunExecutionData = {
			startData: {
			},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
			},
		};

		// Start now to run the workflow
		await workflowExecute.runExecutionData(workflowInstance, runExecutionData);

	} catch (error) {
		console.error(`ERROR: Calling Error Workflow for "${workflowErrorData.workflow.id}": ${error.message}`);
	}
}



/**
 * Saves the static data if it changed
 *
 * @export
 * @param {Workflow} workflow
 * @returns {Promise <void>}
 */
export async function saveStaticData(workflow: Workflow): Promise <void> {
	if (workflow.staticData.__dataChanged === true) {
		// Static data of workflow changed and so has to be saved
		if (isWorkflowIdValid(workflow.id) === true) {
			// Workflow is saved so update in database
			try {
				await Db.collections.Workflow!
					.update(workflow.id!, {
						staticData: workflow.staticData,
					});
				workflow.staticData.__dataChanged = false;
			} catch (e) {
				// TODO: Add proper logging!
				console.error(`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: ${e.message}`);
			}
		}
	}
}
