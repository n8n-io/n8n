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
	// Not reactive: a computed that calls `ensureLoaded` must not re-run when a load starts or ends.
	let loaded = false;
	// The newest load. Loads run one after the other, so an older response never replaces a newer one.
	let latestLoad: Promise<void> | undefined;

	async function fetchLists() {
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

	/** Loads the lists after the loads that started before. The request starts in a microtask. */
	async function fetchAll() {
		const load = (latestLoad ?? Promise.resolve())
			.catch(() => {
				// The caller of the earlier load handles its error.
			})
			.then(fetchLists);
		latestLoad = load;
		load
			.then(
				() => {
					loaded = true;
				},
				() => {
					// The caller handles the error. A next `ensureLoaded` tries again.
				},
			)
			.finally(() => {
				if (latestLoad === load) latestLoad = undefined;
			});
		await load;
	}

	/**
	 * Starts a load in the background when the lists are not loaded and no load runs.
	 * A computed or a render can call it: the request starts after it, so no state changes during it.
	 * After a failed load, the next call tries again. One call starts one load at most.
	 */
	function ensureLoaded() {
		if (loaded || latestLoad) return;
		fetchAll().catch(() => {
			// The lists stay empty. The next call tries again.
		});
	}

	/** Resolves when the running loads end, also when they fail. Starts a load if one is needed. */
	async function whenLoaded() {
		ensureLoaded();
		await latestLoad?.catch(() => {
			// A failed load leaves the lists as they are.
		});
	}

	/** Reloads the lists when a load happened or runs. A failure keeps the old lists. */
	async function refresh() {
		if (!loaded && !latestLoad) return;
		try {
			await fetchAll();
		} catch {
			// The old lists stay. The next refresh tries again.
		}
	}

	async function fetchParents() {
		parents.value = await listCustomActionParents(rootStore.restApiContext);
	}

	// Not reactive, for the same reason as `loaded`.
	let parentsLoaded = false;
	let parentsLoad: Promise<void> | undefined;

	/**
	 * Starts a load of the parents in the background when they are not loaded and no load runs.
	 * A computed or a render can call it. After a failed load, the next call tries again.
	 */
	function ensureParentsLoaded() {
		if (parentsLoaded || parentsLoad) return;
		const load = Promise.resolve()
			.then(fetchParents)
			.then(
				() => {
					parentsLoaded = true;
				},
				() => {
					// The parents stay empty. The next call tries again.
				},
			)
			.finally(() => {
				parentsLoad = undefined;
			});
		parentsLoad = load;
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
		whenLoaded,
		refresh,
		fetchParents,
		ensureParentsLoaded,
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
