import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { INodeMetadata, NodeMetadataMap } from '@/Interface';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type NodeMetadataNodePayload = {
	nodeName: string;
	metadata: INodeMetadata | undefined;
};

export type NodeMetadataBulkPayload = {
	nodeMetadata: NodeMetadataMap;
};

export type NodeMetadataChangeEvent =
	| ChangeEvent<NodeMetadataNodePayload>
	| ChangeEvent<NodeMetadataBulkPayload>;

export function useWorkflowDocumentNodeMetadata() {
	const nodeMetadata = ref<NodeMetadataMap>({});

	const onNodeMetadataChange = createEventHook<NodeMetadataChangeEvent>();

	// -------------------------------------------------------------------
	// Apply methods (private) — only functions that mutate state
	// -------------------------------------------------------------------

	function applySetAll(map: NodeMetadataMap, action: ChangeAction = CHANGE_ACTION.UPDATE) {
		nodeMetadata.value = map;
		void onNodeMetadataChange.trigger({ action, payload: { nodeMetadata: map } });
	}

	function applyInitNode(name: string, seed: INodeMetadata) {
		nodeMetadata.value = { ...nodeMetadata.value, [name]: seed };
		void onNodeMetadataChange.trigger({
			action: CHANGE_ACTION.ADD,
			payload: { nodeName: name, metadata: seed },
		});
	}

	function applyPatchNode(name: string, patch: Partial<INodeMetadata>) {
		const existing = nodeMetadata.value[name] ?? ({} as INodeMetadata);
		const merged: INodeMetadata = { ...existing, ...patch };
		nodeMetadata.value = { ...nodeMetadata.value, [name]: merged };
		void onNodeMetadataChange.trigger({
			action: CHANGE_ACTION.UPDATE,
			payload: { nodeName: name, metadata: merged },
		});
	}

	function applyDeleteFields(name: string, fields: Array<keyof INodeMetadata>) {
		if (!nodeMetadata.value[name]) return;
		const next = { ...nodeMetadata.value[name] };
		for (const field of fields) {
			delete next[field];
		}
		nodeMetadata.value = { ...nodeMetadata.value, [name]: next };
		void onNodeMetadataChange.trigger({
			action: CHANGE_ACTION.UPDATE,
			payload: { nodeName: name, metadata: next },
		});
	}

	function applyDeleteNode(name: string) {
		if (!nodeMetadata.value.hasOwnProperty(name)) return;
		const { [name]: _removed, ...rest } = nodeMetadata.value;
		nodeMetadata.value = rest;
		void onNodeMetadataChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { nodeName: name, metadata: undefined },
		});
	}

	function applyRenameNode(oldName: string, newName: string) {
		if (!nodeMetadata.value.hasOwnProperty(oldName)) return;
		const { [oldName]: renamed, ...rest } = nodeMetadata.value;
		nodeMetadata.value = { ...rest, [newName]: renamed };
		void onNodeMetadataChange.trigger({
			action: CHANGE_ACTION.UPDATE,
			payload: { nodeName: newName, metadata: renamed },
		});
	}

	// -------------------------------------------------------------------
	// Public API
	// -------------------------------------------------------------------

	function setAllNodeMetadata(map: NodeMetadataMap): void {
		applySetAll(map);
	}

	/** Idempotent init — matches legacy `addNode` which creates an empty entry. */
	function initNodeMetadata(nodeName: string): void {
		if (nodeMetadata.value[nodeName]) return;
		applyInitNode(nodeName, {} as INodeMetadata);
	}

	/** Idempotent init with pristine=true — matches legacy `setNodes` behavior. */
	function initPristineNodeMetadata(nodeName: string): void {
		if (nodeMetadata.value[nodeName]) return;
		applyInitNode(nodeName, { pristine: true });
	}

	function removeNodeMetadata(nodeName: string): void {
		applyDeleteNode(nodeName);
	}

	function renameNodeMetadata(oldName: string, newName: string): void {
		applyRenameNode(oldName, newName);
	}

	function setNodePristine(nodeName: string, pristine: boolean): void {
		applyPatchNode(nodeName, { pristine });
	}

	function touchParametersLastUpdatedAt(nodeName: string): void {
		if (!nodeMetadata.value[nodeName]) {
			applyInitNode(nodeName, { pristine: true });
		}
		applyPatchNode(nodeName, { parametersLastUpdatedAt: Date.now() });
	}

	function touchPinnedDataLastUpdatedAt(nodeName: string): void {
		if (!nodeMetadata.value[nodeName]) {
			applyInitNode(nodeName, { pristine: true });
		}
		applyPatchNode(nodeName, { pinnedDataLastUpdatedAt: Date.now() });
	}

	function touchPinnedDataLastRemovedAt(nodeName: string): void {
		if (!nodeMetadata.value[nodeName]) {
			applyInitNode(nodeName, { pristine: true });
		}
		applyPatchNode(nodeName, { pinnedDataLastRemovedAt: Date.now() });
	}

	function clearPinnedDataTimestamps(nodeName: string): void {
		applyDeleteFields(nodeName, ['pinnedDataLastUpdatedAt', 'pinnedDataLastRemovedAt']);
	}

	function getParametersLastUpdate(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.parametersLastUpdatedAt;
	}

	function getPinnedDataLastUpdate(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.pinnedDataLastUpdatedAt;
	}

	function getPinnedDataLastRemovedAt(nodeName: string): number | undefined {
		return nodeMetadata.value[nodeName]?.pinnedDataLastRemovedAt;
	}

	function isNodePristine(nodeName: string): boolean {
		const entry = nodeMetadata.value[nodeName];
		return entry === undefined || entry.pristine;
	}

	return {
		nodeMetadata: readonly(nodeMetadata),
		setAllNodeMetadata,
		initNodeMetadata,
		initPristineNodeMetadata,
		removeNodeMetadata,
		renameNodeMetadata,
		setNodePristine,
		touchParametersLastUpdatedAt,
		touchPinnedDataLastUpdatedAt,
		touchPinnedDataLastRemovedAt,
		clearPinnedDataTimestamps,
		getParametersLastUpdate,
		getPinnedDataLastUpdate,
		getPinnedDataLastRemovedAt,
		isNodePristine,
		onNodeMetadataChange: onNodeMetadataChange.on,
	};
}
