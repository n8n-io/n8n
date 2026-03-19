import { computed } from 'vue';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useAIAssistantHelpers } from '@/features/ai/assistant/composables/useAIAssistantHelpers';
import type { InstanceAiCanvasContext } from '@n8n/api-types';
import type { INodeConnections } from 'n8n-workflow';

/**
 * Collects the current canvas context (workflow info + selected nodes)
 * for inclusion in Instance AI messages.
 *
 * The `canvasContext` computed provides a lightweight sync snapshot (selected nodes, workflow ID).
 * `collectCanvasContext()` is an async function that gathers the full rich context
 * (workflow JSON, execution data, expressions, schemas) using existing AI assistant helpers.
 *
 * Returns `undefined` when not on a canvas (no workflow loaded).
 */
export function useCanvasContext() {
	const workflowsStore = useWorkflowsStore();
	const uiStore = useUIStore();
	const settingsStore = useSettingsStore();

	/** Lightweight sync context — used for quick checks and the system prompt. */
	const canvasContext = computed<InstanceAiCanvasContext | undefined>(() => {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;

		const workflowName = workflowsStore.workflowName;
		const allNodes = workflowsStore.allNodes;

		const selectedNodeName = uiStore.lastSelectedNode;
		const selectedNodes = buildSelectedNodes(selectedNodeName, workflowsStore);

		return {
			workflowId,
			workflowName,
			nodeCount: allNodes.length,
			selectedNodes: selectedNodes.length > 0 ? selectedNodes : undefined,
		};
	});

	/**
	 * Collect the full rich canvas context for sending with messages.
	 * Gathers workflow JSON, execution data, expressions, schemas, and pin data.
	 * Respects the privacy setting for parameter values.
	 */
	async function collectCanvasContext(): Promise<InstanceAiCanvasContext | undefined> {
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;

		const valuesExcluded = !settingsStore.isAiDataSharingEnabled;
		const helpers = useAIAssistantHelpers();

		const workflowName = workflowsStore.workflowName;
		const allNodes = workflowsStore.allNodes;
		const workflow = workflowsStore.workflow;

		// Build selected nodes with topology
		const selectedNodeName = uiStore.lastSelectedNode;
		const selectedNodes = buildSelectedNodes(selectedNodeName, workflowsStore);

		// Simplified workflow JSON (unsaved state from canvas)
		const currentWorkflow = await helpers.simplifyWorkflowForAssistant(workflow, {
			excludeParameterValues: valuesExcluded,
		});

		// Execution data (may include partial/unsaved executions)
		const executionResultData = workflowsStore.getWorkflowExecution?.data?.resultData ?? undefined;
		const executionData = executionResultData
			? helpers.simplifyResultData(executionResultData, {
					compact: true,
					removeParameterValues: valuesExcluded,
				})
			: undefined;

		// Expressions — resolve expressions from workflow nodes
		const expressionValues = await helpers.extractExpressionsFromWorkflow(
			workflow,
			executionResultData,
		);

		// Node schemas (input/output shapes)
		const allNodeNames = allNodes.map((n) => n.name);
		const { schemas } = helpers.getNodesSchemas(workflowId, allNodeNames, valuesExcluded);
		const executionSchema =
			schemas.length > 0
				? schemas.map((s) => ({ nodeName: s.nodeName, schema: s.schema }))
				: undefined;

		// Pinned nodes
		const pinData = workflow.pinData;
		const pinnedNodes = pinData ? Object.keys(pinData) : undefined;

		return {
			workflowId,
			workflowName,
			currentWorkflow: currentWorkflow as unknown as Record<string, unknown>,
			executionData: executionData as unknown as Record<string, unknown>,
			expressionValues: Object.keys(expressionValues).length > 0 ? expressionValues : undefined,
			executionSchema,
			selectedNodes: selectedNodes.length > 0 ? selectedNodes : undefined,
			nodeCount: allNodes.length,
			pinnedNodes: pinnedNodes && pinnedNodes.length > 0 ? pinnedNodes : undefined,
			valuesExcluded: valuesExcluded || undefined,
		};
	}

	return { canvasContext, collectCanvasContext };
}

interface SelectedNodeInfo {
	name: string;
	type: string;
	parameters?: Record<string, unknown>;
	issues?: Record<string, string[]>;
	incomingConnections?: string[];
	outgoingConnections?: string[];
}

function buildSelectedNodes(
	selectedNodeName: string | null,
	workflowsStore: ReturnType<typeof useWorkflowsStore>,
): SelectedNodeInfo[] {
	if (!selectedNodeName) return [];

	const node = workflowsStore.getNodeByName(selectedNodeName);
	if (!node) return [];

	// Get connection info
	const incoming = workflowsStore.incomingConnectionsByNodeName(node.name);
	const outgoing = workflowsStore.outgoingConnectionsByNodeName(node.name);

	const incomingNames = extractConnectedNodeNames(incoming);
	const outgoingNames = extractConnectedNodeNames(outgoing);

	// Flatten issues to Record<string, string[]>
	const issues = node.issues ? flattenIssues(node.issues as Record<string, unknown>) : undefined;

	return [
		{
			name: node.name,
			type: node.type,
			...(node.parameters && Object.keys(node.parameters).length > 0
				? { parameters: node.parameters as Record<string, unknown> }
				: {}),
			...(issues && Object.keys(issues).length > 0 ? { issues } : {}),
			...(incomingNames.length > 0 ? { incomingConnections: incomingNames } : {}),
			...(outgoingNames.length > 0 ? { outgoingConnections: outgoingNames } : {}),
		},
	];
}

function extractConnectedNodeNames(connections: INodeConnections): string[] {
	const names = new Set<string>();
	for (const type of Object.values(connections)) {
		for (const outputs of type) {
			if (!outputs) continue;
			for (const conn of outputs) {
				if (conn.node) names.add(conn.node);
			}
		}
	}
	return [...names];
}

function flattenIssues(issues: Record<string, unknown>): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(issues)) {
		if (Array.isArray(value)) {
			result[key] = value.map(String);
		} else if (typeof value === 'string') {
			result[key] = [value];
		}
	}
	return result;
}
