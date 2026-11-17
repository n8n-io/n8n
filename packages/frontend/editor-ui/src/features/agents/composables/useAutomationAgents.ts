import { computed, ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentListItem } from '../agent.types';
import type { AgentListRowResource } from '../types';
import {
	listAgentsPage,
	listAgentsPageGlobal,
	type ListAgentsOptions,
	type ListAgentsSortBy,
} from './useAgentApi';

export interface AutomationAgentsRequest {
	/** Leave it out to list the agents of every project */
	projectId?: string;
	/** The open folder, or `null` for the project root */
	folderId: string | null;
	/** The project shows folders, so the list shows one folder level at a time */
	useFolders: boolean;
	search: string;
	includeArchived: boolean;
	sortBy: ListAgentsSortBy;
}

type AgentPage = { count: number; data: AgentListItem[] };

const AGENT_SORTS = new Set<string>([
	'name:asc',
	'name:desc',
	'createdAt:asc',
	'createdAt:desc',
	'updatedAt:asc',
	'updatedAt:desc',
]);

export function isAgentSortBy(value: string): value is ListAgentsSortBy {
	return AGENT_SORTS.has(value);
}

function folderFilter(request: AutomationAgentsRequest): ListAgentsOptions['filter'] {
	if (!request.useFolders) return {};
	// Like workflows, a search looks through the open folder and its subfolders.
	if (request.search) {
		return request.folderId ? { parentFolderId: request.folderId, includeDescendants: true } : {};
	}
	return { parentFolderId: request.folderId };
}

/**
 * The agents of the automations list. They load in batches, next to the workflows, and the
 * list merges both by the sort order.
 */
export function useAutomationAgents(getRequest: () => AutomationAgentsRequest | null) {
	const rootStore = useRootStore();
	const agents = ref<AgentListItem[]>([]);
	const count = ref(0);

	async function fetchRange(skip: number, take: number): Promise<AgentPage> {
		const request = getRequest();
		if (!request) return { count: 0, data: [] };

		const filter = {
			...folderFilter(request),
			...(request.search ? { query: request.search } : {}),
			...(request.includeArchived ? { includeArchived: true } : {}),
		};
		const options: ListAgentsOptions = {
			offset: skip,
			limit: take,
			sortBy: request.sortBy,
			filter: Object.keys(filter).length > 0 ? filter : undefined,
		};
		return request.projectId
			? await listAgentsPage(rootStore.restApiContext, request.projectId, options)
			: await listAgentsPageGlobal(rootStore.restApiContext, options);
	}

	function replace(page: AgentPage) {
		agents.value = page.data;
		count.value = page.count;
	}

	function append(page: AgentPage) {
		count.value = page.count;
		// An agent can move between batches if it changed since the last request.
		const loadedIds = new Set(agents.value.map(({ id }) => id));
		const newAgents = page.data.filter(({ id }) => !loadedIds.has(id));
		if (newAgents.length > 0) agents.value = [...agents.value, ...newAgents];
	}

	function clear() {
		replace({ count: 0, data: [] });
	}

	const done = computed(() => agents.value.length >= count.value);

	const rows = computed<AgentListRowResource[]>(() =>
		agents.value.map((agent) => ({ ...agent, resourceType: 'agent' })),
	);

	return { agents, count, done, rows, fetchRange, replace, append, clear };
}
