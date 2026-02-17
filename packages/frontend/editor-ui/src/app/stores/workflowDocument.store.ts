import { defineStore, getActivePinia, type StoreGeneric } from 'pinia';
import { STORES } from '@n8n/stores';
import { ref, readonly, inject } from 'vue';
import type { INodeExecutionData, IPinData } from 'n8n-workflow';
import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { isJsonKeyObject, stringSizeInBytes } from '@/app/utils/typesUtils';
import { dataPinningEventBus } from '@/app/event-bus';

// Pinia internal type - _s is the store registry Map
type PiniaInternal = ReturnType<typeof getActivePinia> & {
	_s: Map<string, StoreGeneric>;
};

export type WorkflowDocumentId = `${string}@${string}`;

export function createWorkflowDocumentId(
	workflowId: string,
	version: string = 'latest',
): WorkflowDocumentId {
	return `${workflowId}@${version}`;
}

type Action<N, P> = { name: N; payload: P };

type SetTagsAction = Action<'setTags', { tags: string[] }>;
type AddTagsAction = Action<'addTags', { tags: string[] }>;
type RemoveTagAction = Action<'removeTag', { tagId: string }>;

type SetPinDataAction = Action<'setPinData', { pinData: IPinData }>;
type PinNodeDataAction = Action<'pinNodeData', { nodeName: string; data: INodeExecutionData[] }>;
type UnpinNodeDataAction = Action<'unpinNodeData', { nodeName: string }>;
type RenamePinDataNodeAction = Action<'renamePinDataNode', { oldName: string; newName: string }>;

type WorkflowDocumentAction =
	| SetTagsAction
	| AddTagsAction
	| RemoveTagAction
	| SetPinDataAction
	| PinNodeDataAction
	| UnpinNodeDataAction
	| RenamePinDataNodeAction;

/**
 * Gets the store ID for a workflow document store.
 */
export function getWorkflowDocumentStoreId(id: string) {
	return `${STORES.WORKFLOW_DOCUMENTS}/${id}`;
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
 * Creates a workflow document store for a specific workflow ID.
 *
 * Note: We use a factory function rather than a module-level cache because
 * Pinia store instances must be tied to the active Pinia instance. A module-level
 * cache would cause test isolation issues where stale store references persist
 * across test runs with different Pinia instances.
 *
 * Pinia internally handles store deduplication per-instance via the store ID.
 */
export function useWorkflowDocumentStore(id: WorkflowDocumentId) {
	return defineStore(getWorkflowDocumentStoreId(id), () => {
		const [workflowId, workflowVersion] = id.split('@');

		/**
		 * Tags
		 */

		const tags = ref<string[]>([]);

		function setTags(newTags: string[]) {
			onChange({ name: 'setTags', payload: { tags: newTags } });
		}

		function addTags(newTags: string[]) {
			onChange({ name: 'addTags', payload: { tags: newTags } });
		}

		function removeTag(tagId: string) {
			onChange({ name: 'removeTag', payload: { tagId } });
		}

		/**
		 * Pin Data
		 */

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

		function pinDataByNodeName(nodeName: string): INodeExecutionData[] | undefined {
			if (!pinData.value[nodeName]) return undefined;

			return pinData.value[nodeName].map((item) => item.json) as INodeExecutionData[];
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
		 * Handle actions in a CRDT like manner
		 */

		function onChange(action: WorkflowDocumentAction) {
			if (action.name === 'setTags') {
				tags.value = action.payload.tags;
			} else if (action.name === 'addTags') {
				const uniqueTags = new Set([...tags.value, ...action.payload.tags]);
				tags.value = Array.from(uniqueTags);
			} else if (action.name === 'removeTag') {
				tags.value = tags.value.filter((tag) => tag !== action.payload.tagId);
			} else if (action.name === 'setPinData') {
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
			workflowId,
			workflowVersion,
			tags: readonly(tags),
			setTags,
			addTags,
			removeTag,
			pinData: readonly(pinData),
			setPinData,
			pinNodeData,
			unpinNodeData,
			renamePinDataNode,
			pinDataByNodeName,
			getPinDataSnapshot,
			getNodePinData,
		};
	})();
}

/**
 * Disposes a workflow document store by ID.
 * Call this when a workflow document is unloaded (e.g., when navigating away from NodeView).
 *
 * This removes the store from Pinia's internal registry, freeing memory and preventing
 * stale stores from accumulating over time.
 */
export function disposeWorkflowDocumentStore(id: string) {
	const pinia = getActivePinia() as PiniaInternal;
	if (!pinia) return;

	const storeId = getWorkflowDocumentStoreId(id);

	// Check if the store exists in the Pinia state
	if (pinia.state.value[storeId]) {
		// Get the store instance
		const store = pinia._s.get(storeId);
		if (store) {
			store.$dispose();
		}
		// Remove from Pinia's state
		delete pinia.state.value[storeId];
	}
}

/**
 * Injects the workflow document store from the current component tree.
 * Returns null if not within a component context that has provided the store.
 *
 * Use this in composables/stores that need to interact with the current workflow's
 * document store but may be called outside of the NodeView tree.
 */
export function injectWorkflowDocumentStore() {
	const storeRef = inject(WorkflowDocumentStoreKey, null);
	return storeRef?.value ?? null;
}
