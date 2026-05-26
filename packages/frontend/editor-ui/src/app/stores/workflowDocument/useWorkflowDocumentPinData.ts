import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { INodeExecutionData, IDataObject, IPinData } from 'n8n-workflow';
import { isJsonKeyObject, stringSizeInBytes } from '@/app/utils/typesUtils';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

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

export function useWorkflowDocumentPinData() {
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

	return {
		pinnedDataByNodeName: readonly(pinnedDataByNodeName),
		setPinData,
		pinNodeData,
		unpinNodeData,
		renamePinDataNode,
		getPinDataSnapshot,
		getNodePinData,
		onPinnedDataChange: onPinnedDataChange.on,
	};
}
