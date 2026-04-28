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
import { getCredentialOnlyNodeTypeName } from '@/app/utils/credentialOnlyNodes';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import findLast from 'lodash/findLast';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';
import type { useWorkflowDocumentNodeMetadata } from './useWorkflowDocumentNodeMetadata';
import { isPresent } from '@/app/utils/typesUtils';

// --- Event types ---

export type NodeAddedPayload = { node: INodeUi };
export type NodeRemovedPayload = { name: string; id: string };
export type NodeUpdatedPayload = { name: string };
export type NodesResetPayload = object;

export type NodesChangeEvent =
	| ChangeEvent<NodeAddedPayload>
	| ChangeEvent<NodeRemovedPayload>
	| ChangeEvent<NodeUpdatedPayload>
	| ChangeEvent<NodesResetPayload>;

// --- Deps ---

export interface WorkflowDocumentNodesDeps {
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
	assignNodeId: (node: INodeUi) => string;
	syncWorkflowObject: (nodes: INodeUi[]) => void;
	unpinNodeData: (name: string) => void;
	nodeMetadata: ReturnType<typeof useWorkflowDocumentNodeMetadata>;
}

// --- Composable ---

// TODO: This composable currently delegates to workflowsStore for reads and writes.
// The long-term goal is to remove workflowsStore entirely — workflow and
// workflowObject will become private state owned by workflowDocumentStore.
// Once that happens, the direct import (and the import-cycle warning it causes)
// will go away.
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
		if (nodeIndex === -1) return false;

		const node = workflowsStore.workflow.nodes[nodeIndex];
		const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
		const changed = !isEqual(existingData, nodeData);

		if (changed) {
			Object.assign(node, nodeData);
			workflowsStore.workflow.nodes[nodeIndex] = node;
			deps.syncWorkflowObject(workflowsStore.workflow.nodes);
			void onNodesChange.trigger({
				action: CHANGE_ACTION.UPDATE,
				payload: { name: node.name },
			});
		}

		return changed;
	}

	// -----------------------------------------------------------------------
	// Apply methods — will become the CRDT entry point. Today they delegate.
	// -----------------------------------------------------------------------

	function applySetNodes(nodes: INodeUi[]) {
		for (const node of nodes) {
			if (!node.id) {
				deps.assignNodeId(node);
			}

			if (node.extendsCredential) {
				node.type = getCredentialOnlyNodeTypeName(node.extendsCredential);
			}

			if (node.position) {
				node.position = snapPositionToGrid(node.position);
			}
		}

		workflowsStore.workflow.nodes = nodes;
		deps.syncWorkflowObject(workflowsStore.workflow.nodes);
		// setNodes replaces the full node list, so reset metadata to match
		deps.nodeMetadata.setAllNodeMetadata({});
		for (const node of nodes) {
			deps.nodeMetadata.initPristineNodeMetadata(node.name);
		}
	}

	function applyAddNode(node: INodeUi) {
		if (!node.hasOwnProperty('name')) {
			return;
		}

		workflowsStore.workflow.nodes.push(node);
		deps.syncWorkflowObject(workflowsStore.workflow.nodes);
		deps.nodeMetadata.initNodeMetadata(node.name);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { node },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNode(node: INodeUi) {
		const idx = workflowsStore.workflow.nodes.findIndex((n) => n.name === node.name);
		if (idx !== -1) {
			workflowsStore.workflow.nodes = [
				...workflowsStore.workflow.nodes.slice(0, idx),
				...workflowsStore.workflow.nodes.slice(idx + 1),
			];
		}

		deps.syncWorkflowObject(workflowsStore.workflow.nodes);
		deps.nodeMetadata.removeNodeMetadata(node.name);
		deps.unpinNodeData(node.name);
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node.name, id: node.id },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNodeById(id: string) {
		const node = workflowsStore.workflow.nodes.find((n) => n.id === id);
		const idx = workflowsStore.workflow.nodes.findIndex((n) => n.id === id);
		if (idx !== -1) {
			workflowsStore.workflow.nodes = [
				...workflowsStore.workflow.nodes.slice(0, idx),
				...workflowsStore.workflow.nodes.slice(idx + 1),
			];
		}
		deps.syncWorkflowObject(workflowsStore.workflow.nodes);
		if (node) {
			deps.nodeMetadata.removeNodeMetadata(node.name);
			deps.unpinNodeData(node.name);
		}
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node?.name ?? '', id },
		});
		void onStateDirty.trigger();
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const allNodes = computed<INodeUi[]>(() => workflowsStore.workflow.nodes);

	const nodesByName = computed<Record<string, INodeUi>>(() => workflowsStore.nodesByName);

	const canvasNames = computed(() => new Set(allNodes.value.map((n) => n.name)));

	function getNodeById(id: string): INodeUi | undefined {
		return workflowsStore.workflow.nodes.find((node) => node.id === id);
	}

	function getNodeByName(name: string): INodeUi | null {
		return workflowsStore.getNodeByName(name);
	}

	function getNodes(): INodeUi[] {
		return workflowsStore.getNodes();
	}

	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		return workflowsStore.workflow.nodes.find((node) => node.id.startsWith(partialId));
	}

	function getNodesByIds(nodeIds: string[]): INodeUi[] {
		return nodeIds.map(getNodeById).filter(isPresent);
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
		applyRemoveNode(node);
	}

	function removeNodeById(id: string): void {
		applyRemoveNodeById(id);
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
			deps.nodeMetadata.touchParametersLastUpdatedAt(name);
		}
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(
			workflowsStore.workflow.nodes,
			(node) => node.type === updateInformation.key,
		);
		if (!latestNode) return;

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

		setNodeParameters({ value: nodeParams, name: latestNode.name }, true);
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
			deps.nodeMetadata.touchParametersLastUpdatedAt(workflowsStore.workflow.nodes[nodeIndex].name);
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

	function removeAllNodes(): void {
		workflowsStore.workflow.nodes.splice(0, workflowsStore.workflow.nodes.length);
		deps.syncWorkflowObject(workflowsStore.workflow.nodes);
		deps.nodeMetadata.setAllNodeMetadata({});
		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: {},
		});
	}

	function resetAllNodesIssues(): boolean {
		workflowsStore.workflow.nodes.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	return {
		// Read
		allNodes,
		nodesByName,
		canvasNames,
		getNodeById,
		getNodeByName,
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

		// Events
		onNodesChange: onNodesChange.on,
		onStateDirty: onStateDirty.on,
	};
}
