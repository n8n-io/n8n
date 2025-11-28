import { CredentialsRepository, ExecutionRepository } from '@n8n/db';
import type { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import type {
	IDataObject,
	INodeCredentialsDetails,
	IRun,
	ITaskData,
	IWorkflowBase,
	RelatedExecution,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { OwnershipService } from './services/ownership.service';

/**
 * Returns the data of the last executed node
 */
export function getDataLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	console.trace('--- getDataLastExecutedNodeData');
	const { runData, pinData = {} } = inputData.data.resultData;
	const { lastNodeExecuted } = inputData.data.resultData;
	console.log('lastNodeExecuted', lastNodeExecuted);

	if (lastNodeExecuted === undefined) {
		return undefined;
	}

	if (runData[lastNodeExecuted] === undefined) {
		return undefined;
	}

	const lastNodeRunData = runData[lastNodeExecuted][runData[lastNodeExecuted].length - 1];

	let lastNodePinData = pinData[lastNodeExecuted];

	if (lastNodePinData && inputData.mode === 'manual') {
		if (!Array.isArray(lastNodePinData)) lastNodePinData = [lastNodePinData];

		const itemsPerRun = lastNodePinData.map((item, index) => {
			return { json: item, pairedItem: { item: index } };
		});

		return {
			startTime: 0,
			executionIndex: 0,
			executionTime: 0,
			data: { main: [itemsPerRun] },
			source: lastNodeRunData.source,
		};
	}

	return lastNodeRunData;
}

/**
 * Set node ids if not already set
 */
export function addNodeIds(workflow: IWorkflowBase) {
	const { nodes } = workflow;
	if (!nodes) return;

	nodes.forEach((node) => {
		if (!node.id) {
			node.id = uuid();
		}
	});
}

// Checking if credentials of old format are in use and run a DB check if they might exist uniquely
export async function replaceInvalidCredentials<T extends IWorkflowBase>(workflow: T): Promise<T> {
	const { nodes } = workflow;
	if (!nodes) return workflow;

	// caching
	const credentialsByName: Record<string, Record<string, INodeCredentialsDetails>> = {};
	const credentialsById: Record<string, Record<string, INodeCredentialsDetails>> = {};

	// for loop to run DB fetches sequential and use cache to keep pressure off DB
	// trade-off: longer response time for less DB queries

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
					const credentials = await Container.get(CredentialsRepository).findBy({
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
				const credentials = await Container.get(CredentialsRepository).findOneBy({
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
				const credsByName = await Container.get(CredentialsRepository).findBy({
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

	return workflow;
}

export async function getVariables(workflowId?: string, projectId?: string): Promise<IDataObject> {
	const [variables, project] = await Promise.all([
		Container.get(VariablesService).getAllCached(),
		// If projectId is not provided, try to get it from workflow
		workflowId && !projectId
			? Container.get(OwnershipService).getWorkflowProjectCached(workflowId)
			: null,
	]);

	// Either projectId passed or use project from workflow
	const projectIdToUse = projectId ?? project?.id;

	return Object.freeze(
		variables.reduce((acc, curr) => {
			if (!curr.project) {
				// always set globals
				acc[curr.key] = curr.value;
			} else if (projectIdToUse && curr.project.id === projectIdToUse) {
				// project variables override globals
				acc[curr.key] = curr.value;
			}
			return acc;
		}, {} as IDataObject),
	);
}

/**
 * Determines if a parent execution should be restarted when a child execution completes.
 *
 * @param parentExecution - The parent execution metadata, if any
 * @returns true if the parent should be restarted, false otherwise
 */
export function shouldRestartParentExecution(
	parentExecution: RelatedExecution | undefined,
): parentExecution is RelatedExecution {
	if (parentExecution === undefined) {
		return false;
	}
	if (parentExecution.shouldResume === undefined) {
		return true; // Preserve existing behavior for executions started before the flag was introduced for backward compatibility.
	}
	return parentExecution.shouldResume;
}

/**
 * Updates a parent execution's nodeExecutionStack with the final results from a completed child execution.
 * This ensures that when the parent resumes, the Execute Workflow node (running in disabled mode)
 * returns the correct data from the child workflow's last node, rather than the original input.
 *
 * @param childExecutionId - The execution ID of the completed child workflow
 * @param parentExecutionId - The execution ID of the waiting parent workflow
 * @param subworkflowResults - The final execution results from the child workflow
 * @param workflowId - The workflow ID (used for error logging)
 * @returns Promise that resolves when the parent execution has been updated
 */
export async function updateParentExecutionWithChildResults(
	childExecutionId: string,
	parentExecutionId: string,
	subworkflowResults: IRun,
	workflowId: string,
): Promise<void> {
	const lastExecutedNodeData = getDataLastExecutedNodeData(subworkflowResults);
	if (!lastExecutedNodeData?.data) return;

	console.log('=== updateParentExecutionWithChildResults ===');
	console.log('Child final output:', JSON.stringify(lastExecutedNodeData.data, null, 2));

	try {
		const executionRepository = Container.get(ExecutionRepository);
		const parent = await executionRepository.findSingleExecution(parentExecutionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!parent || parent.status !== 'waiting') {
			console.log('Parent not found or not waiting. status:', parent?.status);
			return;
		}

		const parentWithSubWorkflowResults = {
			data: { ...parent.data },
		};

		if (
			!parentWithSubWorkflowResults.data.executionData?.nodeExecutionStack ||
			parentWithSubWorkflowResults.data.executionData.nodeExecutionStack.length === 0
		) {
			console.log('Parent nodeExecutionStack is empty');
			return;
		}

		console.log(
			'Parent nodeExecutionStack[0].data BEFORE update:',
			JSON.stringify(
				parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data,
				null,
				2,
			),
		);

		// Copy the sub workflow result to the parent execution's Execute Workflow node inputs
		// so that the Execute Workflow node returns the correct data when parent execution is resumed
		// and the Execute Workflow node is executed again in disabled mode.
		parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data =
			lastExecutedNodeData.data;

		console.log(
			'Parent nodeExecutionStack[0].data AFTER update:',
			JSON.stringify(
				parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data,
				null,
				2,
			),
		);

		await executionRepository.updateExistingExecution(
			parentExecutionId,
			parentWithSubWorkflowResults,
		);

		console.log('=== Parent execution updated in DB ===');
	} catch (error: unknown) {
		Container.get(Logger).error('Could not copy sub workflow result to waiting parent execution', {
			childExecutionId,
			parentExecutionId,
			workflowId,
			error,
		});
	}
}

/**
 * Determines the value to set for a workflow's active version based on the provided parameters.
 * Always updates the active version to the current version for active workflows, clears it when deactivating.
 *
 * @param dbWorkflow - The current workflow entity from the database, before the update
 * @param updatedVersion - The workflow history version of the updated workflow
 * @param updatedActive - Optional boolean indicating if the workflow's active status is being updated
 * @returns The workflow history version to set as active, null if deactivating, or the existing active version if unchanged
 */
export function getActiveVersionUpdateValue(
	dbWorkflow: WorkflowEntity,
	updatedVersion: WorkflowHistory,
	updatedActive?: boolean,
) {
	if (updatedActive) {
		return updatedVersion;
	}

	if (updatedActive === false) {
		return null;
	}

	return dbWorkflow.activeVersionId ? updatedVersion : null;
}
