/**
 * Expression Resolution for Coordinator SharedWorker
 *
 * Pre-computes resolved expression values and stores them in the execution
 * CRDT document. This allows frontend components to read resolved values
 * reactively without on-demand resolution.
 *
 * Resolution triggers:
 * - seedDocument: Initial resolution using pinned data
 * - Node parameter changes: Re-resolve affected node
 * - Push events (nodeExecuteAfterData): Re-resolve with run data
 */

import {
	isExpression,
	ExpressionError,
	createRunExecutionData,
	NodeConnectionTypes,
	type IExecuteData,
	type INode,
	type INodeExecutionData,
	type IRunData,
	type IPinData,
	type IWorkflowDataProxyAdditionalKeys,
	type Workflow,
} from 'n8n-workflow';
import type { CRDTDoc } from '@n8n/crdt';
import { toJSON } from '@n8n/crdt';
import type { CoordinatorState, CRDTDocumentState, CRDTExecutionDocumentState } from '../types';
import {
	resolvedParamKey,
	type ResolvedValue,
	type ResolvedState,
} from '../../../../features/crdt/types/executionDocument.types';

// =============================================================================
// Main Resolution Function
// =============================================================================

/**
 * Resolve all expressions for a node and update the execution doc.
 * Uses path-based keys: "{nodeId}:{paramPath}" → ResolvedValue
 *
 * Handles:
 * - Added parameters with expressions → resolve and add
 * - Changed expressions → re-resolve and update
 * - Removed parameters → delete old keys
 * - Changed expression → literal → delete key
 */
export function resolveNodeExpressions(
	_state: CoordinatorState,
	workflowDocState: CRDTDocumentState,
	execDocState: CRDTExecutionDocumentState,
	nodeId: string,
): void {
	const workflow = workflowDocState.workflow;
	if (!workflow) return;

	const node = findNodeById(workflow, nodeId);
	if (!node) return;

	// Get execution context
	const runData = getRunDataFromExecDoc(execDocState);
	const pinData = getPinDataFromWorkflowDoc(workflowDocState.doc);

	const resolvedParamsMap = execDocState.doc.getMap('resolvedParams');
	const prefix = `${nodeId}:`;

	// Track which keys we process (to detect removed expressions)
	const currentExpressionKeys = new Set<string>();

	// Walk all parameters, find expressions, resolve them
	walkParams(node.parameters, [], (path, value) => {
		const paramPath = `parameters.${path.join('.')}`;
		const key = resolvedParamKey(nodeId, paramPath);

		if (!isExpression(value)) {
			// Not an expression - if there was a resolved value before, remove it
			// (handles case: expression → literal)
			if (resolvedParamsMap.has(key)) {
				resolvedParamsMap.delete(key);
			}
			return;
		}

		currentExpressionKeys.add(key);

		// Resolve the expression
		const resolvedValue = resolveExpression(workflow, node, value as string, runData, pinData);

		resolvedParamsMap.set(key, resolvedValue);
	});

	// Clean up removed expressions (keys for this node that no longer exist)
	for (const key of resolvedParamsMap.keys()) {
		if (key.startsWith(prefix) && !currentExpressionKeys.has(key)) {
			resolvedParamsMap.delete(key);
		}
	}
}

// =============================================================================
// Expression Resolution
// =============================================================================

/**
 * Resolve a single expression and return the result.
 */
function resolveExpression(
	workflow: Workflow,
	node: INode,
	expression: string,
	runData: IRunData | null,
	pinData: IPinData | null,
): ResolvedValue {
	try {
		// Build connection input data from run data or pin data
		const connectionInputData = getConnectionInputData(workflow, node, runData, pinData);

		// Build run execution data structure if we have run data
		const runExecutionData = runData ? createRunExecutionData({ resultData: { runData } }) : null;

		// Build executeData with source info (CRITICAL for $() expressions)
		const executeData = buildExecuteData(workflow, node, runData, pinData);

		// Add basic additional keys (minimal set needed for expressions)
		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$execution: {
				id: 'crdt-preview',
				mode: 'manual',
				resumeUrl: '',
				resumeFormUrl: '',
			},
			$vars: {},
		};

		const resolved = workflow.expression.resolveSimpleParameterValue(
			expression,
			node.parameters,
			runExecutionData,
			0, // runIndex
			0, // itemIndex
			node.name,
			connectionInputData,
			'manual',
			additionalKeys,
			executeData,
		);

		return {
			expression,
			resolved,
			state: 'valid',
			resolvedAt: Date.now(),
		};
	} catch (error) {
		const state = getErrorState(error);
		const errorMessage = getExpressionErrorMessage(error);
		return {
			expression,
			resolved: null,
			state,
			error: errorMessage,
			resolvedAt: Date.now(),
		};
	}
}

/**
 * Build IExecuteData structure for expression resolution.
 * This provides source information needed for $() expressions.
 */
function buildExecuteData(
	workflow: Workflow,
	node: INode,
	runData: IRunData | null,
	pinData: IPinData | null,
): IExecuteData {
	const inputName = NodeConnectionTypes.Main;
	const parentNodes = workflow.getParentNodes(node.name, inputName, 1);

	const executeData: IExecuteData = {
		node,
		data: {},
		source: null,
	};

	if (parentNodes.length === 0) {
		return executeData;
	}

	const parentNodeName = parentNodes[0];

	// Try pin data first
	if (pinData?.[parentNodeName]) {
		executeData.data = { main: [pinData[parentNodeName]] };
		executeData.source = { main: [{ previousNode: parentNodeName }] };
		return executeData;
	}

	// Try run data
	if (runData?.[parentNodeName]?.[0]?.data) {
		executeData.data = runData[parentNodeName][0].data;
		executeData.source = {
			main: [
				{
					previousNode: parentNodeName,
					previousNodeRun: 0,
				},
			],
		};
		return executeData;
	}

	return executeData;
}

/**
 * Determine the resolution state based on the error type.
 */
function getErrorState(error: unknown): ResolvedState {
	if (error instanceof ExpressionError) {
		const errorType = error.context?.type;
		// These errors mean we're waiting for execution data
		if (
			errorType === 'no_execution_data' ||
			errorType === 'no_node_execution_data' ||
			errorType === 'paired_item_intermediate_nodes'
		) {
			return 'pending';
		}
	}
	return 'invalid';
}

/**
 * Get a user-friendly error message for expression errors.
 * Mirrors the logic in getExpressionErrorMessage from expressions.ts
 * but without i18n since we're in a worker context.
 */
function getExpressionErrorMessage(error: unknown): string {
	if (!(error instanceof ExpressionError)) {
		return error instanceof Error ? error.message : String(error);
	}

	const errorType = error.context?.type;
	const nodeCause = error.context?.nodeCause as string | undefined;

	switch (errorType) {
		case 'no_execution_data':
		case 'paired_item_intermediate_nodes':
			return 'No execution data';
		case 'no_node_execution_data':
			return nodeCause ? `Execute node '${nodeCause}' for preview` : 'No node execution data';
		case 'no_input_connection':
			return 'No input connected';
		case 'paired_item_no_connection':
			return 'No path back to node';
		case 'paired_item_invalid_info':
		case 'paired_item_no_info':
			return "Can't determine which item to use";
		default:
			// For other errors, use the message from the error
			return error.message;
	}
}

// =============================================================================
// Data Access Helpers
// =============================================================================

/**
 * Find a node in the workflow by its ID.
 */
function findNodeById(workflow: Workflow, nodeId: string): INode | undefined {
	// Workflow.nodes is an object keyed by name, so we need to search
	for (const node of Object.values(workflow.nodes)) {
		if (node.id === nodeId) {
			return node;
		}
	}
	return undefined;
}

/**
 * Get run data from the execution document.
 */
function getRunDataFromExecDoc(execDocState: CRDTExecutionDocumentState): IRunData | null {
	const runDataMap = execDocState.doc.getMap('runData');

	const runData: IRunData = {};
	for (const [nodeName, nodeRuns] of runDataMap.entries()) {
		if (nodeRuns && typeof nodeRuns === 'object' && 'toArray' in nodeRuns) {
			// It's a CRDT array
			const array = (nodeRuns as { toArray(): unknown[] }).toArray();
			runData[nodeName] = array.map((item) =>
				typeof item === 'object' && item !== null && 'toJSON' in item
					? (item as { toJSON(): unknown }).toJSON()
					: item,
			) as IRunData[string];
		}
	}

	return Object.keys(runData).length > 0 ? runData : null;
}

/**
 * Get pin data from the workflow document.
 */
function getPinDataFromWorkflowDoc(doc: CRDTDoc): IPinData | null {
	const pinDataMap = doc.getMap('pinData');

	const pinData: IPinData = {};
	for (const [nodeId, data] of pinDataMap.entries()) {
		if (data) {
			pinData[nodeId] = toJSON(data) as INodeExecutionData[];
		}
	}

	return Object.keys(pinData).length > 0 ? pinData : null;
}

/**
 * Get connection input data for expression resolution.
 * Uses pin data or run data from the parent node.
 */
function getConnectionInputData(
	workflow: Workflow,
	node: INode,
	runData: IRunData | null,
	pinData: IPinData | null,
): INodeExecutionData[] {
	// Get parent nodes
	const parentNodes = workflow.getParentNodes(node.name, 'main', 1);
	if (parentNodes.length === 0) return [];

	const parentNodeName = parentNodes[0];

	// Try pin data first (uses node name as key for pin data)
	if (pinData?.[parentNodeName]) {
		return pinData[parentNodeName];
	}

	// Try run data
	if (runData?.[parentNodeName]?.[0]?.data?.main?.[0]) {
		return runData[parentNodeName][0].data.main[0];
	}

	return [];
}

// =============================================================================
// Parameter Walking
// =============================================================================

/**
 * Recursively walk parameters and call fn for each leaf value.
 * This finds all expressions nested in objects and arrays.
 */
function walkParams(
	obj: unknown,
	path: string[],
	fn: (path: string[], value: unknown) => void,
): void {
	if (obj === null || obj === undefined) return;

	if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
		fn(path, obj);
		return;
	}

	if (Array.isArray(obj)) {
		obj.forEach((item, index) => walkParams(item, [...path, String(index)], fn));
		return;
	}

	if (typeof obj === 'object') {
		for (const [key, value] of Object.entries(obj)) {
			walkParams(value, [...path, key], fn);
		}
	}
}

// =============================================================================
// Bulk Resolution
// =============================================================================

/**
 * Resolve expressions for all nodes in a workflow.
 * Used during initial seeding.
 */
export function resolveAllNodeExpressions(
	state: CoordinatorState,
	workflowDocState: CRDTDocumentState,
	execDocState: CRDTExecutionDocumentState,
): void {
	const workflow = workflowDocState.workflow;
	if (!workflow) return;

	for (const node of Object.values(workflow.nodes)) {
		if (node.id) {
			resolveNodeExpressions(state, workflowDocState, execDocState, node.id);
		}
	}
}

/**
 * Get the IDs of nodes downstream of a given node.
 * Used to re-resolve dependent nodes after execution data arrives.
 */
export function getDownstreamNodeIds(workflow: Workflow, nodeName: string): string[] {
	const childNames = workflow.getChildNodes(nodeName, 'main');
	const ids: string[] = [];

	for (const childName of childNames) {
		const node = workflow.getNode(childName);
		if (node?.id) {
			ids.push(node.id);
		}
	}

	return ids;
}

// =============================================================================
// Autocomplete Expression Resolution
// =============================================================================

/**
 * Resolve an arbitrary expression for autocomplete purposes.
 * Unlike resolveNodeExpressions(), this resolves a single expression on-demand
 * and returns the resolved value directly (not stored in CRDT).
 *
 * @param workflow - The workflow instance
 * @param nodeName - The node context for resolution
 * @param expression - The expression to resolve (e.g., "={{ $json }}")
 * @param runData - Run data from execution document
 * @param pinData - Pin data from workflow document
 * @returns The resolved value, or null if resolution fails
 */
export function resolveExpressionForAutocomplete(
	workflow: Workflow,
	nodeName: string,
	expression: string,
	runData: IRunData | null,
	pinData: IPinData | null,
): unknown {
	const node = workflow.getNode(nodeName);
	if (!node) return null;

	try {
		// Build connection input data from run data or pin data
		const connectionInputData = getConnectionInputData(workflow, node, runData, pinData);

		// Build run execution data structure if we have run data
		const runExecutionData = runData ? createRunExecutionData({ resultData: { runData } }) : null;

		// Build executeData with source info (CRITICAL for $() expressions)
		const executeData = buildExecuteData(workflow, node, runData, pinData);

		// Add basic additional keys (minimal set needed for expressions)
		const additionalKeys: IWorkflowDataProxyAdditionalKeys = {
			$execution: {
				id: 'autocomplete-preview',
				mode: 'manual',
				resumeUrl: '',
				resumeFormUrl: '',
			},
			$vars: {},
		};

		return workflow.expression.resolveSimpleParameterValue(
			expression,
			node.parameters,
			runExecutionData,
			0, // runIndex
			0, // itemIndex
			node.name,
			connectionInputData,
			'manual',
			additionalKeys,
			executeData,
		);
	} catch {
		// For autocomplete, we silently return null on errors
		// The user will just get no completions
		return null;
	}
}

/**
 * Get run data from an execution document state.
 * Exported for use by the coordinator worker.
 */
export { getRunDataFromExecDoc };

/**
 * Get pin data from a workflow CRDT document.
 * Exported for use by the coordinator worker.
 */
export { getPinDataFromWorkflowDoc };
