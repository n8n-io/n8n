import type { ProjectDependencyGraph } from '@n8n/api-types';
import { ref } from 'vue';

import * as projectDependencyGraphApi from '@/app/api/project-dependency-graph';
import { useRootStore } from '@n8n/stores/useRootStore';

const ROOT_FOLDER_ID = '0';

interface CacheEntry {
	graph: ProjectDependencyGraph;
	folderId: string;
}

const graphCache = ref<Record<string, CacheEntry>>({});
const expandedFolders = ref<Set<string>>(new Set());
const isLoading = ref(false);

export function useProjectDependencyGraph(projectId: string) {
	const rootStore = useRootStore();

	function cacheKey(folderId: string): string {
		return `${projectId}:${folderId}`;
	}

	async function fetchFolderGraph(folderId: string): Promise<ProjectDependencyGraph> {
		const cached = graphCache.value[cacheKey(folderId)];
		if (cached) return cached.graph;

		isLoading.value = folderId === ROOT_FOLDER_ID;
		try {
			const graph = await projectDependencyGraphApi.getProjectDependencyGraph(
				rootStore.restApiContext,
				projectId,
				{ folderId, explode: false },
			);
			graphCache.value[cacheKey(folderId)] = { graph, folderId };
			return graph;
		} finally {
			isLoading.value = false;
		}
	}

	async function fetchRootGraph(): Promise<ProjectDependencyGraph> {
		return await fetchFolderGraph(ROOT_FOLDER_ID);
	}

	function markFolderExpanded(folderId: string): void {
		if (expandedFolders.value.has(folderId)) return;
		expandedFolders.value = new Set([...expandedFolders.value, folderId]);
	}

	function markFolderCollapsed(folderId: string): void {
		if (!expandedFolders.value.has(folderId)) return;
		expandedFolders.value = new Set([...expandedFolders.value].filter((id) => id !== folderId));
	}

	function isFolderExpanded(folderId: string): boolean {
		return expandedFolders.value.has(folderId);
	}

	function getGraph(folderId: string): ProjectDependencyGraph | undefined {
		return graphCache.value[cacheKey(folderId)]?.graph;
	}

	function getAllGraphs(): ProjectDependencyGraph[] {
		return Object.entries(graphCache.value)
			.filter(([key]) => key.startsWith(`${projectId}:`))
			.map(([, entry]) => entry.graph);
	}

	function clearCache(): void {
		graphCache.value = {};
		expandedFolders.value = new Set();
	}

	/** Drop this project's cached graphs so the next fetch returns fresh data. */
	function clearProjectCache(): void {
		graphCache.value = Object.fromEntries(
			Object.entries(graphCache.value).filter(([key]) => !key.startsWith(`${projectId}:`)),
		);
	}

	/**
	 * Insert a freshly created folder into the cached graph of its scope (project root or
	 * parent folder), so model rebuilds keep showing it without a refetch.
	 */
	function appendFolderNode(folder: {
		id: string;
		name: string;
		parentFolderId: string | null;
	}): void {
		const scopeId = folder.parentFolderId ?? ROOT_FOLDER_ID;
		const entry = graphCache.value[cacheKey(scopeId)];
		if (!entry || entry.graph.nodes.some((node) => node.id === folder.id)) return;
		entry.graph.nodes.push({
			id: folder.id,
			type: 'folder',
			name: folder.name,
			expanded: true,
			metadata: { parentFolderId: folder.parentFolderId, workflowCount: 0 },
		});
	}

	/**
	 * Remove a node and every edge touching it from this project's cached graphs
	 * (e.g. after a workflow is archived).
	 */
	function removeNodeFromCache(nodeId: string): void {
		for (const [key, entry] of Object.entries(graphCache.value)) {
			if (!key.startsWith(`${projectId}:`)) continue;
			entry.graph.nodes = entry.graph.nodes.filter((node) => node.id !== nodeId);
			entry.graph.edges = entry.graph.edges.filter(
				(edge) => edge.sourceId !== nodeId && edge.targetId !== nodeId,
			);
		}
	}

	/**
	 * Rename a node (workflow or folder) in every cached graph that mentions it — the
	 * same entity can appear both in scope and as a referenced ghost.
	 */
	function renameNodeInCache(nodeId: string, name: string): void {
		for (const [key, entry] of Object.entries(graphCache.value)) {
			if (!key.startsWith(`${projectId}:`)) continue;
			for (const node of entry.graph.nodes) {
				if (node.id === nodeId) node.name = name;
			}
		}
	}

	return {
		isLoading,
		expandedFolders,
		fetchRootGraph,
		fetchFolderGraph,
		markFolderExpanded,
		markFolderCollapsed,
		isFolderExpanded,
		getGraph,
		getAllGraphs,
		clearCache,
		clearProjectCache,
		appendFolderNode,
		renameNodeInCache,
		removeNodeFromCache,
		ROOT_FOLDER_ID,
	};
}
