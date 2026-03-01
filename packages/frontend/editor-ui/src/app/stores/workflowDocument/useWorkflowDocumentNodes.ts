import { computed } from 'vue';
import { createEventHook } from '@vueuse/core';
import type {
	INodeIssueData,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import type {
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	XYPosition,
} from '@/Interface';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { isObject } from '@/app/utils/objectUtils';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import findLast from 'lodash/findLast';
// --- Event types ---

export type NodesChangeEvent =
	| { action: 'add'; node: INodeUi }
	| { action: 'update'; node: INodeUi }
	| { action: 'delete'; name: string };

// --- Deps ---

export interface WorkflowDocumentNodesDeps {
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
}

// --- Composable ---

export function useWorkflowDocumentNodes(deps: WorkflowDocumentNodesDeps) {
	const workflowsStore = useWorkflowsStore();

	const onNodesChange = createEventHook<NodesChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	/**
	 * Low-level node update by array index.
	 * @returns `true` if the object was changed
	 */
	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): boolean {
		if (nodeIndex !== -1) {
			const node = workflowsStore.workflow.nodes[nodeIndex];
			const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
			const changed = !isEqual(existingData, nodeData);

			if (changed) {
				Object.assign(node, nodeData);
				workflowsStore.workflow.nodes[nodeIndex] = node;
				workflowsStore.workflowObject.setNodes(workflowsStore.workflow.nodes);
			}

			return changed;
		}
		return false;
	}

	// -----------------------------------------------------------------------
	// Apply methods — CRDT entry point in Phase C. Today they just delegate.
	// -----------------------------------------------------------------------

	function applySetNodes(nodes: INodeUi[]) {
		workflowsStore.setNodes(nodes);
	}

	function applyAddNode(node: INodeUi) {
		workflowsStore.addNode(node);
		void onNodesChange.trigger({ action: 'add', node });
	}

	function applyRemoveNode(name: string) {
		const node = workflowsStore.getNodeByName(name);
		if (node) {
			workflowsStore.removeNode(node);
		}
		void onNodesChange.trigger({ action: 'delete', name });
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const allNodes = computed<INodeUi[]>(() => workflowsStore.allNodes);

	const nodesByName = computed<Record<string, INodeUi>>(() => workflowsStore.nodesByName);

	const canvasNames = computed<Set<string>>(
		() => new Set(workflowsStore.allNodes.map((n) => n.name)),
	);

	function findNode(id: string): INodeUi | undefined {
		return workflowsStore.getNodeById(id);
	}

	function findNodeByName(name: string): INodeUi | null {
		return workflowsStore.getNodeByName(name);
	}

	function getNodes(): INodeUi[] {
		return workflowsStore.getNodes();
	}

	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		return workflowsStore.findNodeByPartialId(partialId);
	}

	function getNodesByIds(ids: string[]): INodeUi[] {
		return workflowsStore.getNodesByIds(ids);
	}

	// -----------------------------------------------------------------------
	// Write API
	// -----------------------------------------------------------------------

	function setNodes(nodes: INodeUi[]): void {
		applySetNodes(nodes);
	}

	function addNode(node: INodeUi): void {
		applyAddNode(node);
	}

	function removeNode(node: INodeUi): void {
		applyRemoveNode(node.name);
	}

	function removeNodeById(id: string): void {
		const node = workflowsStore.getNodeById(id);
		workflowsStore.removeNodeById(id);
		void onNodesChange.trigger({ action: 'delete', name: node?.name ?? id });
	}

	function setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex(
			(node) => node.name === updateInformation.name,
		);

		if (nodeIndex === -1) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const { name, parameters } = workflowsStore.workflow.nodes[nodeIndex];

		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...parameters, ...updateInformation.value }
				: updateInformation.value;

		const changed = updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			void onStateDirty.trigger();
			workflowsStore.nodeMetadata[name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(
			workflowsStore.workflow.nodes,
			(node) => node.type === updateInformation.key,
		) as INodeUi;
		const nodeType = deps.getNodeType(latestNode.type);
		if (!nodeType) return;

		const nodeParams = NodeHelpers.getNodeParameters(
			nodeType.properties,
			updateInformation.value as INodeParameters,
			true,
			false,
			latestNode,
			nodeType,
		);

		if (latestNode) {
			setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
		}
	}

	function setNodeValue(updateInformation: IUpdateInformation): void {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex(
			(node) => node.name === updateInformation.name,
		);

		if (nodeIndex === -1 || !updateInformation.key) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const changed = updateNodeAtIndex(nodeIndex, {
			[updateInformation.key]: updateInformation.value,
		});

		if (changed) {
			void onStateDirty.trigger();
		}

		const excludeKeys = ['position', 'notes', 'notesInFlow'];

		if (changed && !excludeKeys.includes(updateInformation.key)) {
			workflowsStore.nodeMetadata[
				workflowsStore.workflow.nodes[nodeIndex].name
			].parametersLastUpdatedAt = Date.now();
		}
	}

	function setNodePositionById(id: string, position: XYPosition): void {
		const node = workflowsStore.workflow.nodes.find((n) => n.id === id);
		if (!node) return;

		setNodeValue({ name: node.name, key: 'position', value: position });
	}

	function updateNodeById(nodeId: string, nodeData: Partial<INodeUi>): boolean {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex((node) => node.id === nodeId);
		if (nodeIndex === -1) return false;
		return updateNodeAtIndex(nodeIndex, nodeData);
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex(
			(node) => node.name === updateInformation.name,
		);

		if (nodeIndex !== -1) {
			for (const key of Object.keys(updateInformation.properties)) {
				const typedKey = key as keyof INodeUpdatePropertiesInformation['properties'];
				const property = updateInformation.properties[typedKey];

				const changed = updateNodeAtIndex(nodeIndex, { [key]: property });

				if (changed) {
					void onStateDirty.trigger();
				}
			}
		}

		// TODO: migrate workflowStateEventBus.emit('updateNodeProperties', ...) when callers switch
	}

	function setNodeIssue(nodeIssueData: INodeIssueData): void {
		const nodeIndex = workflowsStore.workflow.nodes.findIndex(
			(node) => node.name === nodeIssueData.node,
		);
		if (nodeIndex === -1) {
			return;
		}

		const node = workflowsStore.workflow.nodes[nodeIndex];

		if (nodeIssueData.value === null) {
			if (node.issues?.[nodeIssueData.type] === undefined) {
				return;
			}

			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { [nodeIssueData.type]: _removedNodeIssue, ...remainingNodeIssues } = node.issues;
			updateNodeAtIndex(nodeIndex, {
				issues: remainingNodeIssues,
			});
		} else {
			updateNodeAtIndex(nodeIndex, {
				issues: {
					...node.issues,
					[nodeIssueData.type]: nodeIssueData.value as INodeIssueObjectProperty,
				},
			});
		}
	}

	function removeAllNodes(data: { setStateDirty: boolean; removePinData: boolean }): void {
		if (data.setStateDirty) {
			void onStateDirty.trigger();
		}

		// TODO: handle data.removePinData — needs store-level orchestration to call setPinData({})

		workflowsStore.workflow.nodes.splice(0, workflowsStore.workflow.nodes.length);
		workflowsStore.workflowObject.setNodes(workflowsStore.workflow.nodes);
		workflowsStore.nodeMetadata = {};
	}

	function resetAllNodesIssues(): boolean {
		workflowsStore.workflow.nodes.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	function resetParametersLastUpdatedAt(nodeName: string): void {
		if (!workflowsStore.nodeMetadata[nodeName]) {
			workflowsStore.nodeMetadata[nodeName] = { pristine: true };
		}
		workflowsStore.nodeMetadata[nodeName].parametersLastUpdatedAt = Date.now();
	}

	return {
		// Read
		allNodes,
		nodesByName,
		canvasNames,
		findNode,
		findNodeByName,
		getNodes,
		findNodeByPartialId,
		getNodesByIds,

		// Write
		setNodes,
		addNode,
		removeNode,
		removeNodeById,
		setNodeParameters,
		setNodeValue,
		setNodePositionById,
		updateNodeProperties,
		updateNodeById,
		setNodeIssue,
		removeAllNodes,
		resetAllNodesIssues,
		setLastNodeParameters,
		resetParametersLastUpdatedAt,

		// Events
		onNodesChange: onNodesChange.on,
		onStateDirty: onStateDirty.on,
	};
}
