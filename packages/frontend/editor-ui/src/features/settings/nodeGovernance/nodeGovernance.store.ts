import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as nodeGovernanceApi from './nodeGovernance.api';
import type {
	NodeGovernancePolicy,
	NodeCategory,
	NodeAccessRequest,
	GovernanceStatus,
} from './nodeGovernance.api';

export const useNodeGovernanceStore = defineStore('nodeGovernance', () => {
	const rootStore = useRootStore();

	// State
	const policies = ref<NodeGovernancePolicy[]>([]);
	const categories = ref<NodeCategory[]>([]);
	const pendingRequests = ref<NodeAccessRequest[]>([]);
	const myRequests = ref<NodeAccessRequest[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);
	// Per-node governance status cache (keyed by nodeType)
	const nodeGovernanceStatus = ref<Record<string, GovernanceStatus>>({});
	const governanceStatusLoaded = ref(false);

	// Getters
	const globalPolicies = computed(() =>
		policies.value.filter((p) => p.scope === 'global'),
	);

	const projectPolicies = computed(() =>
		policies.value.filter((p) => p.scope === 'projects'),
	);

	const blockPolicies = computed(() =>
		policies.value.filter((p) => p.policyType === 'block'),
	);

	const allowPolicies = computed(() =>
		policies.value.filter((p) => p.policyType === 'allow'),
	);

	const pendingRequestCount = computed(() => pendingRequests.value.length);

	// Actions
	async function fetchPolicies() {
		loading.value = true;
		error.value = null;
		try {
			const response = await nodeGovernanceApi.getPolicies(rootStore.restApiContext);
			policies.value = response.policies;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch policies';
			throw e;
		} finally {
			loading.value = false;
		}
	}

	async function createPolicy(data: Parameters<typeof nodeGovernanceApi.createPolicy>[1]) {
		const response = await nodeGovernanceApi.createPolicy(rootStore.restApiContext, data);
		policies.value.unshift(response.policy);
		return response.policy;
	}

	async function updatePolicy(
		id: string,
		data: Parameters<typeof nodeGovernanceApi.updatePolicy>[2],
	) {
		const response = await nodeGovernanceApi.updatePolicy(rootStore.restApiContext, id, data);
		const index = policies.value.findIndex((p) => p.id === id);
		if (index !== -1) {
			policies.value[index] = response.policy;
		}
		return response.policy;
	}

	async function deletePolicy(id: string) {
		await nodeGovernanceApi.deletePolicy(rootStore.restApiContext, id);
		policies.value = policies.value.filter((p) => p.id !== id);
	}

	async function fetchCategories() {
		loading.value = true;
		error.value = null;
		try {
			const response = await nodeGovernanceApi.getCategories(rootStore.restApiContext);
			categories.value = response.categories;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch categories';
			throw e;
		} finally {
			loading.value = false;
		}
	}

	async function createCategory(data: Parameters<typeof nodeGovernanceApi.createCategory>[1]) {
		const response = await nodeGovernanceApi.createCategory(rootStore.restApiContext, data);
		categories.value.push(response.category);
		return response.category;
	}

	async function updateCategory(
		id: string,
		data: Parameters<typeof nodeGovernanceApi.updateCategory>[2],
	) {
		const response = await nodeGovernanceApi.updateCategory(rootStore.restApiContext, id, data);
		const index = categories.value.findIndex((c) => c.id === id);
		if (index !== -1) {
			categories.value[index] = response.category;
		}
		return response.category;
	}

	async function deleteCategory(id: string) {
		await nodeGovernanceApi.deleteCategory(rootStore.restApiContext, id);
		categories.value = categories.value.filter((c) => c.id !== id);
	}

	async function assignNodeToCategory(categoryId: string, nodeType: string) {
		return await nodeGovernanceApi.assignNodeToCategory(
			rootStore.restApiContext,
			categoryId,
			nodeType,
		);
	}

	async function removeNodeFromCategory(categoryId: string, nodeType: string) {
		return await nodeGovernanceApi.removeNodeFromCategory(
			rootStore.restApiContext,
			categoryId,
			nodeType,
		);
	}

	async function fetchPendingRequests() {
		loading.value = true;
		error.value = null;
		try {
			const response = await nodeGovernanceApi.getPendingRequests(rootStore.restApiContext);
			pendingRequests.value = response.requests;
		} catch (e) {
			error.value = e instanceof Error ? e.message : 'Failed to fetch pending requests';
			throw e;
		} finally {
			loading.value = false;
		}
	}

	async function fetchMyRequests() {
		const response = await nodeGovernanceApi.getMyRequests(rootStore.restApiContext);
		myRequests.value = response.requests;
	}

	async function createAccessRequest(
		data: Parameters<typeof nodeGovernanceApi.createAccessRequest>[1],
	) {
		const response = await nodeGovernanceApi.createAccessRequest(rootStore.restApiContext, data);
		if (!response.alreadyExists) {
			myRequests.value.unshift(response.request);
		}
		return response;
	}

	async function reviewRequest(
		id: string,
		data: Parameters<typeof nodeGovernanceApi.reviewAccessRequest>[2],
	) {
		const response = await nodeGovernanceApi.reviewAccessRequest(
			rootStore.restApiContext,
			id,
			data,
		);
		// Remove from pending requests
		pendingRequests.value = pendingRequests.value.filter((r) => r.id !== id);
		return response.request;
	}

	async function fetchNodeGovernanceStatus(projectId: string, nodeTypes: string[]) {
		if (nodeTypes.length === 0) {
			return;
		}

		try {
			const response = await nodeGovernanceApi.getNodeGovernanceStatus(
				rootStore.restApiContext,
				projectId,
				nodeTypes,
			);
			nodeGovernanceStatus.value = {
				...nodeGovernanceStatus.value,
				...response.governance,
			};
			governanceStatusLoaded.value = true;
		} catch (e) {
			// Silently fail - governance is optional
			console.warn('Failed to fetch node governance status:', e);
		}
	}

	function getGovernanceForNode(nodeType: string): GovernanceStatus | undefined {
		return nodeGovernanceStatus.value[nodeType];
	}

	function clearGovernanceStatus() {
		nodeGovernanceStatus.value = {};
		governanceStatusLoaded.value = false;
	}

	return {
		// State
		policies,
		categories,
		pendingRequests,
		myRequests,
		loading,
		error,
		nodeGovernanceStatus,
		governanceStatusLoaded,
		// Getters
		globalPolicies,
		projectPolicies,
		blockPolicies,
		allowPolicies,
		pendingRequestCount,
		// Actions
		fetchPolicies,
		createPolicy,
		updatePolicy,
		deletePolicy,
		fetchCategories,
		createCategory,
		updateCategory,
		deleteCategory,
		assignNodeToCategory,
		removeNodeFromCategory,
		fetchPendingRequests,
		fetchMyRequests,
		createAccessRequest,
		reviewRequest,
		fetchNodeGovernanceStatus,
		getGovernanceForNode,
		clearGovernanceStatus,
	};
});
