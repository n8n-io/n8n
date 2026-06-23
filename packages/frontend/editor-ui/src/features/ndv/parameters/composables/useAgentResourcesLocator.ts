import { ref, computed, type Ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { listAgentsPage, type ListAgentsOptions } from '@/features/agents/composables/useAgentApi';
import type { AgentResource } from '@/features/agents/types';

const PAGE_SIZE = 40;

/**
 * Paged, searchable agent catalog for the NDV agent picker. Scoped to the
 * workflow's project via `listAgentsPage` so the picker only lists agents that
 * execution can resolve. Caches display names so a selected agent that isn't on
 * the current page still renders by name.
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
	// Bumped on every reset (mount/search) so an older in-flight request that
	// resolves late can't clobber a newer query's results.
	let loadGeneration = 0;

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

		return await listAgentsPage(rootStore.restApiContext, projectId.value, options);
	}

	async function populateNextAgentsPage(reset = false) {
		if (reset) {
			currentPage.value = 0;
			loadGeneration++;
		}

		// No resolvable project scope: surface an empty catalog rather than fall
		// back to a cross-project list the workflow owner can't execute against.
		if (!projectId.value) {
			if (reset) {
				agentsResources.value = [];
				totalCount.value = 0;
			}
			return;
		}

		// Claim the page number synchronously so two concurrent load-more calls
		// can't read the same page and append a duplicate.
		const skip = currentPage.value * PAGE_SIZE;
		currentPage.value++;
		const generation = loadGeneration;

		const { count, data } = await fetchPage(skip);

		// A newer reset (e.g. a fresh search) superseded this request.
		if (generation !== loadGeneration) {
			return;
		}

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

	// Appends the next page on scroll. Guarded so a failed page surfaces the
	// error view (recoverable via retry) instead of an unhandled rejection.
	async function loadMore() {
		try {
			await populateNextAgentsPage();
		} catch (error) {
			loadError.value = error;
		}
	}

	return {
		agentsResources,
		isLoadingResources,
		loadError,
		hasMoreAgentsToLoad,
		searchFilter,
		onSearchFilter,
		getAgentName,
		loadMore,
		setAgentsResources,
	};
}
