/**
 * Workflow Execution Operation
 *
 * Executes a workflow using the Coordinator's synced Workflow instance.
 * The Coordinator holds an up-to-date Workflow that's kept in sync with
 * the CRDT document, so we can extract the current state and send it
 * to the server for execution.
 */

import type {
	INode,
	IConnections,
	IWorkflowSettings,
	IPinData,
	IDataObject,
	INodeTypeDescription,
} from 'n8n-workflow';

import type { CoordinatorState } from '../types';

// Common manual trigger node types
const MANUAL_TRIGGER_TYPES = [
	'n8n-nodes-base.manualTrigger',
	'@n8n/n8n-nodes-langchain.manualChatTrigger',
];

/**
 * Workflow data structure for execution API.
 * This is a subset of IWorkflowBase that the execution endpoint needs.
 */
interface ExecutionWorkflowData {
	id: string;
	name: string;
	nodes: INode[];
	connections: IConnections;
	settings?: IWorkflowSettings;
	staticData?: IDataObject;
	pinData?: IPinData;
}

/**
 * Execute a workflow using the Coordinator's synced Workflow instance.
 *
 * @param state - Coordinator state (has crdtDocuments with workflow)
 * @param workflowId - The workflow ID to execute
 * @param pushRef - Push reference for receiving execution updates
 * @param triggerNodeName - Optional trigger node to start from
 * @returns The execution ID, or null if failed
 */
export async function executeWorkflow(
	state: CoordinatorState,
	workflowId: string,
	pushRef: string,
	triggerNodeName?: string,
): Promise<string | null> {
	const docState = state.crdtDocuments.get(workflowId);
	if (!docState?.workflow) {
		return null;
	}

	const { workflow } = docState;

	// Use state.baseUrl (set during coordinator.initialize) for REST calls
	const baseUrl = state.baseUrl;
	if (!baseUrl) {
		return null;
	}

	// Extract workflow data from the synced Workflow instance
	// Only include fields needed for execution
	const workflowData: ExecutionWorkflowData = {
		id: workflowId,
		name: workflow.name ?? 'Unnamed Workflow',
		nodes: Object.values(workflow.nodes) as INode[],
		connections: workflow.connectionsBySourceNode as IConnections,
		settings: workflow.settings,
		staticData: workflow.staticData,
		pinData: workflow.pinData,
	};

	// Find trigger node if not specified
	let triggerName = triggerNodeName;
	if (!triggerName) {
		// Find a manual trigger node in the workflow
		const nodes = Object.values(workflow.nodes) as INode[];
		const manualTrigger = nodes.find((node) => MANUAL_TRIGGER_TYPES.includes(node.type));

		if (manualTrigger) {
			triggerName = manualTrigger.name;
		} else {
			// Fall back to any trigger node (check nodeTypes for group: ['trigger'])
			for (const node of nodes) {
				const nodeType = docState.nodeTypes.get(node.type) as INodeTypeDescription | undefined;
				if (nodeType?.group?.includes('trigger')) {
					triggerName = node.name;
					break;
				}
			}
		}
	}

	if (!triggerName) {
		return null;
	}

	// Build execution payload with triggerToStartFrom
	// This matches FullManualExecutionFromKnownTriggerPayload type
	const payload = {
		workflowData,
		triggerToStartFrom: { name: triggerName },
	};

	try {
		// Remove trailing slash to avoid double slashes in URL
		const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
		const response = await fetch(`${normalizedBaseUrl}/rest/workflows/${workflowId}/run`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'push-ref': pushRef,
			},
			credentials: 'include',
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Execution failed: ${response.status} ${response.statusText} - ${errorText}`);
		}

		const result = (await response.json()) as { data?: { executionId?: string } };
		return result.data?.executionId ?? null;
	} catch {
		return null;
	}
}
