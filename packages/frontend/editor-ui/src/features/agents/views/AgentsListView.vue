<script setup lang="ts">
import debounce from 'lodash/debounce';
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE, getDebounceTime } from '@/app/constants';
import { useDebounce } from '@/app/composables/useDebounce';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import InsightsSummary from '@/features/execution/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import {
	listAgentsPage,
	listAgentsPageGlobal,
	type ListAgentsSortBy,
} from '../composables/useAgentApi';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import type { AgentResource } from '../types';
import { AGENT_BUILDER_VIEW, NEW_AGENT_VIEW } from '../constants';
import AgentCard from '../components/AgentCard.vue';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';

function isAgentResource(value: unknown): value is AgentResource {
	return typeof value === 'object' && value !== null && 'id' in value;
}

const AGENTS_SORT_MAP = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
} as const;

const locale = useI18n();
const documentTitle = useDocumentTitle();

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const projectsStore = useProjectsStore();
const insightsStore = useInsightsStore();
const projectPages = useProjectPages();
const agentTelemetry = useAgentTelemetry();
const { callDebounced } = useDebounce();

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const { canCreate: canCreateAgent } = useAgentPermissions(
	() => projectId.value ?? homeProject.value?.id,
);

const allAgents = ref<AgentResource[]>([]);
const filters = ref<BaseFilters>({ search: '', homeProject: '' });
const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref<ListAgentsSortBy>('updatedAt:desc');
const totalAgents = ref(0);
const loading = ref(true);

const projectId = computed(() => route.params.projectId as string | undefined);

const sortFns = {
	lastUpdated: (a: AgentResource, b: AgentResource) =>
		new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	lastCreated: (a: AgentResource, b: AgentResource) =>
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	nameAsc: (a: AgentResource, b: AgentResource) => a.name.localeCompare(b.name),
	nameDesc: (a: AgentResource, b: AgentResource) => b.name.localeCompare(a.name),
};

async function fetchAgents() {
	const shouldDelayLoading = allAgents.value.length > 0;
	const delayedLoading = debounce(() => {
		loading.value = true;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	if (shouldDelayLoading) {
		delayedLoading();
	} else {
		loading.value = true;
	}

	try {
		const fetchOptions = {
			skip: (currentPage.value - 1) * pageSize.value,
			take: pageSize.value,
			sortBy: currentSort.value,
			filter: filters.value.search ? { query: filters.value.search } : undefined,
		};
		const { count, data } = projectId.value
			? await listAgentsPage(rootStore.restApiContext, projectId.value, fetchOptions)
			: await listAgentsPageGlobal(rootStore.restApiContext, fetchOptions);
		allAgents.value = data;
		totalAgents.value = count;
	} finally {
		delayedLoading.cancel();
		loading.value = false;
	}
}

function onSelectAgent(agentId: string, agentProjectId: string) {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: agentProjectId, agentId },
	});
}

function onAgentPublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
	void fetchAgents();
}

function onAgentUnpublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
	void fetchAgents();
}

function onAgentDeleted(agentId: string) {
	allAgents.value = allAgents.value.filter((a) => a.id !== agentId);
	totalAgents.value = Math.max(0, totalAgents.value - 1);
	if (allAgents.value.length === 0 && currentPage.value > 1) {
		currentPage.value -= 1;
	}
	void fetchAgents();
}

async function onSearchUpdated(search: string) {
	filters.value = { ...filters.value, search };
	currentPage.value = 1;
	if (search) {
		await callDebounced(fetchAgents, {
			debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
			trailing: true,
		});
	} else {
		await fetchAgents();
	}
}

async function setPaginationAndSort(payload: SortingAndPaginationUpdates) {
	if (payload.page) {
		currentPage.value = payload.page;
	}
	if (payload.pageSize) {
		pageSize.value = payload.pageSize;
	}
	if (payload.sort) {
		currentSort.value =
			AGENTS_SORT_MAP[payload.sort as keyof typeof AGENTS_SORT_MAP] ?? 'updatedAt:desc';
	}
	if (!loading.value) {
		await callDebounced(fetchAgents, {
			debounceTime: DEBOUNCE_TIME.API.RESOURCE_SEARCH,
			trailing: true,
		});
	}
}

function onCreateAgentClick() {
	agentTelemetry.trackClickedNewAgent('button');
	const targetProjectId = projectId.value ?? projectsStore.personalProject?.id;
	void router.push({ name: NEW_AGENT_VIEW, query: { projectId: targetProjectId } });
}

onMounted(async () => {
	documentTitle.set(locale.baseText('agents.heading'));
});
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="agents"
		type="list-paginated"
		:resources="allAgents"
		:initialize="fetchAgents"
		:loading="false"
		:resources-refreshing="loading"
		:disabled="false"
		:sort-fns="sortFns"
		:sort-options="['lastUpdated', 'lastCreated', 'nameAsc', 'nameDesc']"
		:type-props="{ itemSize: 80 }"
		:custom-page-size="DEFAULT_WORKFLOW_PAGE_SIZE"
		:total-items="totalAgents"
		:dont-perform-sorting-and-filtering="true"
		:shareable="false"
		:ui-config="{ searchEnabled: true, showFiltersDropdown: false, sortEnabled: true }"
		:display-name="(agent: AgentResource) => agent.name"
		tab-key="agents"
		@update:search="onSearchUpdated"
		@update:pagination-and-sort="setPaginationAndSort"
	>
		<template #header>
			<ProjectHeader main-button="agent">
				<InsightsSummary
					v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>

		<template #empty>
			<ResourcesListEmptyState
				resource-key="agents"
				:button-disabled="!canCreateAgent"
				@click:button="onCreateAgentClick"
			/>
		</template>

		<template #item="{ item: data }">
			<AgentCard
				v-if="isAgentResource(data)"
				class="mb-2xs"
				:agent="data"
				:project-id="data.projectId"
				@select="onSelectAgent(data.id, data.projectId)"
				@published="onAgentPublished"
				@unpublished="onAgentUnpublished"
				@deleted="onAgentDeleted"
			/>
		</template>
	</ResourcesListLayout>
</template>
