import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as dependencyGraphApi from './dependencyGraph.api';
import type {
	DependencyGraph,
	WorkflowDependencyInfo,
	CredentialUsageInfo,
	ImpactAnalysis,
	DependencyGraphNode,
} from './dependencyGraph.types';

export const useDependencyGraphStore = defineStore('dependencyGraph', () => {
	const rootStore = useRootStore();

	// State
	const graph = ref<DependencyGraph | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);
	const detailsLoading = ref(false);
	const selectedNode = ref<DependencyGraphNode | null>(null);
	const workflowDependencies = ref<WorkflowDependencyInfo | null>(null);
	const credentialUsage = ref<CredentialUsageInfo | null>(null);
	const impactAnalysis = ref<ImpactAnalysis | null>(null);

	// Filter state
	const showWorkflows = ref(true);
	const showCredentials = ref(true);
	const showActiveOnly = ref(false);
	const searchQuery = ref('');

	// Computed
	const filteredNodes = computed(() => {
		if (!graph.value) return [];

		return graph.value.nodes.filter((node) => {
			// Type filter
			if (node.type === 'workflow' && !showWorkflows.value) return false;
			if (node.type === 'credential' && !showCredentials.value) return false;

			// Active filter (only for workflows)
			if (showActiveOnly.value && node.type === 'workflow' && !node.active) return false;

			// Search filter
			if (searchQuery.value) {
				const query = searchQuery.value.toLowerCase();
				return node.name.toLowerCase().includes(query);
			}

			return true;
		});
	});

	const filteredEdges = computed(() => {
		if (!graph.value) return [];

		const nodeIds = new Set(filteredNodes.value.map((n) => n.id));
		return graph.value.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));
	});

	const nodeStats = computed(() => {
		if (!graph.value) {
			return {
				totalWorkflows: 0,
				activeWorkflows: 0,
				totalCredentials: 0,
				totalEdges: 0,
			};
		}

		const workflows = graph.value.nodes.filter((n) => n.type === 'workflow');
		const credentials = graph.value.nodes.filter((n) => n.type === 'credential');

		return {
			totalWorkflows: workflows.length,
			activeWorkflows: workflows.filter((w) => w.active).length,
			totalCredentials: credentials.length,
			totalEdges: graph.value.edges.length,
		};
	});

	// Actions
	async function fetchGraph() {
		isLoading.value = true;
		error.value = null;

		try {
			graph.value = await dependencyGraphApi.fetchDependencyGraph(rootStore.restApiContext);
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch dependency graph';
			console.error('Failed to fetch dependency graph:', err);
		} finally {
			isLoading.value = false;
		}
	}

	async function fetchWorkflowDeps(workflowId: string) {
		detailsLoading.value = true;

		try {
			workflowDependencies.value = await dependencyGraphApi.fetchWorkflowDependencies(
				rootStore.restApiContext,
				workflowId,
			);
		} catch (err) {
			workflowDependencies.value = null;
			console.error('Failed to fetch workflow dependencies:', err);
		} finally {
			detailsLoading.value = false;
		}
	}

	async function fetchCredentialUsageInfo(credentialId: string) {
		detailsLoading.value = true;

		try {
			credentialUsage.value = await dependencyGraphApi.fetchCredentialUsage(
				rootStore.restApiContext,
				credentialId,
			);
		} catch (err) {
			credentialUsage.value = null;
			console.error('Failed to fetch credential usage:', err);
		} finally {
			detailsLoading.value = false;
		}
	}

	async function fetchImpact(resourceType: 'credential' | 'workflow', resourceId: string) {
		try {
			impactAnalysis.value = await dependencyGraphApi.fetchImpactAnalysis(
				rootStore.restApiContext,
				resourceType,
				resourceId,
			);
		} catch (err) {
			console.error('Failed to analyze impact:', err);
			impactAnalysis.value = null;
		}
	}

	function selectNode(node: DependencyGraphNode | null) {
		selectedNode.value = node;

		if (node) {
			if (node.type === 'workflow') {
				const workflowId = node.id.replace('workflow:', '');
				void fetchWorkflowDeps(workflowId);
				void fetchImpact('workflow', workflowId);
			} else if (node.type === 'credential') {
				const credentialId = node.id.replace('credential:', '');
				void fetchCredentialUsageInfo(credentialId);
				void fetchImpact('credential', credentialId);
			}
		} else {
			workflowDependencies.value = null;
			credentialUsage.value = null;
			impactAnalysis.value = null;
		}
	}

	function setSearchQuery(query: string) {
		searchQuery.value = query;
	}

	function toggleWorkflows() {
		showWorkflows.value = !showWorkflows.value;
	}

	function toggleCredentials() {
		showCredentials.value = !showCredentials.value;
	}

	function toggleActiveOnly() {
		showActiveOnly.value = !showActiveOnly.value;
	}

	function reset() {
		graph.value = null;
		selectedNode.value = null;
		workflowDependencies.value = null;
		credentialUsage.value = null;
		impactAnalysis.value = null;
		error.value = null;
		searchQuery.value = '';
	}

	return {
		// State
		graph,
		isLoading,
		error,
		detailsLoading,
		selectedNode,
		workflowDependencies,
		credentialUsage,
		impactAnalysis,
		showWorkflows,
		showCredentials,
		showActiveOnly,
		searchQuery,

		// Computed
		filteredNodes,
		filteredEdges,
		nodeStats,

		// Actions
		fetchGraph,
		fetchWorkflowDeps,
		fetchCredentialUsageInfo,
		fetchImpact,
		selectNode,
		setSearchQuery,
		toggleWorkflows,
		toggleCredentials,
		toggleActiveOnly,
		reset,
	};
});
