import { computed, ref } from 'vue';
import { createEventHook } from '@vueuse/core';
import type {
	INodeIssueData,
	INodeIssueObjectProperty,
	INodeParameters,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeHelpers } from 'n8n-workflow';
import type {
	INodeMetadata,
	INodeUi,
	INodeUpdatePropertiesInformation,
	IUpdateInformation,
	NodeMetadataMap,
	XYPosition,
} from '@/Interface';
import { isObject } from '@/app/utils/objectUtils';
import { isPresent } from '@/app/utils/typesUtils';
import { snapPositionToGrid } from '@/app/utils/nodeViewUtils';
import { getCredentialOnlyNodeTypeName } from '@/app/utils/credentialOnlyNodes';
import pick from 'lodash/pick';
import isEqual from 'lodash/isEqual';
import findLast from 'lodash/findLast';
import { CHANGE_ACTION } from './types';
import type { ChangeEvent } from './types';

// --- Event types ---

export type NodeAddedPayload = { node: INodeUi };
export type NodeRemovedPayload = { name: string; id: string };

export type NodesChangeEvent = ChangeEvent<NodeAddedPayload> | ChangeEvent<NodeRemovedPayload>;

// --- Deps ---

export interface WorkflowDocumentNodesDeps {
	getNodeType: (typeName: string, version?: number) => INodeTypeDescription | null;
}

// --- Composable ---

export function useWorkflowDocumentNodes(deps: WorkflowDocumentNodesDeps) {
	const nodes = ref<INodeUi[]>([]);
	const nodeMetadata = ref<NodeMetadataMap>({});

	const onNodesChange = createEventHook<NodesChangeEvent>();
	// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
	const onStateDirty = createEventHook<void>();

	// -----------------------------------------------------------------------
	// Internal helpers
	// -----------------------------------------------------------------------

	function assignNodeId(node: INodeUi) {
		node.id = window.crypto.randomUUID();
	}

	/**
	 * Low-level node update by array index.
	 * @returns `true` if the object was changed
	 */
	function updateNodeAtIndex(nodeIndex: number, nodeData: Partial<INodeUi>): boolean {
		if (nodeIndex === -1) return false;

		const node = nodes.value[nodeIndex];
		const existingData = pick<Partial<INodeUi>>(node, Object.keys(nodeData));
		const changed = !isEqual(existingData, nodeData);

		if (changed) {
			Object.assign(node, nodeData);
			nodes.value[nodeIndex] = node;
		}

		return changed;
	}

	// -----------------------------------------------------------------------
	// Apply methods — will become the CRDT entry point.
	// -----------------------------------------------------------------------

	function applySetNodes(newNodes: INodeUi[]) {
		nodes.value = newNodes;
	}

	function applyAddNode(node: INodeUi) {
		nodes.value = [...nodes.value, node];

		if (!nodeMetadata.value[node.name]) {
			nodeMetadata.value[node.name] = {} as INodeMetadata;
		}

		void onNodesChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { node },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNode(node: INodeUi) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { [node.name]: _removedMetadata, ...remainingMetadata } = nodeMetadata.value;
		nodeMetadata.value = remainingMetadata;

		const index = nodes.value.findIndex((n) => n.name === node.name);
		if (index !== -1) {
			nodes.value = [...nodes.value.slice(0, index), ...nodes.value.slice(index + 1)];
		}

		void onNodesChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { name: node.name, id: node.id },
		});
		void onStateDirty.trigger();
	}

	function applyRemoveNodeById(id: string) {
		const node = nodes.value.find((n) => n.id === id);
		if (node) {
			applyRemoveNode(node);
		} else {
			void onNodesChange.trigger({
				action: CHANGE_ACTION.DELETE,
				payload: { name: '', id },
			});
			void onStateDirty.trigger();
		}
	}

	// -----------------------------------------------------------------------
	// Read API
	// -----------------------------------------------------------------------

	const allNodes = computed<INodeUi[]>(() => nodes.value);

	const nodesByName = computed<Record<string, INodeUi>>(() =>
		nodes.value.reduce<Record<string, INodeUi>>((acc, node) => {
			acc[node.name] = node;
			return acc;
		}, {}),
	);

	const canvasNames = computed<Set<string>>(() => new Set(nodes.value.map((n) => n.name)));

	function getNodeById(id: string): INodeUi | undefined {
		return nodes.value.find((node) => node.id === id);
	}

	function getNodeByName(name: string): INodeUi | null {
		return nodesByName.value[name] ?? null;
	}

	function getNodes(): INodeUi[] {
		return nodes.value.map((node) => ({ ...node }));
	}

	function findNodeByPartialId(partialId: string): INodeUi | undefined {
		return nodes.value.find((node) => node.id.startsWith(partialId));
	}

	function getNodesByIds(ids: string[]): INodeUi[] {
		return ids.map(getNodeById).filter(isPresent);
	}

	// -----------------------------------------------------------------------
	// Write API
	// -----------------------------------------------------------------------

	function setNodes(newNodes: INodeUi[]): void {
		newNodes.forEach((node) => {
			if (!node.id) {
				assignNodeId(node);
			}

			if (node.extendsCredential) {
				node.type = getCredentialOnlyNodeTypeName(node.extendsCredential);
			}

			if (node.position) {
				node.position = snapPositionToGrid(node.position);
			}

			if (!nodeMetadata.value[node.name]) {
				nodeMetadata.value[node.name] = { pristine: true };
			}
		});

		applySetNodes(newNodes);
	}

	function addNode(node: INodeUi): void {
		if (!('name' in node)) {
			return;
		}

		applyAddNode(node);
	}

	function removeNode(node: INodeUi): void {
		applyRemoveNode(node);
	}

	function removeNodeById(id: string): void {
		applyRemoveNodeById(id);
	}

	function setNodeParameters(updateInformation: IUpdateInformation, append?: boolean): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

		if (nodeIndex === -1) {
			throw new Error(
				`Node with the name "${updateInformation.name}" could not be found to set parameter.`,
			);
		}

		const { name, parameters } = nodes.value[nodeIndex];

		const newParameters =
			!!append && isObject(updateInformation.value)
				? { ...parameters, ...updateInformation.value }
				: updateInformation.value;

		const changed = updateNodeAtIndex(nodeIndex, {
			parameters: newParameters as INodeParameters,
		});

		if (changed) {
			void onStateDirty.trigger();
			nodeMetadata.value[name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setLastNodeParameters(updateInformation: IUpdateInformation): void {
		const latestNode = findLast(nodes.value, (node) => node.type === updateInformation.key);
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
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

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
			nodeMetadata.value[nodes.value[nodeIndex].name].parametersLastUpdatedAt = Date.now();
		}
	}

	function setNodePositionById(id: string, position: XYPosition): void {
		const node = nodes.value.find((n) => n.id === id);
		if (!node) return;

		setNodeValue({ name: node.name, key: 'position', value: position });
	}

	function updateNodeById(nodeId: string, nodeData: Partial<INodeUi>): boolean {
		const nodeIndex = nodes.value.findIndex((node) => node.id === nodeId);
		if (nodeIndex === -1) return false;
		return updateNodeAtIndex(nodeIndex, nodeData);
	}

	function updateNodeProperties(updateInformation: INodeUpdatePropertiesInformation): void {
		const nodeIndex = nodes.value.findIndex((node) => node.name === updateInformation.name);

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
		const nodeIndex = nodes.value.findIndex((node) => node.name === nodeIssueData.node);
		if (nodeIndex === -1) {
			return;
		}

		const node = nodes.value[nodeIndex];

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
		nodes.value = [];
		nodeMetadata.value = {};
	}

	function resetAllNodesIssues(): boolean {
		nodes.value.forEach((node) => {
			node.issues = undefined;
		});
		return true;
	}

	function resetParametersLastUpdatedAt(nodeName: string): void {
		if (!nodeMetadata.value[nodeName]) {
			nodeMetadata.value[nodeName] = { pristine: true };
		}
		nodeMetadata.value[nodeName].parametersLastUpdatedAt = Date.now();
	}

	return {
		// Read
		allNodes,
		nodesByName,
		nodeMetadata,
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
		resetParametersLastUpdatedAt,

		// Events
		onNodesChange: onNodesChange.on,
		onStateDirty: onStateDirty.on,
	};
}
