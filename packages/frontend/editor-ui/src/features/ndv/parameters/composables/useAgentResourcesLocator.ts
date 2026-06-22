import { ref, computed, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	listAgentsPage,
	listAgentsPageGlobal,
	type ListAgentsOptions,
} from '@/features/agents/composables/useAgentApi';
import type { AgentResource } from '@/features/agents/types';

const PAGE_SIZE = 40;

/**
 * Paged, searchable agent catalog for the NDV agent picker. Backed by the
 * project-scoped `listAgentsPage`, falling back to the cross-project
 * `listAgentsPageGlobal` when no project is resolved. Caches display names so
 * a selected agent that isn't on the current page still renders by name.
 */
export function useAgentResourcesLocator(
	projectId: Ref<string>,
	resolveProjectName: (projectId: string) => string | null,
) {
	const rootStore = useRootStore();

	const agentsResources = ref<Array<{ name: string; value: string }>>([]);
	const isLoadingResources = ref(true);
	const loadError = ref<unknown | null>(null);
	const searchFilter = ref('');
	const currentPage = ref(0);
	const totalCount = ref(0);
	const nameCache = new Map<string, string>();

	const hasMoreAgentsToLoad = computed(() => totalCount.value > agentsResources.value.length);

	function constructName(agent: AgentResource) {
		// Prefix the project name when the agent lives outside the personal project
		const projectName = resolveProjectName(agent.projectId);
		return projectName ? `${projectName} — ${agent.name}` : agent.name;
	}

	function agentToResourceMapper(agent: AgentResource) {
		const name = constructName(agent);
		nameCache.set(agent.id, name);
		return { name, value: agent.id };
	}

	function getAgentName(id: string): string {
		return nameCache.get(id) ?? id;
	}

	async function fetchPage(skip: number) {
		const options: ListAgentsOptions = {
			skip,
			take: PAGE_SIZE,
			sortBy: 'updatedAt:desc',
		};
		if (searchFilter.value) {
			options.filter = { query: searchFilter.value };
		}

		return projectId.value
			? await listAgentsPage(rootStore.restApiContext, projectId.value, options)
			: await listAgentsPageGlobal(rootStore.restApiContext, options);
	}

	async function populateNextAgentsPage(reset = false) {
		if (reset) {
			currentPage.value = 0;
		}

		const skip = currentPage.value * PAGE_SIZE;
		const { count, data } = await fetchPage(skip);
		currentPage.value++;
		totalCount.value = count;

		const mapped = data.map(agentToResourceMapper);
		if (reset) {
			agentsResources.value = mapped;
		} else {
			agentsResources.value.push(...mapped);
		}
	}

	async function loadResources(reset: boolean) {
		isLoadingResources.value = true;
		loadError.value = null;
		try {
			await populateNextAgentsPage(reset);
		} catch (error) {
			loadError.value = error;
		} finally {
			isLoadingResources.value = false;
		}
	}

	async function setAgentsResources() {
		await loadResources(true);
	}

	async function onSearchFilter(filter: string) {
		searchFilter.value = filter;
		await loadResources(true);
	}

	return {
		agentsResources,
		isLoadingResources,
		loadError,
		hasMoreAgentsToLoad,
		searchFilter,
		onSearchFilter,
		getAgentName,
		populateNextAgentsPage,
		setAgentsResources,
		agentToResourceMapper,
	};
}
