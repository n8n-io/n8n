import {
	effectScope,
	ref,
	readonly,
	shallowReactive,
	type ComputedRef,
	type ShallowRef,
} from 'vue';
import { createEventHook } from '@vueuse/core';
import { structuralComputed } from '@n8n/composables/structuralComputed';
import isEqual from 'lodash/isEqual';
import type { INodeExecutionData, IDataObject, IPinData } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';
import { isJsonKeyObject, stringSizeInBytes } from '@/app/utils/typesUtils';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';
import type {
	NodeAddedPayload,
	NodeRemovedPayload,
	NodesChangeEvent,
	NodesSetPayload,
} from './useWorkflowDocumentNodes';

export type PinDataNodePayload = {
	nodeName: string;
	data: INodeExecutionData[] | undefined;
};

export type PinDataBulkPayload = {
	pinData: IPinData;
};

export type PinDataChangeEvent = ChangeEvent<PinDataNodePayload> | ChangeEvent<PinDataBulkPayload>;

/**
 * Strips runtime properties from node execution data items.
 * Only keeps json, binary, and pairedItem.
 */
function normalizeNodeExecutionData(data: INodeExecutionData[]): INodeExecutionData[] {
	if (!Array.isArray(data)) {
		data = [data];
	}

	return data.map((item) => {
		if (isJsonKeyObject(item)) {
			const { json, binary, pairedItem } = item;
			return {
				json,
				...(binary && { binary }),
				...(pairedItem !== undefined && { pairedItem }),
			};
		}
		return { json: item };
	}) as INodeExecutionData[];
}

function normalizePinData(data: IPinData): IPinData {
	return Object.keys(data).reduce<IPinData>((accu, nodeName) => {
		accu[nodeName] = data[nodeName].map((item) => {
			if (!isJsonKeyObject(item)) {
				return { json: item };
			}
			return item;
		});
		return accu;
	}, {});
}

export function pinDataToExecutionData(
	pinData: Readonly<Record<string, ReadonlyArray<{ readonly json: IDataObject }>>>,
): Record<string, IDataObject[]> {
	return Object.fromEntries(
		Object.entries(pinData).map(([nodeName, items]) => [nodeName, items.map((item) => item.json)]),
	);
}

export function getPinDataSize(
	pinData: Record<string, string | INodeExecutionData[]> = {},
): number {
	return Object.values(pinData).reduce<number>((acc, value) => {
		return acc + stringSizeInBytes(value);
	}, 0);
}

export type WorkflowDocumentPinDataDeps = {
	nodesById: ShallowRef<Map<string, INodeUi>>;
	onNodesChange: (cb: (event: NodesChangeEvent) => void) => void;
};

export function useWorkflowDocumentPinData(deps: WorkflowDocumentPinDataDeps) {
	const pinnedDataByNodeName = ref<IPinData>({});

	const onPinnedDataChange = createEventHook<PinDataChangeEvent>();

	function applyPinData(data: IPinData, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		pinnedDataByNodeName.value = data;
		void onPinnedDataChange.trigger({ action, payload: { pinData: data } });
	}

	function applyNodePinData(nodeName: string, data: INodeExecutionData[]) {
		const action: ChangeAction = pinnedDataByNodeName.value[nodeName]
			? CHANGE_ACTION.UPDATE
			: CHANGE_ACTION.ADD;
		pinnedDataByNodeName.value = { ...pinnedDataByNodeName.value, [nodeName]: data };
		void onPinnedDataChange.trigger({ action, payload: { nodeName, data } });
	}

	function applyUnpin(nodeName: string) {
		const { [nodeName]: _, ...rest } = pinnedDataByNodeName.value;
		pinnedDataByNodeName.value = rest;
		void onPinnedDataChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { nodeName, data: undefined },
		});
	}

	function applyRenamePinDataNode(oldName: string, newName: string) {
		if (pinnedDataByNodeName.value[oldName]) {
			const { [oldName]: renamed, ...rest } = pinnedDataByNodeName.value;
			pinnedDataByNodeName.value = { ...rest, [newName]: renamed };
		}
		Object.values(pinnedDataByNodeName.value)
			.flatMap((executionData) =>
				executionData.flatMap((nodeExecution) =>
					Array.isArray(nodeExecution.pairedItem)
						? nodeExecution.pairedItem
						: [nodeExecution.pairedItem],
				),
			)
			.forEach((pairedItem) => {
				if (typeof pairedItem === 'number' || pairedItem?.sourceOverwrite?.previousNode !== oldName)
					return;
				pairedItem.sourceOverwrite.previousNode = newName;
			});
		void onPinnedDataChange.trigger({
			action: CHANGE_ACTION.UPDATE,
			payload: { nodeName: newName, data: pinnedDataByNodeName.value[newName] },
		});
	}

	function setPinData(newPinData: IPinData) {
		applyPinData(normalizePinData(newPinData));
	}

	function pinNodeData(nodeName: string, data: INodeExecutionData[]) {
		applyNodePinData(nodeName, normalizeNodeExecutionData(data));
	}

	function unpinNodeData(nodeName: string) {
		applyUnpin(nodeName);
	}

	function renamePinDataNode(oldName: string, newName: string) {
		applyRenamePinDataNode(oldName, newName);
	}

	function getPinDataSnapshot(): IPinData {
		return { ...pinnedDataByNodeName.value };
	}

	function getNodePinData(nodeName: string): INodeExecutionData[] | undefined {
		return pinnedDataByNodeName.value[nodeName];
	}

	// Per-node-id pin-data lookup. See useWorkflowDocumentNodeTypeInfo for an
	// explanation of the shallowReactive + structuralComputed pattern.
	// The derivation reads pinnedDataByNodeName via node.name, so the entry
	// invalidates on pin changes (ref replaced) and on node renames (reactive
	// node proxy's name read changes).
	const pinnedDataByNodeId = shallowReactive(
		new Map<string, ComputedRef<INodeExecutionData[] | undefined>>(),
	);
	const scopes = new Map<string, () => void>();

	function computePinnedData(nodeId: string): INodeExecutionData[] | undefined {
		const node = deps.nodesById.value.get(nodeId);
		if (!node) return undefined;
		return pinnedDataByNodeName.value[node.name];
	}

	function applyAddPinEntry(nodeId: string) {
		if (scopes.has(nodeId)) return;
		const scope = effectScope();
		scope.run(() => {
			pinnedDataByNodeId.set(
				nodeId,
				structuralComputed(() => computePinnedData(nodeId), isEqual),
			);
		});
		scopes.set(nodeId, () => scope.stop());
	}

	function applyRemovePinEntry(nodeId: string) {
		scopes.get(nodeId)?.();
		scopes.delete(nodeId);
		pinnedDataByNodeId.delete(nodeId);
	}

	function applyReconcilePinEntries(nodeIds: string[]) {
		const nextIds = new Set(nodeIds);
		for (const oldId of scopes.keys()) {
			if (!nextIds.has(oldId)) applyRemovePinEntry(oldId);
		}
		for (const id of nodeIds) applyAddPinEntry(id);
	}

	deps.onNodesChange((event) => {
		switch (event.action) {
			case CHANGE_ACTION.ADD: {
				const { node } = event.payload as NodeAddedPayload;
				applyAddPinEntry(node.id);
				break;
			}
			case CHANGE_ACTION.DELETE: {
				const payload = event.payload as NodeRemovedPayload;
				if (payload.id) {
					applyRemovePinEntry(payload.id);
				} else {
					applyReconcilePinEntries([]);
				}
				// Orphan pin cleanup: removing a node also clears any pinned data
				// keyed by its name. Previously this was a cross-cut owned by
				// useWorkflowDocumentNodes via an injected `unpinNodeData` dep;
				// pulling it into the pinData subscriber means nodes doesn't need
				// to know about pinData at all (breaks the construction cycle).
				if (payload.name) applyUnpin(payload.name);
				break;
			}
			case CHANGE_ACTION.SET: {
				const { nodeIds } = event.payload as NodesSetPayload;
				applyReconcilePinEntries(nodeIds);
				break;
			}
		}
	});

	applyReconcilePinEntries(Array.from(deps.nodesById.value.keys()));

	return {
		pinnedDataByNodeName: readonly(pinnedDataByNodeName),
		pinnedDataByNodeId,
		setPinData,
		pinNodeData,
		unpinNodeData,
		renamePinDataNode,
		getPinDataSnapshot,
		getNodePinData,
		onPinnedDataChange: onPinnedDataChange.on,
	};
}
