import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as nodeGovernanceApi from './nodeGovernance.api';
import type {
	NodeGovernancePolicy,
	NodeCategory,
	NodeAccessRequest,
	GovernanceStatus,
	NodeGovernanceExport,
	NodeGovernanceImportResult,
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

	// State for local governance resolution
	const currentProjectId = ref<string | null>(null);
	const cachedGlobalPolicies = ref<NodeGovernancePolicy[]>([]);
	const cachedProjectPolicies = ref<NodeGovernancePolicy[]>([]);
	const governanceDataLoaded = ref(false);

	// Getters
	const globalPolicies = computed(() => policies.value.filter((p) => p.scope === 'global'));

	const projectPolicies = computed(() => policies.value.filter((p) => p.scope === 'projects'));

	const blockPolicies = computed(() => policies.value.filter((p) => p.policyType === 'block'));

	const allowPolicies = computed(() => policies.value.filter((p) => p.policyType === 'allow'));

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

	async function exportCategories(): Promise<NodeGovernanceExport> {
		return await nodeGovernanceApi.exportCategories(rootStore.restApiContext);
	}

	async function importCategories(data: NodeGovernanceExport): Promise<NodeGovernanceImportResult> {
		const result = await nodeGovernanceApi.importCategories(rootStore.restApiContext, data);
		// Refresh categories after import
		await fetchCategories();
		return result;
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

	/**
	 * Fetch all governance data needed for local resolution.
	 * This fetches global policies, project policies, categories, and user's pending requests.
	 */
	async function fetchGovernanceData(projectId: string) {
		if (!projectId) {
			return;
		}

		try {
			// Fetch all data in parallel
			const [
				globalPoliciesResponse,
				projectPoliciesResponse,
				categoriesResponse,
				myRequestsResponse,
			] = await Promise.all([
				nodeGovernanceApi.getGlobalPolicies(rootStore.restApiContext),
				nodeGovernanceApi.getProjectPolicies(rootStore.restApiContext, projectId),
				nodeGovernanceApi.getCategories(rootStore.restApiContext),
				nodeGovernanceApi.getMyRequests(rootStore.restApiContext),
			]);

			cachedGlobalPolicies.value = globalPoliciesResponse.policies;
			cachedProjectPolicies.value = projectPoliciesResponse.policies;
			categories.value = categoriesResponse.categories;
			myRequests.value = myRequestsResponse.requests;
			currentProjectId.value = projectId;
			governanceDataLoaded.value = true;

			// Clear the old status cache and rebuild it using local resolution
			nodeGovernanceStatus.value = {};
			governanceStatusLoaded.value = true;
		} catch (e) {
			// Silently fail - governance is optional
			console.warn('Failed to fetch governance data:', e);
		}
	}

	/**
	 * Get categories (slugs) for a node type from the cached categories.
	 */
	function getCategoriesForNode(nodeType: string): string[] {
		const result: string[] = [];
		for (const category of categories.value) {
			if (category.nodeAssignments?.some((a) => a.nodeType === nodeType)) {
				result.push(category.slug);
			}
		}
		return result;
	}

	/**
	 * Check if a policy matches a node type (by node type directly or by category).
	 */
	function policyMatchesNode(
		policy: NodeGovernancePolicy,
		nodeType: string,
		nodeCategories: string[],
	): boolean {
		if (policy.targetType === 'node') {
			return policy.targetValue === nodeType;
		}
		if (policy.targetType === 'category') {
			return nodeCategories.includes(policy.targetValue);
		}
		return false;
	}

	/**
	 * Resolve governance status for a single node type locally.
	 * Uses the same priority logic as the backend:
	 * Priority: Project ALLOW (1) > Global BLOCK (2) > Global ALLOW (3) > Project BLOCK (4) > Default (allowed)
	 */
	function resolveGovernanceForNode(nodeType: string, projectId?: string): GovernanceStatus {
		// Check cache first
		const cached = nodeGovernanceStatus.value[nodeType];
		if (cached !== undefined) {
			return cached;
		}

		// If governance data not loaded, return allowed (fail open)
		if (!governanceDataLoaded.value) {
			return { status: 'allowed' };
		}

		const effectiveProjectId = projectId ?? currentProjectId.value;
		const nodeCategories = getCategoriesForNode(nodeType);

		interface PolicyMatch {
			policy: NodeGovernancePolicy;
			priority: number;
		}

		const matchingPolicies: PolicyMatch[] = [];

		// Check global policies
		for (const policy of cachedGlobalPolicies.value) {
			if (policyMatchesNode(policy, nodeType, nodeCategories)) {
				matchingPolicies.push({
					policy,
					priority: policy.policyType === 'block' ? 2 : 3,
				});
			}
		}

		// Check project policies
		for (const policy of cachedProjectPolicies.value) {
			// Check if this policy is assigned to the current project
			const isForThisProject =
				effectiveProjectId &&
				policy.projectAssignments?.some((a) => a.projectId === effectiveProjectId);
			if (isForThisProject && policyMatchesNode(policy, nodeType, nodeCategories)) {
				matchingPolicies.push({
					policy,
					priority: policy.policyType === 'block' ? 4 : 1,
				});
			}
		}

		// Sort by priority (lowest = highest priority)
		matchingPolicies.sort((a, b) => a.priority - b.priority);

		let governanceStatus: GovernanceStatus;

		// Apply highest priority policy
		if (matchingPolicies.length > 0) {
			const highestPriorityPolicy = matchingPolicies[0].policy;
			governanceStatus = {
				status: highestPriorityPolicy.policyType === 'block' ? 'blocked' : 'allowed',
				category: nodeCategories[0],
			};
		} else {
			// Default: allowed
			governanceStatus = { status: 'allowed', category: nodeCategories[0] };
		}

		// Check for pending request if blocked
		if (governanceStatus.status === 'blocked' && effectiveProjectId) {
			const pendingRequest = myRequests.value.find(
				(r) =>
					r.nodeType === nodeType && r.projectId === effectiveProjectId && r.status === 'pending',
			);
			if (pendingRequest) {
				governanceStatus = {
					status: 'pending_request',
					category: nodeCategories[0],
					requestId: pendingRequest.id,
				};
			}
		}

		// Cache the result
		nodeGovernanceStatus.value[nodeType] = governanceStatus;

		return governanceStatus;
	}

	/**
	 * Clear all governance data and reset state.
	 */
	function clearGovernanceData() {
		cachedGlobalPolicies.value = [];
		cachedProjectPolicies.value = [];
		currentProjectId.value = null;
		governanceDataLoaded.value = false;
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
		governanceDataLoaded,
		currentProjectId,
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
		exportCategories,
		importCategories,
		fetchPendingRequests,
		fetchMyRequests,
		createAccessRequest,
		reviewRequest,
		fetchNodeGovernanceStatus,
		getGovernanceForNode,
		clearGovernanceStatus,
		// New local resolution methods
		fetchGovernanceData,
		resolveGovernanceForNode,
		clearGovernanceData,
	};
});
