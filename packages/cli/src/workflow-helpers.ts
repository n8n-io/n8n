import { MAX_PINNED_DATA_SIZE, MAX_WORKFLOW_SIZE, MAX_EXPECTED_REQUEST_SIZE } from '@n8n/api-types';
import { CredentialsRepository } from '@n8n/db';
import type { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	formatWorkflowStructureIssuePath,
	resolveNodeWebhookId,
	safeParseWorkflowStructure,
	validateNodeSelectionForGrouping,
	type ExtractableErrorResult,
	type IDataObject,
	type INode,
	type INodeCredentialsDetails,
	type INodeTypes,
	type IRun,
	type ITaskData,
	type IWorkflowBase,
	type IWorkflowGroup,
	type IWorkflowSettings,
	type NodeGroupValidationResult,
	type RelatedExecution,
	type WorkflowStructureIssue,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { VariablesService } from '@/environments.ee/variables/variables.service.ee';
import { ExecutionPersistence } from '@/executions/execution-persistence';

import { OwnershipService } from './services/ownership.service';

/**
 * Validates that pinned data does not exceed size limits.
 * (Backend counterpart of the frontend's `usePinnedData.isValidSize()`).
 * Check 1: pinData alone must not exceed MAX_PINNED_DATA_SIZE (12 MB).
 * Check 2: workflow (without pinData) + pinData must not exceed MAX_WORKFLOW_SIZE - MAX_EXPECTED_REQUEST_SIZE (~16 MB - 2 KB).
 */
export function validatePinDataSize(workflow: IWorkflowBase): void {
	if (!workflow.pinData) return;

	const pinDataStr = JSON.stringify(workflow.pinData);
	const pinDataSize = Buffer.byteLength(pinDataStr, 'utf8');

	if (pinDataSize > MAX_PINNED_DATA_SIZE) {
		throw new BadRequestError(
			`Pinned data exceeds the maximum allowed size of ${MAX_PINNED_DATA_SIZE / (1024 * 1024)} MB`,
		);
	}

	const { pinData: _, ...workflowWithoutPinData } = workflow;
	const workflowSize =
		Buffer.byteLength(JSON.stringify(workflowWithoutPinData), 'utf8') + pinDataSize;
	const limit = MAX_WORKFLOW_SIZE - MAX_EXPECTED_REQUEST_SIZE;
	if (workflowSize > limit) {
		const limitMB = Math.floor(limit / (1024 * 1024));
		throw new BadRequestError(
			`Workflow with pinned data exceeds the maximum allowed size of ${limitMB} MB`,
		);
	}
}

/**
 * All runs of the last executed node, ordered by `executionIndex` (raw, no pinData substitution).
 */
export function getLastExecutedNodeRuns(inputData: IRun): ITaskData[] {
	const { runData, lastNodeExecuted } = inputData.data.resultData;
	if (lastNodeExecuted === undefined) {
		return [];
	}
	const runs = runData[lastNodeExecuted];
	return runs?.toSorted((a, b) => (a.executionIndex ?? 0) - (b.executionIndex ?? 0)) ?? [];
}

/**
 * Final-run output of the last executed node, with pinData substituted in manual mode.
 */
export function getLastExecutedNodeData(inputData: IRun): ITaskData | undefined {
	const { runData, lastNodeExecuted } = inputData.data.resultData;
	const pinData = inputData.data.resultData.pinData ?? {};

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

/**
 * Assign webhookId to any webhook node that is missing one.
 * The UI does this on the frontend when adding nodes to the canvas,
 * but workflows created via the API skip that step.
 */
export function resolveNodeWebhookIds(workflow: IWorkflowBase, nodeTypes: INodeTypes) {
	const { nodes } = workflow;
	if (!nodes) return;

	for (const node of nodes) {
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			resolveNodeWebhookId(node, nodeType.description);
		} catch {
			// node type not found, skip
		}
	}
}

/**
 * Reconciles nodeGroups with the workflow's current node set: node IDs that no
 * longer exist are removed from their groups and groups left without any nodes
 * are dissolved, mirroring the canvas behavior when nodes are deleted.
 * Returns the repaired groups, or `undefined` when no repair was needed.
 */
export function repairWorkflowNodeGroups(
	workflow: Pick<IWorkflowBase, 'nodes' | 'nodeGroups'>,
): IWorkflowGroup[] | undefined {
	const { nodeGroups, nodes } = workflow;
	if (!nodeGroups || nodeGroups.length === 0) return undefined;

	const nodeIds = new Set(nodes.map((n) => n.id).filter(Boolean));
	let changed = false;
	const repairedGroups: IWorkflowGroup[] = [];

	for (const group of nodeGroups) {
		const remainingNodeIds = group.nodeIds.filter((nodeId) => nodeIds.has(nodeId));
		if (remainingNodeIds.length === 0) {
			changed = true;
		} else if (remainingNodeIds.length === group.nodeIds.length) {
			repairedGroups.push(group);
		} else {
			changed = true;
			repairedGroups.push({ ...group, nodeIds: remainingNodeIds });
		}
	}

	return changed ? repairedGroups : undefined;
}

/**
 * Validates nodeGroups: unique group names, all referenced node IDs exist,
 * each node belongs to at most one group, and each group satisfies the
 * grouping rules enforced on the canvas (connected nodes, single main
 * entry/exit, no triggers, no non-main connections crossing the boundary).
 * Note for frontend: Must be called after `addNodeIds` since nodes created via the API
 * may not have IDs until that step assigns them.
 */
export function validateWorkflowNodeGroups(
	workflow: Pick<IWorkflowBase, 'nodes' | 'connections' | 'nodeGroups'>,
	nodeTypes: INodeTypes,
) {
	const { nodeGroups, nodes, connections } = workflow;
	if (!nodeGroups || nodeGroups.length === 0) return;

	const nodeIds = new Set(nodes.map((n) => n.id).filter(Boolean));
	const seenGroupNames = new Set<string>();
	const nodeToGroup = new Map<string, string>();

	for (const group of nodeGroups) {
		// Unique group names
		if (seenGroupNames.has(group.name)) {
			throw new BadRequestError(`Duplicate node group name "${group.name}".`);
		}
		seenGroupNames.add(group.name);

		if (group.nodeIds.length === 0) {
			throw new BadRequestError(`Group "${group.name}" must contain at least one node.`);
		}

		for (const nodeId of group.nodeIds) {
			// All referenced nodes must exist
			if (!nodeIds.has(nodeId)) {
				throw new BadRequestError(
					`Group "${group.name}" references node ID "${nodeId}" that does not exist in the workflow.`,
				);
			}
			// A node can only belong to one group
			const existingGroup = nodeToGroup.get(nodeId);
			if (existingGroup) {
				throw new BadRequestError(
					`Node "${nodeId}" belongs to multiple groups: "${existingGroup}" and "${group.name}".`,
				);
			}
			nodeToGroup.set(nodeId, group.name);
		}
	}

	// Same graph rules the canvas enforces when creating a group
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const getNodeType = (node: INode) => {
		try {
			return nodeTypes.getByNameAndVersion(node.type, node.typeVersion).description;
		} catch {
			// Unknown node type (e.g. not installed): skip type-dependent rules
			return null;
		}
	};

	for (const group of nodeGroups) {
		const memberNodes = group.nodeIds
			.map((nodeId) => nodesById.get(nodeId))
			.filter((node): node is INode => node !== undefined);

		const result = validateNodeSelectionForGrouping({
			nodes: memberNodes,
			connectionsBySourceNode: connections,
			getNodeType,
		});

		if (!result.valid) {
			throw new BadRequestError(formatNodeGroupValidationError(group.name, result));
		}
	}
}

function formatNodeGroupValidationError(
	groupName: string,
	result: Exclude<NodeGroupValidationResult, { valid: true }>,
): string {
	switch (result.reason) {
		case 'trigger-selected':
			return `Group "${groupName}" contains trigger node(s) ${formatNodeNames(result.triggers)}. Trigger nodes cannot be part of a group.`;
		case 'node-already-grouped':
			return `Group "${groupName}" contains nodes that already belong to another group.`;
		case 'multiple-input-branches':
			return `Node "${result.node}" cannot be the first node of group "${groupName}" because it has more than one main input.`;
		case 'multiple-output-branches':
			return `Node "${result.node}" cannot be the last node of group "${groupName}" because it has more than one main output.`;
		case 'non-main-boundary':
			return `The "${result.connection.type}" connection between "${result.connection.source}" and "${result.connection.target}" crosses the boundary of group "${groupName}". Non-main connections must stay fully inside or outside a group.`;
		case 'invalid-subgraph':
			return formatInvalidSubgraphError(groupName, result.errors[0]);
	}
}

function formatInvalidSubgraphError(groupName: string, error?: ExtractableErrorResult): string {
	switch (error?.errorCode) {
		case 'Multiple Input Nodes':
			return `Group "${groupName}" has multiple entry points (${formatNodeNames([...error.nodes])}). A group can have only one entry node.`;
		case 'Multiple Output Nodes':
			return `Group "${groupName}" has multiple exit points (${formatNodeNames([...error.nodes])}). A group can have only one exit node.`;
		case 'Input Edge To Non-Root Node':
			return `Node "${error.node}" in group "${groupName}" receives a connection from outside the group. Connections into a group must go to its first node.`;
		case 'Output Edge From Non-Leaf Node':
			return `Node "${error.node}" in group "${groupName}" sends a connection outside the group. Connections out of a group must come from its last node.`;
		case 'No Continuous Path From Root To Leaf In Selection':
			return `The nodes in group "${groupName}" are not all connected to each other. Grouped nodes must form a single connected sequence.`;
		default:
			return `Group "${groupName}" is not a valid selection of nodes.`;
	}
}

function formatNodeNames(names: string[]): string {
	return names.map((name) => `"${name}"`).join(', ');
}

/**
 * BadRequestError thrown by validateWorkflowStructure when a workflow fails
 * structural Zod / graph validation. Carries the original WorkflowStructureIssue[]
 * so downstream consumers (e.g. the Instance AI submit-workflow tool) can build
 * rich diagnostics — node JSON at the offending path, value at the path, and a
 * full nodes[] name map — without reparsing the flattened message string.
 *
 * The status code (400) and `Workflow structure is invalid. <details>` message
 * are unchanged from before this class existed, so REST clients are unaffected.
 */
export class WorkflowStructureBadRequestError extends BadRequestError {
	constructor(
		message: string,
		readonly issues: WorkflowStructureIssue[],
	) {
		super(message);
	}
}

export function validateWorkflowStructure(workflow: Pick<IWorkflowBase, 'nodes' | 'connections'>) {
	const result = safeParseWorkflowStructure(workflow);

	if (result.success) return;

	const details = result.issues
		.map(({ path, message, code }) => {
			const formattedPath = Array.isArray(path)
				? formatWorkflowStructureIssuePath(path)
				: 'workflow';

			return `${formattedPath} (${code}): ${message}`;
		})
		.join('; ');

	throw new WorkflowStructureBadRequestError(
		`Workflow structure is invalid. ${details}`,
		result.issues,
	);
}

/**
 * Removes default values from workflow settings to avoid storing them in the database.
 * Returns a new settings object without mutating the original.
 *
 * @param settings - The workflow settings to clean
 * @param defaultExecutionTimeout - The default execution timeout from global config
 * @returns A new settings object with default values removed
 */
export function removeDefaultValues(
	settings: IWorkflowSettings,
	defaultExecutionTimeout: number,
): IWorkflowSettings {
	const cleanedSettings = { ...settings };

	// Remove settings that are set to 'DEFAULT'
	const keysAllowingDefault = [
		'errorWorkflow',
		'timezone',
		'saveDataErrorExecution',
		'saveDataSuccessExecution',
		'saveManualExecutions',
		'saveExecutionProgress',
	] as const;

	for (const key of keysAllowingDefault) {
		if (cleanedSettings[key] === 'DEFAULT') {
			delete cleanedSettings[key];
		}
	}

	// Remove executionTimeout if it matches the default
	if (cleanedSettings.executionTimeout === defaultExecutionTimeout) {
		delete cleanedSettings.executionTimeout;
	}

	// Remove credentialResolverId if it was cleared (empty string from UI clear action)
	if (!cleanedSettings.credentialResolverId) {
		delete cleanedSettings.credentialResolverId;
	}

	return cleanedSettings;
}

// Checking if credentials of old format are in use and run a DB check if they might exist uniquely
export async function replaceInvalidCredentials<T extends IWorkflowBase>(
	workflow: T,
	projectId: string,
): Promise<T> {
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
			// Skip undefined/null credentials (e.g. from SDK's newCredential() which serializes to undefined)
			if (nodeCredentials === null || nodeCredentials === undefined) {
				continue;
			}
			// AI Gateway managed credentials have no real DB record — skip, handled at execution time
			if (nodeCredentials.__aiGatewayManaged) continue;

			// Check if Node applies old credentials style
			if (typeof nodeCredentials === 'string' || nodeCredentials.id === null) {
				const name = typeof nodeCredentials === 'string' ? nodeCredentials : nodeCredentials.name;
				// init cache for type
				if (!credentialsByName[nodeCredentialType]) {
					credentialsByName[nodeCredentialType] = {};
				}
				if (credentialsByName[nodeCredentialType][name] === undefined) {
					const credentials = await Container.get(CredentialsRepository).findByNameAndTypeInProject(
						name,
						nodeCredentialType,
						projectId,
					);
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
				const credsByName = await Container.get(CredentialsRepository).findByNameAndTypeInProject(
					nodeCredentials.name,
					nodeCredentialType,
					projectId,
				);
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
 * Note: In "run once for each item" mode, multiple child executions may complete concurrently and
 * attempt to update the same parent execution. This creates a race condition where the last child
 * to write wins. However, this is acceptable for Promise.race semantics - we only care that the
 * parent receives ONE child's final output (whichever child's update happens to be last before
 * the parent resumes), not which specific child. Only one child will successfully resume the parent
 * due to the atomic status check in ActiveExecutions.add().
 *
 * @param parentExecutionId - The execution ID of the waiting parent workflow
 * @param subworkflowResults - The final execution results from the child workflow
 * @returns Promise that resolves when the parent execution has been updated
 */
export async function updateParentExecutionWithChildResults(
	parentExecutionId: string,
	subworkflowResults: IRun,
	childExecution?: RelatedExecution,
): Promise<void> {
	const subworkflowError = subworkflowResults.data.resultData.error;
	const lastExecutedNodeData = getLastExecutedNodeData(subworkflowResults);
	if (!subworkflowError && !lastExecutedNodeData?.data) return;
	const executionPersistence = Container.get(ExecutionPersistence);
	const parent = await executionPersistence.findSingleExecution(parentExecutionId, {
		includeData: true,
		unflattenData: true,
	});

	if (parent?.status !== 'waiting') {
		return;
	}

	const parentWithSubWorkflowResults = { data: { ...parent.data } };

	const nodeExecutionStack = parentWithSubWorkflowResults.data.executionData?.nodeExecutionStack;
	if (!nodeExecutionStack || nodeExecutionStack?.length === 0) {
		return;
	}

	if (subworkflowError) {
		// Record the error on the waiting parent's Execute Workflow node so the node
		// fails with error on resume instead of appearing as successful. `subExecution`
		// links the parent's node run to the failed child execution in the UI.
		nodeExecutionStack[0].metadata = {
			...nodeExecutionStack[0].metadata,
			resumeError: subworkflowError,
			...(childExecution && { subExecution: childExecution }),
		};
	} else if (lastExecutedNodeData?.data) {
		// Copy the sub workflow result to the parent execution's Execute Workflow node inputs
		// so that the Execute Workflow node returns the correct data when parent execution is resumed
		// and the Execute Workflow node is executed again in disabled mode.
		nodeExecutionStack[0].data = lastExecutedNodeData.data;
	}

	await executionPersistence.updateExistingExecution(
		parentExecutionId,
		parentWithSubWorkflowResults,
	);
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

/**
 * Removes the last run data entry so the node is not displayed as executed twice
 * when resuming. If the entry had an inputOverride (e.g. for chat tool or HITL
 * nodes), a placeholder entry is pushed back preserving only the inputOverride
 * and source so the LLM's input stays visible in logs after the execution resumes.
 */
export function preserveInputOverride(runDataArray: ITaskData[]): void {
	const entryToPop = runDataArray.pop()!;
	const preservedInputOverride = entryToPop.inputOverride;
	if (preservedInputOverride) {
		runDataArray.push({
			startTime: 0,
			executionTime: 0,
			executionIndex: 0,
			source: entryToPop.source,
			inputOverride: preservedInputOverride,
		});
	}
}
