import { CredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
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
