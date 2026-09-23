import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
	CreateCustomNodeDto,
	CreateCustomOperationDto,
	CustomNodeListItem,
	UpdateCustomNodeDto,
	UpdateCustomOperationDto,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	createCustomNode,
	createCustomOperation,
	deleteCustomNodeDefinition,
	getCustomNodes,
	reseedCustomNodes,
	setCustomOperationActiveVersion,
	updateCustomNode,
	updateCustomOperation,
	uploadCustomNodeIcon,
} from '@n8n/rest-api-client/api/customNodes';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { CUSTOM_NODES_STORE } from './customNodes.constants';

export const useCustomNodesStore = defineStore(CUSTOM_NODES_STORE, () => {
	const rootStore = useRootStore();
	const nodeTypesStore = useNodeTypesStore();

	const items = ref<CustomNodeListItem[]>([]);
	const loading = ref(false);

	const operations = computed(() => items.value.filter((item) => item.kind === 'operation'));
	const nodes = computed(() => items.value.filter((item) => item.kind === 'node'));

	async function fetchAll() {
		loading.value = true;
		try {
			items.value = await getCustomNodes(rootStore.restApiContext);
		} finally {
			loading.value = false;
		}
	}

	/** The backend regenerates node types on every write; pull them so the panel updates. */
	async function refreshNodeTypes() {
		await nodeTypesStore.getNodeTypes();
	}

	async function createOperation(payload: CreateCustomOperationDto) {
		const result = await createCustomOperation(rootStore.restApiContext, payload);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function updateOperation(id: string, payload: UpdateCustomOperationDto) {
		const result = await updateCustomOperation(rootStore.restApiContext, id, payload);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function setActiveVersion(id: string, version: number) {
		const result = await setCustomOperationActiveVersion(rootStore.restApiContext, id, version);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function createNode(payload: CreateCustomNodeDto) {
		const result = await createCustomNode(rootStore.restApiContext, payload);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function updateNode(id: string, payload: UpdateCustomNodeDto) {
		const result = await updateCustomNode(rootStore.restApiContext, id, payload);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function uploadIcon(id: string, iconDataUri: string) {
		const result = await uploadCustomNodeIcon(rootStore.restApiContext, id, iconDataUri);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
		return result;
	}

	async function reseed() {
		items.value = await reseedCustomNodes(rootStore.restApiContext);
		await refreshNodeTypes();
	}

	async function remove(id: string) {
		await deleteCustomNodeDefinition(rootStore.restApiContext, id);
		await Promise.all([fetchAll(), refreshNodeTypes()]);
	}

	return {
		items,
		loading,
		operations,
		nodes,
		fetchAll,
		createOperation,
		updateOperation,
		setActiveVersion,
		createNode,
		updateNode,
		uploadIcon,
		reseed,
		remove,
	};
});
