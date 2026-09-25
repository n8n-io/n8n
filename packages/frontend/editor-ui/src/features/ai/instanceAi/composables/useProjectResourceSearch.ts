import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, shallowRef } from 'vue';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { listAgentsPage } from '@/features/agents/composables/useAgentApi';
import { fetchDataTablesApi } from '@/features/core/dataTable/dataTable.api';
import type { ArtifactTab } from '../useCanvasPreview';
import { ARTIFACT_TAB_ICONS } from './useOpenArtifactTabs';

type ProjectResource = ArtifactTab & { updatedAt: string };

// Search narrows the list, so a short list for each type is enough.
const RESULTS_PER_TYPE = 10;

function resourceKey(resource: Pick<ArtifactTab, 'type' | 'id'>) {
	return `${resource.type}:${resource.id}`;
}

/**
 * Searches the workflows, data tables and agents of one project, newest edit
 * first. Each type is a separate request, so a type the user cannot list
 * comes back empty without hiding the others.
 */
export function useProjectResourceSearch({
	projectId,
	excludedTabs,
}: {
	projectId: () => string | undefined;
	/** Resources that are open as tabs already. They do not show in the results. */
	excludedTabs: () => Array<Pick<ArtifactTab, 'type' | 'id'>>;
}) {
	const rootStore = useRootStore();
	const workflowsListStore = useWorkflowsListStore();

	const resources = shallowRef<ProjectResource[]>([]);
	const isLoading = ref(false);
	let generation = 0;

	const results = computed((): ArtifactTab[] => {
		const excludedKeys = new Set(excludedTabs().map(resourceKey));
		const visible = resources.value.filter((resource) => !excludedKeys.has(resourceKey(resource)));
		const counts: Record<ArtifactTab['type'], number> = { workflow: 0, 'data-table': 0, agent: 0 };
		return visible
			.filter((resource) => ++counts[resource.type] <= RESULTS_PER_TYPE)
			.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
			.map(({ updatedAt: _updatedAt, ...tab }) => tab);
	});

	function takeFor(type: ArtifactTab['type']) {
		// Ask for extra rows, so hiding the open tabs does not shorten the list.
		const openOfType = excludedTabs().filter((tab) => tab.type === type).length;
		return RESULTS_PER_TYPE + openOfType;
	}

	async function searchWorkflows(project: string, query: string): Promise<ProjectResource[]> {
		const workflows = await workflowsListStore.searchWorkflows({
			projectId: project,
			query: query || undefined,
			isArchived: false,
			select: ['id', 'name', 'updatedAt'],
			options: { take: takeFor('workflow'), sortBy: 'updatedAt:desc', includeScopes: false },
		});
		return workflows.map((workflow) => ({
			type: 'workflow',
			id: workflow.id,
			name: workflow.name,
			icon: ARTIFACT_TAB_ICONS.workflow,
			projectId: project,
			updatedAt: String(workflow.updatedAt),
		}));
	}

	async function searchDataTables(project: string, query: string): Promise<ProjectResource[]> {
		const { data } = await fetchDataTablesApi(
			rootStore.restApiContext,
			project,
			{ skip: 0, take: takeFor('data-table') },
			query ? { name: query } : undefined,
			'updatedAt:desc',
		);
		return data.map((dataTable) => ({
			type: 'data-table',
			id: dataTable.id,
			name: dataTable.name,
			icon: ARTIFACT_TAB_ICONS['data-table'],
			projectId: project,
			updatedAt: dataTable.updatedAt,
		}));
	}

	async function searchAgents(project: string, query: string): Promise<ProjectResource[]> {
		const { data } = await listAgentsPage(rootStore.restApiContext, project, {
			take: takeFor('agent'),
			sortBy: 'updatedAt:desc',
			filter: query ? { query } : undefined,
		});
		return data.map((agent) => ({
			type: 'agent',
			id: agent.id,
			name: agent.name,
			icon: ARTIFACT_TAB_ICONS.agent,
			projectId: project,
			updatedAt: agent.updatedAt,
		}));
	}

	async function search(query = '') {
		const project = projectId();
		if (!project) {
			resources.value = [];
			return;
		}

		const current = ++generation;
		isLoading.value = true;
		const trimmed = query.trim();
		const settled = await Promise.allSettled([
			searchWorkflows(project, trimmed),
			searchDataTables(project, trimmed),
			searchAgents(project, trimmed),
		]);
		// A newer search started while this one ran, so its results are stale.
		if (current !== generation) return;

		resources.value = settled.flatMap((result) =>
			result.status === 'fulfilled' ? result.value : [],
		);
		isLoading.value = false;
	}

	return { results, isLoading, search };
}
