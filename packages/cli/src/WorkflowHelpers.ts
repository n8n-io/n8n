/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-continue */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
import { In } from 'typeorm';
import {
	IDataObject,
	IExecuteData,
	INode,
	INodeCredentialsDetails,
	IRun,
	IRunExecutionData,
	ITaskData,
	LoggerProxy as Logger,
	NodeApiError,
	NodeOperationError,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
// eslint-disable-next-line import/no-cycle
import {
	CredentialTypes,
	Db,
	ICredentialsTypeData,
	ITransferNodeTypes,
	IWorkflowErrorData,
	IWorkflowExecutionDataProcess,
	NodeTypes,
	WhereClause,
	WorkflowRunner,
} from '.';

import config from '../config';
// eslint-disable-next-line import/no-cycle
import { WorkflowEntity } from './databases/entities/WorkflowEntity';
import { User } from './databases/entities/User';
import { getWorkflowOwner } from './UserManagement/UserManagementHelper';

const ERROR_TRIGGER_TYPE = config.getEnv('nodes.errorTriggerType');

/**
 * Returns the data of the last executed node
 *
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const { runData, pinData = {} } = inputData.data.resultData;
	const { lastNodeExecuted } = inputData.data.resultData;

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	const lastNodeRunData = runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];

	let lastNodePinData = pinData[lastNodeExecuted];

	if (lastNodePinData) {
		if (!Array.isArray(lastNodePinData)) lastNodePinData = [lastNodePinData];

		const itemsPerRun = lastNodePinData.map((item, index) => {
			return { json: item, pairedItem: { item: index } };
		});

		return {
			startTime: 0,
			executionTime: 0,
			data: { main: [itemsPerRun] },
			source: lastNodeRunData.source,
		};
	}

	return lastNodeRunData;
}

/**
 * Returns if the given id is a valid workflow id
 *
 * @param {(string | null | undefined)} id The id to check
 */
export function isWorkflowIdValid(id: string | null | undefined | number): boolean {
	if (typeof id === 'string') {
		id = parseInt(id, 10);
	}

	// eslint-disable-next-line no-restricted-globals
	if (isNaN(id as number)) {
		return false;
	}
	return true;
}

/**
 * Executes the error workflow
 *
 * @param {string} workflowId The id of the error workflow
 * @param {IWorkflowErrorData} workflowErrorData The error data
 */
export async function executeErrorWorkflow(
	workflowId: string,
	workflowErrorData: IWorkflowErrorData,
	runningUser: User,
): Promise<void> {
	// Wrap everything in try/catch to make sure that no errors bubble up and all get caught here
	try {
		let workflowData;
		if (workflowId.toString() !== workflowErrorData.workflow.id?.toString()) {
			// To make this code easier to understand, we split it in 2 parts:
			// 1) Fetch the owner of the errored workflows and then
			// 2) if now instance owner, then check if the user has access to the
			//    triggered workflow.

			const user = await getWorkflowOwner(workflowErrorData.workflow.id!);

			if (user.globalRole.name === 'owner') {
				workflowData = await Db.collections.Workflow.findOne({ id: Number(workflowId) });
			} else {
				const sharedWorkflowData = await Db.collections.SharedWorkflow.findOne({
					where: {
						workflow: { id: workflowId },
						user,
					},
					relations: ['workflow'],
				});
				if (sharedWorkflowData) {
					workflowData = sharedWorkflowData.workflow;
				}
			}
		} else {
			workflowData = await Db.collections.Workflow.findOne({ id: Number(workflowId) });
		}

		if (workflowData === undefined) {
			// The error workflow could not be found
			Logger.error(
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find error workflow "${workflowId}"`,
				{ workflowId },
			);
			return;
		}

		const user = await getWorkflowOwner(workflowId);
		if (user.id !== runningUser.id) {
			// The error workflow could not be found
			Logger.warn(
				`An attempt to execute workflow ID ${workflowId} as error workflow was blocked due to wrong permission`,
			);
			return;
		}

		const executionMode = 'error';
		const nodeTypes = NodeTypes();

		const workflowInstance = new Workflow({
			id: workflowId,
			name: workflowData.name,
			nodeTypes,
			nodes: workflowData.nodes,
			connections: workflowData.connections,
			active: workflowData.active,
			staticData: workflowData.staticData,
			settings: workflowData.settings,
		});

		let node: INode;
		let workflowStartNode: INode | undefined;
		for (const nodeName of Object.keys(workflowInstance.nodes)) {
			node = workflowInstance.nodes[nodeName];
			if (node.type === ERROR_TRIGGER_TYPE) {
				workflowStartNode = node;
			}
		}

		if (workflowStartNode === undefined) {
			Logger.error(
				`Calling Error Workflow for "${workflowErrorData.workflow.id}". Could not find "${ERROR_TRIGGER_TYPE}" in workflow "${workflowId}"`,
			);
			return;
		}

		// Can execute without webhook so go on

		// Initialize the data of the webhook node
		const nodeExecutionStack: IExecuteData[] = [];
		nodeExecutionStack.push({
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
			source: null,
		});

		const runExecutionData: IRunExecutionData = {
			startData: {},
			resultData: {
				runData: {},
			},
			executionData: {
				contextData: {},
				nodeExecutionStack,
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		};

		const runData: IWorkflowExecutionDataProcess = {
			executionMode,
			executionData: runExecutionData,
			workflowData,
			userId: user.id,
		};

		const workflowRunner = new WorkflowRunner();
		await workflowRunner.run(runData);
	} catch (error) {
		Logger.error(
			`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error.message}"`,
			{ workflowId: workflowErrorData.workflow.id },
		);
	}
}

/**
 * Returns all the defined NodeTypes
 *
 */
export function getAllNodeTypeData(): ITransferNodeTypes {
	const nodeTypes = NodeTypes();

	// Get the data of all the node types that they
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
 * Returns all the defined CredentialTypes
 *
 */
export function getAllCredentalsTypeData(): ICredentialsTypeData {
	const credentialTypes = CredentialTypes();

	// Get the data of all the credential types that they
	// can be loaded again in the subprocess
	const returnData: ICredentialsTypeData = {};
	for (const credentialTypeName of Object.keys(credentialTypes.credentialTypes)) {
		if (credentialTypes.credentialTypes[credentialTypeName] === undefined) {
			throw new Error(`The CredentialType "${credentialTypeName}" could not be found!`);
		}

		returnData[credentialTypeName] = {
			className: credentialTypes.credentialTypes[credentialTypeName].type.constructor.name,
			sourcePath: credentialTypes.credentialTypes[credentialTypeName].sourcePath,
		};
	}

	return returnData;
}

/**
 * Returns the data of the node types that are needed
 * to execute the given nodes
 *
 */
export function getNodeTypeData(nodes: INode[]): ITransferNodeTypes {
	const nodeTypes = NodeTypes();

	// Check which node-types have to be loaded
	// eslint-disable-next-line @typescript-eslint/no-use-before-define
	const neededNodeTypes = getNeededNodeTypes(nodes);

	// Get all the data of the needed node types that they
	// can be loaded again in the process
	const returnData: ITransferNodeTypes = {};
	for (const nodeTypeName of neededNodeTypes) {
		if (nodeTypes.nodeTypes[nodeTypeName.type] === undefined) {
			throw new Error(`The NodeType "${nodeTypeName.type}" could not be found!`);
		}

		returnData[nodeTypeName.type] = {
			className: nodeTypes.nodeTypes[nodeTypeName.type].type.constructor.name,
			sourcePath: nodeTypes.nodeTypes[nodeTypeName.type].sourcePath,
		};
	}

	return returnData;
}

/**
 * Returns the credentials data of the given type and its parent types
 * it extends
 *
 * @param {string} type The credential type to return data off
 */
export function getCredentialsDataWithParents(type: string): ICredentialsTypeData {
	const credentialTypes = CredentialTypes();
	const credentialType = credentialTypes.getByName(type);

	const credentialTypeData: ICredentialsTypeData = {};
	credentialTypeData[type] = {
		className: credentialTypes.credentialTypes[type].type.constructor.name,
		sourcePath: credentialTypes.credentialTypes[type].sourcePath,
	};

	if (credentialType === undefined || credentialType.extends === undefined) {
		return credentialTypeData;
	}

	for (const typeName of credentialType.extends) {
		if (credentialTypeData[typeName] !== undefined) {
			continue;
		}

		credentialTypeData[typeName] = {
			className: credentialTypes.credentialTypes[typeName].type.constructor.name,
			sourcePath: credentialTypes.credentialTypes[typeName].sourcePath,
		};
		Object.assign(credentialTypeData, getCredentialsDataWithParents(typeName));
	}

	return credentialTypeData;
}

/**
 * Returns all the credentialTypes which are needed to resolve
 * the given workflow credentials
 *
 * @param {IWorkflowCredentials} credentials The credentials which have to be able to be resolved
 */
export function getCredentialsDataByNodes(nodes: INode[]): ICredentialsTypeData {
	const credentialTypeData: ICredentialsTypeData = {};

	for (const node of nodes) {
		const credentialsUsedByThisNode = node.credentials;
		if (credentialsUsedByThisNode) {
			// const credentialTypesUsedByThisNode = Object.keys(credentialsUsedByThisNode!);
			for (const credentialType of Object.keys(credentialsUsedByThisNode)) {
				if (credentialTypeData[credentialType] !== undefined) {
					continue;
				}

				Object.assign(credentialTypeData, getCredentialsDataWithParents(credentialType));
			}
		}
	}

	return credentialTypeData;
}

/**
 * Returns the names of the NodeTypes which are are needed
 * to execute the gives nodes
 *
 */
export function getNeededNodeTypes(nodes: INode[]): Array<{ type: string; version: number }> {
	// Check which node-types have to be loaded
	const neededNodeTypes: Array<{ type: string; version: number }> = [];
	for (const node of nodes) {
		if (neededNodeTypes.find((neededNodes) => node.type === neededNodes.type) === undefined) {
			neededNodeTypes.push({ type: node.type, version: node.typeVersion });
		}
	}

	return neededNodeTypes;
}

/**
 * Saves the static data if it changed
 *
 */
export async function saveStaticData(workflow: Workflow): Promise<void> {
	if (workflow.staticData.__dataChanged === true) {
		// Static data of workflow changed and so has to be saved
		if (isWorkflowIdValid(workflow.id)) {
			// Workflow is saved so update in database
			try {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define
				await saveStaticDataById(workflow.id!, workflow.staticData);
				workflow.staticData.__dataChanged = false;
			} catch (e) {
				Logger.error(
					`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: "${e.message}"`,
					{ workflowId: workflow.id },
				);
			}
		}
	}
}

/**
 * Saves the given static data on workflow
 *
 * @param {(string | number)} workflowId The id of the workflow to save data on
 * @param {IDataObject} newStaticData The static data to save
 */
export async function saveStaticDataById(
	workflowId: string | number,
	newStaticData: IDataObject,
): Promise<void> {
	await Db.collections.Workflow.update(workflowId, {
		staticData: newStaticData,
	});
}

/**
 * Returns the static data of workflow
 *
 * @param {(string | number)} workflowId The id of the workflow to get static data of
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getStaticDataById(workflowId: string | number) {
	const workflowData = await Db.collections.Workflow.findOne(workflowId, {
		select: ['staticData'],
	});

	if (workflowData === undefined) {
		return {};
	}

	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
	return workflowData.staticData || {};
}

/**
 * Set node ids if not already set
 *
 */
export function addNodeIds(workflow: WorkflowEntity) {
	const { nodes } = workflow;
	if (!nodes) return;

	nodes.forEach((node) => {
		if (!node.id) {
			node.id = uuid();
		}
	});
}

// Checking if credentials of old format are in use and run a DB check if they might exist uniquely
export async function replaceInvalidCredentials(workflow: WorkflowEntity): Promise<WorkflowEntity> {
	const { nodes } = workflow;
	if (!nodes) return workflow;

	// caching
	const credentialsByName: Record<string, Record<string, INodeCredentialsDetails>> = {};
	const credentialsById: Record<string, Record<string, INodeCredentialsDetails>> = {};

	// for loop to run DB fetches sequential and use cache to keep pressure off DB
	// trade-off: longer response time for less DB queries
	/* eslint-disable no-await-in-loop */
	for (const node of nodes) {
		if (!node.credentials || node.disabled) {
			continue;
		}
		// extract credentials types
		const allNodeCredentials = Object.entries(node.credentials);
		for (const [nodeCredentialType, nodeCredentials] of allNodeCredentials) {
			// Check if Node applies old credentials style
			if (typeof nodeCredentials === 'string' || nodeCredentials.id === null) {
				const name = typeof nodeCredentials === 'string' ? nodeCredentials : nodeCredentials.name;
				// init cache for type
				if (!credentialsByName[nodeCredentialType]) {
					credentialsByName[nodeCredentialType] = {};
				}
				if (credentialsByName[nodeCredentialType][name] === undefined) {
					const credentials = await Db.collections.Credentials.find({
						name,
						type: nodeCredentialType,
					});
					// if credential name-type combination is unique, use it
					if (credentials?.length === 1) {
						credentialsByName[nodeCredentialType][name] = {
							id: credentials[0].id.toString(),
							name: credentials[0].name,
						};
						node.credentials[nodeCredentialType] = credentialsByName[nodeCredentialType][name];
						continue;
					}

					// nothing found - add invalid credentials to cache to prevent further DB checks
					credentialsByName[nodeCredentialType][name] = {
						id: null,
						name,
					};
				} else {
					// get credentials from cache
					node.credentials[nodeCredentialType] = credentialsByName[nodeCredentialType][name];
				}
				continue;
			}

			// Node has credentials with an ID

			// init cache for type
			if (!credentialsById[nodeCredentialType]) {
				credentialsById[nodeCredentialType] = {};
			}

			// check if credentials for ID-type are not yet cached
			if (credentialsById[nodeCredentialType][nodeCredentials.id] === undefined) {
				// check first if ID-type combination exists
				const credentials = await Db.collections.Credentials.findOne({
					id: nodeCredentials.id,
					type: nodeCredentialType,
				});
				if (credentials) {
					credentialsById[nodeCredentialType][nodeCredentials.id] = {
						id: credentials.id.toString(),
						name: credentials.name,
					};
					node.credentials[nodeCredentialType] =
						credentialsById[nodeCredentialType][nodeCredentials.id];
					continue;
				}
				// no credentials found for ID, check if some exist for name
				const credsByName = await Db.collections.Credentials.find({
					name: nodeCredentials.name,
					type: nodeCredentialType,
				});
				// if credential name-type combination is unique, take it
				if (credsByName?.length === 1) {
					// add found credential to cache
					credentialsById[nodeCredentialType][credsByName[0].id] = {
						id: credsByName[0].id.toString(),
						name: credsByName[0].name,
					};
					node.credentials[nodeCredentialType] =
						credentialsById[nodeCredentialType][credsByName[0].id];
					continue;
				}

				// nothing found - add invalid credentials to cache to prevent further DB checks
				credentialsById[nodeCredentialType][nodeCredentials.id] = nodeCredentials;
				continue;
			}

			// get credentials from cache
			node.credentials[nodeCredentialType] =
				credentialsById[nodeCredentialType][nodeCredentials.id];
		}
	}
	/* eslint-enable no-await-in-loop */
	return workflow;
}

/**
 * Build a `where` clause for a TypeORM entity search,
 * checking for member access if the user is not an owner.
 */
export function whereClause({
	user,
	entityType,
	entityId = '',
}: {
	user: User;
	entityType: 'workflow' | 'credentials';
	entityId?: string;
}): WhereClause {
	const where: WhereClause = entityId ? { [entityType]: { id: entityId } } : {};

	// TODO: Decide if owner access should be restricted
	if (user.globalRole.name !== 'owner') {
		where.user = { id: user.id };
	}

	return where;
}

/**
 * Get the IDs of the workflows that have been shared with the user.
 * Returns all IDs if user is global owner (see `whereClause`)
 */
export async function getSharedWorkflowIds(user: User): Promise<number[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		relations: ['workflow'],
		where: whereClause({
			user,
			entityType: 'workflow',
		}),
	});

	return sharedWorkflows.map(({ workflow }) => workflow.id);
}

/**
 * Check if user owns more than 15 workflows or more than 2 workflows with at least 2 nodes.
 * If user does, set flag in its settings.
 */
export async function isBelowOnboardingThreshold(user: User): Promise<boolean> {
	let belowThreshold = true;
	const skippedTypes = ['n8n-nodes-base.start', 'n8n-nodes-base.stickyNote'];

	const workflowOwnerRole = await Db.collections.Role.findOne({
		name: 'owner',
		scope: 'workflow',
	});
	const ownedWorkflowsIds = await Db.collections.SharedWorkflow.find({
		user,
		role: workflowOwnerRole,
	}).then((ownedWorkflows) => ownedWorkflows.map((wf) => wf.workflowId));

	if (ownedWorkflowsIds.length > 15) {
		belowThreshold = false;
	} else {
		// just fetch workflows' nodes to keep memory footprint low
		const workflows = await Db.collections.Workflow.find({
			where: { id: In(ownedWorkflowsIds) },
			select: ['nodes'],
		});

		// valid workflow: 2+ nodes without start node
		const validWorkflowCount = workflows.reduce((counter, workflow) => {
			if (counter <= 2 && workflow.nodes.length > 2) {
				const nodes = workflow.nodes.filter((node) => !skippedTypes.includes(node.type));
				if (nodes.length >= 2) {
					return counter + 1;
				}
			}
			return counter;
		}, 0);

		// more than 2 valid workflows required
		belowThreshold = validWorkflowCount <= 2;
	}

	// user is above threshold --> set flag in settings
	if (!belowThreshold) {
		void Db.collections.User.update(user.id, { settings: { isOnboarded: true } });
	}

	return belowThreshold;
}

export function generateFailedExecutionFromError(
	mode: WorkflowExecuteMode,
	error: NodeApiError | NodeOperationError,
	node: INode,
): IRun {
	return {
		data: {
			startData: {
				destinationNode: node.name,
				runNodeFilter: [node.name],
			},
			resultData: {
				error,
				runData: {
					[node.name]: [
						{
							startTime: 0,
							executionTime: 0,
							error,
							source: [],
						},
					],
				},
				lastNodeExecuted: node.name,
			},
			executionData: {
				contextData: {},
				nodeExecutionStack: [
					{
						node,
						data: {},
						source: null,
					},
				],
				waitingExecution: {},
				waitingExecutionSource: {},
			},
		},
		finished: false,
		mode,
		startedAt: new Date(),
		stoppedAt: new Date(),
	};
}
