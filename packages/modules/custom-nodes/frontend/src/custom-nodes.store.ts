import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
	CreateCustomNodeDto,
	CreateParentCustomActionDto,
	CustomActionParent,
	CustomNodeResponse,
	ParentCustomActionResponse,
	RollbackCustomActionRevisionDto,
	SaveCustomActionDto,
	SetCustomNodeIconDto,
	UpdateCustomNodeDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	addCustomNodeAction,
	addParentCustomAction,
	createCustomNode,
	deleteCustomAction,
	deleteCustomNode,
	getCustomActionVersion,
	getCustomNode,
	getCustomNodeIconUrl,
	listCustomActionParents,
	listCustomNodes,
	listParentCustomActions,
	previewCustomAction,
	rollbackCustomActionRevision,
	saveCustomAction,
	setCustomNodeIcon,
	updateCustomNode,
} from './custom-nodes.api';
import { CUSTOM_NODES_STORE_ID } from './custom-nodes.constants';

export const useCustomNodesStore = defineStore(CUSTOM_NODES_STORE_ID, () => {
	const rootStore = useRootStore();

	const nodes = ref<CustomNodeResponse[]>([]);
	const parentActions = ref<ParentCustomActionResponse[]>([]);
	const parents = ref<CustomActionParent[]>([]);
	const loading = ref(false);
	// Not reactive: a computed that calls `ensureLoaded` must not re-run when a load starts or fails.
	let loadRequested = false;

	async function fetchAll() {
		loadRequested = true;
		loading.value = true;
		try {
			const context = rootStore.restApiContext;
			[nodes.value, parentActions.value] = await Promise.all([
				listCustomNodes(context),
				listParentCustomActions(context),
			]);
		} finally {
			loading.value = false;
		}
	}

	/** Starts one load in the background. Later calls do nothing. */
	function ensureLoaded() {
		if (loadRequested) return;
		loadRequested = true;
		// A computed or a render can call this. The load starts after it, so no state changes during it.
		queueMicrotask(() => {
			fetchAll().catch(() => {
				// `refresh` tries again. The lists stay empty until then.
			});
		});
	}

	/** Reloads the lists when a load happened before. A failure keeps the old lists. */
	async function refresh() {
		if (!loadRequested) return;
		try {
			await fetchAll();
		} catch {
			// The old lists stay. The next refresh tries again.
		}
	}

	async function fetchParents() {
		parents.value = await listCustomActionParents(rootStore.restApiContext);
	}

	/** Runs a write, then reloads the lists so they show the new state. */
	async function write<T>(operation: () => Promise<T>): Promise<T> {
		const result = await operation();
		await fetchAll();
		return result;
	}

	async function createNode(payload: CreateCustomNodeDto) {
		return await write(async () => await createCustomNode(rootStore.restApiContext, payload));
	}

	async function updateNode(id: string, payload: UpdateCustomNodeDto) {
		return await write(async () => await updateCustomNode(rootStore.restApiContext, id, payload));
	}

	async function deleteNode(id: string) {
		await write(async () => await deleteCustomNode(rootStore.restApiContext, id));
	}

	async function setNodeIcon(id: string, payload: SetCustomNodeIconDto) {
		await write(async () => await setCustomNodeIcon(rootStore.restApiContext, id, payload));
	}

	async function addActionToNode(nodeId: string, payload: SaveCustomActionDto) {
		return await write(
			async () => await addCustomNodeAction(rootStore.restApiContext, nodeId, payload),
		);
	}

	async function addParentAction(payload: CreateParentCustomActionDto) {
		return await write(async () => await addParentCustomAction(rootStore.restApiContext, payload));
	}

	async function saveAction(id: string, payload: SaveCustomActionDto) {
		return await write(async () => await saveCustomAction(rootStore.restApiContext, id, payload));
	}

	async function rollbackRevision(
		id: string,
		version: number,
		payload: RollbackCustomActionRevisionDto,
	) {
		return await write(
			async () =>
				await rollbackCustomActionRevision(rootStore.restApiContext, id, version, payload),
		);
	}

	async function deleteAction(id: string) {
		await write(async () => await deleteCustomAction(rootStore.restApiContext, id));
	}

	async function fetchNode(id: string) {
		return await getCustomNode(rootStore.restApiContext, id);
	}

	async function fetchActionVersion(id: string, version: number) {
		return await getCustomActionVersion(rootStore.restApiContext, id, version);
	}

	async function preview(draft: SaveCustomActionDto['draft']) {
		return await previewCustomAction(rootStore.restApiContext, { draft });
	}

	function iconUrl(nodeId: string) {
		return getCustomNodeIconUrl(rootStore.restApiContext, nodeId);
	}

	return {
		nodes,
		parentActions,
		parents,
		loading,
		fetchAll,
		ensureLoaded,
		refresh,
		fetchParents,
		fetchNode,
		fetchActionVersion,
		preview,
		iconUrl,
		createNode,
		updateNode,
		deleteNode,
		setNodeIcon,
		addActionToNode,
		addParentAction,
		saveAction,
		rollbackRevision,
		deleteAction,
	};
});
