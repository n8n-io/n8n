import { ref, readonly } from 'vue';
import type { INodeExecutionData, IDataObject, IPinData } from 'n8n-workflow';
import { isJsonKeyObject, stringSizeInBytes } from '@/app/utils/typesUtils';
import { dataPinningEventBus } from '@/app/event-bus';

type Action<N, P> = { name: N; payload: P };

type SetPinDataAction = Action<'setPinData', { pinData: IPinData }>;
type PinNodeDataAction = Action<'pinNodeData', { nodeName: string; data: INodeExecutionData[] }>;
type UnpinNodeDataAction = Action<'unpinNodeData', { nodeName: string }>;
type RenamePinDataNodeAction = Action<'renamePinDataNode', { oldName: string; newName: string }>;

export type PinDataAction =
	| SetPinDataAction
	| PinNodeDataAction
	| UnpinNodeDataAction
	| RenamePinDataNodeAction;

const PIN_DATA_ACTION_NAMES = new Set<string>([
	'setPinData',
	'pinNodeData',
	'unpinNodeData',
	'renamePinDataNode',
]);

export function isPinDataAction(action: { name: string }): action is PinDataAction {
	return PIN_DATA_ACTION_NAMES.has(action.name);
}

/**
 * Normalize an array of node execution data items by stripping runtime properties.
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

/**
 * Normalize pin data by ensuring all items have the json key wrapper.
 */
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

/**
 * Extract the json values from pin data, producing a map of node names to plain data objects.
 */
export function pinDataToExecutionData(
	pinData: Readonly<Record<string, ReadonlyArray<{ readonly json: IDataObject }>>>,
): Record<string, IDataObject[]> {
	return Object.fromEntries(
		Object.entries(pinData).map(([nodeName, items]) => [nodeName, items.map((item) => item.json)]),
	);
}

/**
 * Calculate the byte size of pin data.
 */
export function getPinDataSize(
	pinData: Record<string, string | INodeExecutionData[]> = {},
): number {
	return Object.values(pinData).reduce<number>((acc, value) => {
		return acc + stringSizeInBytes(value);
	}, 0);
}

/**
 * Composable that encapsulates pin data state, public API, and mutation logic
 * for a workflow document store.
 *
 * Accepts an `onChange` callback that routes actions through the store's
 * unified dispatcher for CRDT migration readiness.
 */
export function useWorkflowDocumentPinData(onChange: (action: PinDataAction) => void) {
	const pinData = ref<IPinData>({});

	function setPinData(newPinData: IPinData) {
		onChange({ name: 'setPinData', payload: { pinData: newPinData } });
	}

	function pinNodeData(nodeName: string, data: INodeExecutionData[]) {
		onChange({ name: 'pinNodeData', payload: { nodeName, data } });
	}

	function unpinNodeData(nodeName: string) {
		onChange({ name: 'unpinNodeData', payload: { nodeName } });
	}

	function renamePinDataNode(oldName: string, newName: string) {
		onChange({ name: 'renamePinDataNode', payload: { oldName, newName } });
	}

	/** Returns a mutable shallow copy of all pin data, bypassing the readonly wrapper. */
	function getPinDataSnapshot(): IPinData {
		return { ...pinData.value };
	}

	/** Returns pin data for a specific node, bypassing the readonly wrapper. */
	function getNodePinData(nodeName: string): INodeExecutionData[] | undefined {
		return pinData.value[nodeName];
	}

	/**
	 * Apply a pin data action to the state.
	 * Called by the store's unified onChange dispatcher.
	 */
	function handleAction(action: PinDataAction) {
		if (action.name === 'setPinData') {
			const normalized = normalizePinData(action.payload.pinData);
			pinData.value = normalized;
			dataPinningEventBus.emit('pin-data', normalized);
		} else if (action.name === 'pinNodeData') {
			const storedData = normalizeNodeExecutionData(action.payload.data);
			pinData.value = { ...pinData.value, [action.payload.nodeName]: storedData };
			dataPinningEventBus.emit('pin-data', {
				[action.payload.nodeName]: storedData,
			});
		} else if (action.name === 'unpinNodeData') {
			const { [action.payload.nodeName]: _, ...rest } = pinData.value;
			pinData.value = rest;
			dataPinningEventBus.emit('unpin-data', {
				nodeNames: [action.payload.nodeName],
			});
		} else if (action.name === 'renamePinDataNode') {
			const { oldName, newName } = action.payload;
			if (pinData.value[oldName]) {
				const { [oldName]: renamed, ...rest } = pinData.value;
				pinData.value = { ...rest, [newName]: renamed };
			}
			// Update pairedItem sourceOverwrite references to the old node name
			Object.values(pinData.value)
				.flatMap((executionData) =>
					executionData.flatMap((nodeExecution) =>
						Array.isArray(nodeExecution.pairedItem)
							? nodeExecution.pairedItem
							: [nodeExecution.pairedItem],
					),
				)
				.forEach((pairedItem) => {
					if (
						typeof pairedItem === 'number' ||
						pairedItem?.sourceOverwrite?.previousNode !== oldName
					)
						return;
					pairedItem.sourceOverwrite.previousNode = newName;
				});
		}
	}

	return {
		pinData: readonly(pinData),
		setPinData,
		pinNodeData,
		unpinNodeData,
		renamePinDataNode,
		getPinDataSnapshot,
		getNodePinData,
		handleAction,
	};
}
