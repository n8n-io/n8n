import { In } from 'typeorm';
import {
	IDataObject,
	IExecuteData,
	INode,
	INodeCredentialsDetails,
	IRun,
	IRunExecutionData,
	ITaskData,
	ErrorReporterProxy as ErrorReporter,
	LoggerProxy as Logger,
	NodeApiError,
	NodeOperationError,
	Workflow,
	WorkflowExecuteMode,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import * as Db from '@/Db';
import { ICredentialsDb, IWorkflowErrorData, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { NodeTypes } from '@/NodeTypes';
import { WorkflowRunner } from '@/WorkflowRunner';

import config from '@/config';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { User } from '@db/entities/User';
import { getWorkflowOwner, whereClause } from '@/UserManagement/UserManagementHelper';
import omit from 'lodash.omit';

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
export function isWorkflowIdValid(id: string | null | undefined): boolean {
	return !(typeof id === 'string' && isNaN(parseInt(id, 10)));
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
		let workflowData: WorkflowEntity | null = null;
		if (workflowId !== workflowErrorData.workflow.id) {
			// To make this code easier to understand, we split it in 2 parts:
			// 1) Fetch the owner of the errored workflows and then
			// 2) if now instance owner, then check if the user has access to the
			//    triggered workflow.

			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			const user = await getWorkflowOwner(workflowErrorData.workflow.id!);

			if (user.globalRole.name === 'owner') {
				workflowData = await Db.collections.Workflow.findOneBy({ id: workflowId });
			} else {
				const sharedWorkflowData = await Db.collections.SharedWorkflow.findOne({
					where: { workflowId, userId: user.id },
					relations: ['workflow'],
				});
				if (sharedWorkflowData) {
					workflowData = sharedWorkflowData.workflow;
				}
			}
		} else {
			workflowData = await Db.collections.Workflow.findOneBy({ id: workflowId });
		}

		if (workflowData === null) {
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
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
		ErrorReporter.error(error);
		Logger.error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
			`Calling Error Workflow for "${workflowErrorData.workflow.id}": "${error.message}"`,
			{ workflowId: workflowErrorData.workflow.id },
		);
	}
}

/**
 * Saves the static data if it changed
 */
export async function saveStaticData(workflow: Workflow): Promise<void> {
	if (workflow.staticData.__dataChanged === true) {
		// Static data of workflow changed and so has to be saved
		if (isWorkflowIdValid(workflow.id)) {
			// Workflow is saved so update in database
			try {
				// eslint-disable-next-line @typescript-eslint/no-use-before-define, @typescript-eslint/no-non-null-assertion
				await saveStaticDataById(workflow.id!, workflow.staticData);
				workflow.staticData.__dataChanged = false;
			} catch (error) {
				ErrorReporter.error(error);
				Logger.error(
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
					`There was a problem saving the workflow with id "${workflow.id}" to save changed staticData: "${error.message}"`,
					{ workflowId: workflow.id },
				);
			}
		}
	}
}

/**
 * Saves the given static data on workflow
 *
 * @param {(string)} workflowId The id of the workflow to save data on
 * @param {IDataObject} newStaticData The static data to save
 */
export async function saveStaticDataById(
	workflowId: string,
	newStaticData: IDataObject,
): Promise<void> {
	await Db.collections.Workflow.update(workflowId, {
		staticData: newStaticData,
	});
}

/**
 * Returns the static data of workflow
 */
export async function getStaticDataById(workflowId: string) {
	const workflowData = await Db.collections.Workflow.findOne({
		select: ['staticData'],
		where: { id: workflowId },
	});
	return workflowData?.staticData ?? {};
}

/**
 * Set node ids if not already set
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
					const credentials = await Db.collections.Credentials.findBy({
						name,
						type: nodeCredentialType,
					});
					// if credential name-type combination is unique, use it
					if (credentials?.length === 1) {
						credentialsByName[nodeCredentialType][name] = {
							id: credentials[0].id,
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
				const credentials = await Db.collections.Credentials.findOneBy({
					id: nodeCredentials.id,
					type: nodeCredentialType,
				});
				if (credentials) {
					credentialsById[nodeCredentialType][nodeCredentials.id] = {
						id: credentials.id,
						name: credentials.name,
					};
					node.credentials[nodeCredentialType] =
						credentialsById[nodeCredentialType][nodeCredentials.id];
					continue;
				}
				// no credentials found for ID, check if some exist for name
				const credsByName = await Db.collections.Credentials.findBy({
					name: nodeCredentials.name,
					type: nodeCredentialType,
				});
				// if credential name-type combination is unique, take it
				if (credsByName?.length === 1) {
					// add found credential to cache
					credentialsById[nodeCredentialType][credsByName[0].id] = {
						id: credsByName[0].id,
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
 * Get the IDs of the workflows that have been shared with the user.
 * Returns all IDs if user is global owner (see `whereClause`)
 */
export async function getSharedWorkflowIds(user: User, roles?: string[]): Promise<string[]> {
	const sharedWorkflows = await Db.collections.SharedWorkflow.find({
		relations: ['workflow', 'role'],
		where: whereClause({ user, entityType: 'workflow', roles }),
		select: ['workflowId'],
	});

	return sharedWorkflows.map(({ workflowId }) => workflowId);
}

/**
 * Check if user owns more than 15 workflows or more than 2 workflows with at least 2 nodes.
 * If user does, set flag in its settings.
 */
export async function isBelowOnboardingThreshold(user: User): Promise<boolean> {
	let belowThreshold = true;
	const skippedTypes = ['n8n-nodes-base.start', 'n8n-nodes-base.stickyNote'];

	const workflowOwnerRoleId = await Db.collections.Role.findOne({
		select: ['id'],
		where: {
			name: 'owner',
			scope: 'workflow',
		},
	}).then((role) => role?.id);
	const ownedWorkflowsIds = await Db.collections.SharedWorkflow.find({
		where: {
			userId: user.id,
			roleId: workflowOwnerRoleId,
		},
		select: ['workflowId'],
	}).then((ownedWorkflows) => ownedWorkflows.map(({ workflowId }) => workflowId));

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

/** Get all nodes in a workflow where the node credential is not accessible to the user. */
export function getNodesWithInaccessibleCreds(workflow: WorkflowEntity, userCredIds: string[]) {
	if (!workflow.nodes) {
		return [];
	}
	return workflow.nodes.filter((node) => {
		if (!node.credentials) return false;

		const allUsedCredentials = Object.values(node.credentials);

		const allUsedCredentialIds = allUsedCredentials.map((nodeCred) => nodeCred.id?.toString());
		return allUsedCredentialIds.some(
			(nodeCredId) => nodeCredId && !userCredIds.includes(nodeCredId),
		);
	});
}

export function validateWorkflowCredentialUsage(
	newWorkflowVersion: WorkflowEntity,
	previousWorkflowVersion: WorkflowEntity,
	credentialsUserHasAccessTo: ICredentialsDb[],
) {
	/**
	 * We only need to check nodes that use credentials the current user cannot access,
	 * since these can be 2 possibilities:
	 * - Same ID already exist: it's a read only node and therefore cannot be changed
	 * - It's a new node which indicates tampering and therefore must fail saving
	 */

	const allowedCredentialIds = credentialsUserHasAccessTo.map((cred) => cred.id);

	const nodesWithCredentialsUserDoesNotHaveAccessTo = getNodesWithInaccessibleCreds(
		newWorkflowVersion,
		allowedCredentialIds,
	);

	// If there are no nodes with credentials the user does not have access to we can skip the rest
	if (nodesWithCredentialsUserDoesNotHaveAccessTo.length === 0) {
		return newWorkflowVersion;
	}

	const previouslyExistingNodeIds = previousWorkflowVersion.nodes.map((node) => node.id);

	// If it's a new node we can't allow it to be saved
	// since it uses creds the node doesn't have access
	const isTamperingAttempt = (inaccessibleCredNodeId: string) =>
		!previouslyExistingNodeIds.includes(inaccessibleCredNodeId);

	nodesWithCredentialsUserDoesNotHaveAccessTo.forEach((node) => {
		if (isTamperingAttempt(node.id)) {
			Logger.verbose('Blocked workflow update due to tampering attempt', {
				nodeType: node.type,
				nodeName: node.name,
				nodeId: node.id,
				nodeCredentials: node.credentials,
			});
			// Node is new, so this is probably a tampering attempt. Throw an error
			throw new NodeOperationError(
				node,
				`You don't have access to the credentials in the '${node.name}' node. Ask the owner to share them with you.`,
			);
		}
		// Replace the node with the previous version of the node
		// Since it cannot be modified (read only node)
		const nodeIdx = newWorkflowVersion.nodes.findIndex(
			(newWorkflowNode) => newWorkflowNode.id === node.id,
		);

		Logger.debug('Replacing node with previous version when saving updated workflow', {
			nodeType: node.type,
			nodeName: node.name,
			nodeId: node.id,
		});
		const previousNodeVersion = previousWorkflowVersion.nodes.find(
			(previousNode) => previousNode.id === node.id,
		);
		// Allow changing only name, position and disabled status for read-only nodes
		Object.assign(
			newWorkflowVersion.nodes[nodeIdx],
			omit(previousNodeVersion, ['name', 'position', 'disabled']),
		);
	});

	return newWorkflowVersion;
}
