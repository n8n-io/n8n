import {
	CredentialTypes,
	Db,
	ICredentialsTypeData,
	ITransferNodeTypes,
	IWorkflowErrorData,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	WorkflowCredentials,
	WorkflowRunner,
} from './';

import {
	IDataObject,
	IExecuteData,
	INode,
	IRun,
	IRunExecutionData,
	ITaskData,
	IWorkflowCredentials,
	LoggerProxy as Logger,
	Workflow,} from 'n8n-workflow';

import * as config from '../config';

const ERROR_TRIGGER_TYPE = config.get('nodes.errorTriggerType') as string;


/**
 * Returns the data of the last executed node
 *
 * @export
 * @param {IRun} inputData
 * @returns {(ITaskData | undefined)}
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const runData = inputData.data.resultData.runData;
	const lastNodeExecuted = inputData.data.resultData.lastNodeExecuted;

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	return runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];
}



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
			Logger.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`, { workflowId });
			return;
		}

		const executionMode = 'error';
		const nodeTypes = NodeTypes();

		const workflowInstance = new Workflow({ id: workflowId, name: workflowData.name, nodeTypes, nodes: workflowData.nodes, connections: workflowData.connections, active: workflowData.active, staticData: workflowData.staticData, settings: workflowData.settings});

		let node: INode;
		let workflowStartNode: INode | undefined;
		for (const nodeName of Object.keys(workflowInstance.nodes)) {
			node = workflowInstance.nodes[nodeName];
			if (node.type === ERROR_TRIGGER_TYPE) {
				workflowStartNode = node;
			}
		}

		if (workflowStartNode === undefined) {
			Logger.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${ERROR_TRIGGER_TYPE}" in workflow "${workflowId}"`);
			return;
		}

		// Can execute without webhook so go on

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [];
		nodeExecutionStack.push(
			{
				node: workflowStartNode,
				data: {
					main: [
						[
							{
								json: workflowErrorData,
							},
						],
					],
				},
			}
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

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			workflowData,
		};

		const workflowRunner = new WorkflowRunner();
		await workflowRunner.run(runData);
	} catch (error) {
		Logger.error(`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error.message}"`, { workflowId: workflowErrorData.workflow.id });
	}
}



/**
 * Returns all the defined NodeTypes
 *
 * @export
 * @returns {ITransferNodeTypes}
 */
export function getAllNodeTypeData(): ITransferNodeTypes {
	const nodeTypes = NodeTypes();

	// Get the data of all thenode types that they
	// can be loaded again in the process
	const returnData: ITransferNodeTypes = {};
	for (const nodeTypeName of Object.keys(nodeTypes.nodeTypes)) {
		if (nodeTypes.nodeTypes[nodeTypeName] === undefined) {
			throw new Error(`The NodeType "${nodeTypeName}" could not be found!`);
		}

		returnData[nodeTypeName] = {
			className: nodeTypes.nodeTypes[nodeTypeName].type.constructor.name,
			sourcePath: nodeTypes.nodeTypes[nodeTypeName].sourcePath,
		};
	}

	return returnData;
}



/**
 * Returns the data of the node types that are needed
 * to execute the given nodes
 *
 * @export
 * @param {INode[]} nodes
 * @returns {ITransferNodeTypes}
 */
export function getNodeTypeData(nodes: INode[]): ITransferNodeTypes {
	const nodeTypes = NodeTypes();

	// Check which node-types have to be loaded
	const neededNodeTypes = getNeededNodeTypes(nodes);

	// Get all the data of the needed node types that they
	// can be loaded again in the process
	const returnData: ITransferNodeTypes = {};
	for (const nodeTypeName of neededNodeTypes) {
		if (nodeTypes.nodeTypes[nodeTypeName] === undefined) {
			throw new Error(`The NodeType "${nodeTypeName}" could not be found!`);
		}

		returnData[nodeTypeName] = {
			className: nodeTypes.nodeTypes[nodeTypeName].type.constructor.name,
			sourcePath: nodeTypes.nodeTypes[nodeTypeName].sourcePath,
		};
	}

	return returnData;
}



/**
 * Returns the credentials data of the given type and its parent types
 * it extends
 *
 * @export
 * @param {string} type The credential type to return data off
 * @returns {ICredentialsTypeData}
 */
export function getCredentialsDataWithParents(type: string): ICredentialsTypeData {
	const credentialTypes = CredentialTypes();
	const credentialType = credentialTypes.getByName(type);

	const credentialTypeData: ICredentialsTypeData = {};
	credentialTypeData[type] = credentialType;

	if (credentialType === undefined || credentialType.extends === undefined) {
		return credentialTypeData;
	}

	for (const typeName of credentialType.extends) {
		if (credentialTypeData[typeName] !== undefined) {
			continue;
		}

		credentialTypeData[typeName] = credentialTypes.getByName(typeName);
		Object.assign(credentialTypeData, getCredentialsDataWithParents(typeName));
	}

	return credentialTypeData;
}



/**
 * Returns all the credentialTypes which are needed to resolve
 * the given workflow credentials
 *
 * @export
 * @param {IWorkflowCredentials} credentials The credentials which have to be able to be resolved
 * @returns {ICredentialsTypeData}
 */
export function getCredentialsData(credentials: IWorkflowCredentials): ICredentialsTypeData {
	const credentialTypeData: ICredentialsTypeData = {};

	for (const credentialType of Object.keys(credentials)) {
		if (credentialTypeData[credentialType] !== undefined) {
			continue;
		}

		Object.assign(credentialTypeData, getCredentialsDataWithParents(credentialType));
	}

	return credentialTypeData;
}



/**
 * Returns the names of the NodeTypes which are are needed
 * to execute the gives nodes
 *
 * @export
 * @param {INode[]} nodes
 * @returns {string[]}
 */
export function getNeededNodeTypes(nodes: INode[]): string[] {
	// Check which node-types have to be loaded
	const neededNodeTypes: string[] = [];
	for (const node of nodes) {
		if (!neededNodeTypes.includes(node.type)) {
			neededNodeTypes.push(node.type);
		}
	}

	return neededNodeTypes;
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
				await saveStaticDataById(workflow.id!, workflow.staticData);
				workflow.staticData.__dataChanged = false;
			} catch (e) {
				Logger.error(`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: "${e.message}"`, { workflowId: workflow.id });
			}
		}
	}
}



/**
 * Saves the given static data on workflow
 *
 * @export
 * @param {(string | number)} workflowId The id of the workflow to save data on
 * @param {IDataObject} newStaticData The static data to save
 * @returns {Promise<void>}
 */
export async function saveStaticDataById(workflowId: string | number, newStaticData: IDataObject): Promise<void> {
	await Db.collections.Workflow!
		.update(workflowId, {
			staticData: newStaticData,
		});
}



/**
 * Returns the static data of workflow
 *
 * @export
 * @param {(string | number)} workflowId The id of the workflow to get static data of
 * @returns
 */
export async function getStaticDataById(workflowId: string | number) {
	const workflowData = await Db.collections.Workflow!
		.findOne(workflowId, { select: ['staticData']});

	if (workflowData === undefined) {
		return {};
	}

	return workflowData.staticData || {};
}
