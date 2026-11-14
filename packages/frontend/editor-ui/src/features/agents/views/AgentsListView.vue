<script setup lang="ts">
import debounce from 'lodash/debounce';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nCheckbox } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import { InsightsSummary, useInsightsStore } from '@n8n/frontend-module-insights';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAgentsListEmptyStateTemplatesExperiment } from '@/experiments/agentsListEmptyStateTemplates/useAgentsListEmptyStateTemplatesExperiment';
import {
	duplicateAgent,
	listAgentsPage,
	listAgentsPageGlobal,
	type ListAgentsSortBy,
} from '../composables/useAgentApi';
import { upsertProjectAgentsListCache } from '../composables/useProjectAgentsList';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';
import { useCreateAgent } from '../composables/useCreateAgent';
import type { AgentTemplate } from '../agentTemplates';
import { toAgentListItem, type Agent, type AgentListItem } from '../agent.types';
import type { AgentListRowResource, AgentResource } from '../types';
import { AGENT_BUILDER_VIEW, AGENT_DUPLICATE_MODAL_KEY, NEW_SESSION_PARAM } from '../constants';
import AgentCard from '../components/AgentCard.vue';
import AgentsListIntro from '../components/AgentsListIntro.vue';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';

function isAgentListItem(value: unknown): value is AgentListItem {
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
const uiStore = useUIStore();
const toast = useToast();
const agentTelemetry = useAgentTelemetry();
const { createAgent } = useCreateAgent();
const { callDebounced } = useDebounce();
const {
	isFeatureEnabled: templatesExperimentEnabled,
	variant: templatesVariant,
	trackExposure: trackTemplatesExposure,
} = useAgentsListEmptyStateTemplatesExperiment();
const showTemplatesIntro = computed(() => templatesExperimentEnabled.value);

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const { canCreate: canCreateAgent } = useAgentPermissions(
	() => projectId.value ?? homeProject.value?.id,
);

const allAgents = ref<AgentListItem[]>([]);
/** The shared list layout only accepts resource-typed rows; the wrapper is added at render time. */
const agentRows = computed<AgentListRowResource[]>(() =>
	allAgents.value.map((agent) => ({ ...agent, resourceType: 'agent' })),
);
const filters = ref<BaseFilters>({
	search: '',
	homeProject: '',
	showArchived: route.query.showArchived === 'true',
});
const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref<ListAgentsSortBy>('updatedAt:desc');
const totalAgents = ref(0);
const loading = ref(true);

const projectId = computed(() => route.params.projectId as string | undefined);

// Exposure covers both arms: control users see the default empty state, test users
// the templates intro. The source mirrors the layout's empty-state condition, so a
// filtered list never counts, and includes the variant so a late flag or Instance AI
// readiness still fires while the surface is visible.
watch(
	() =>
		!loading.value &&
		allAgents.value.length === 0 &&
		!filters.value.search &&
		templatesVariant.value !== undefined,
	(surfaceVisible) => {
		if (surfaceVisible) trackTemplatesExposure();
	},
);

const sortFns = {
	lastUpdated: (a: AgentListItem, b: AgentListItem) =>
		new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	lastCreated: (a: AgentListItem, b: AgentListItem) =>
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	nameAsc: (a: AgentListItem, b: AgentListItem) => a.name.localeCompare(b.name),
	nameDesc: (a: AgentListItem, b: AgentListItem) => b.name.localeCompare(a.name),
};

function buildListFilter() {
	const filter = {
		...(filters.value.search ? { query: filters.value.search } : {}),
		...(filters.value.showArchived === true ? { includeArchived: true } : {}),
	};
	return Object.keys(filter).length > 0 ? filter : undefined;
}

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
			offset: (currentPage.value - 1) * pageSize.value,
			limit: pageSize.value,
			sortBy: currentSort.value,
			filter: buildListFilter(),
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

function onNewAgentChat(agentId: string, agentProjectId: string) {
	void router.push({
		name: AGENT_BUILDER_VIEW,
		params: { projectId: agentProjectId, agentId },
		query: { [NEW_SESSION_PARAM]: 'true' },
	});
}

function onAgentDuplicate(agentId: string) {
	const agent = allAgents.value.find((a) => a.id === agentId);
	if (!agent) return;
	// An unconfigured agent has no config to clone — duplicating it would only
	// yield an empty draft, so inform the user instead of opening the modal.
	if (!agent.hasConfig) {
		toast.showMessage({
			title: locale.baseText('agents.duplicate.modal.unconfigured'),
			type: 'info',
		});
		return;
	}
	uiStore.openModalWithData({
		name: AGENT_DUPLICATE_MODAL_KEY,
		data: {
			projectId: agent.projectId,
			agentId: agent.id,
			name: agent.name,
			existingNames: allAgents.value.map((a) => a.name),
			onConfirm: async (newName: string) => {
				try {
					const duplicated = await duplicateAgent(
						rootStore.restApiContext,
						agent.projectId,
						agent.id,
						newName,
					);
					// Keep the source Agent context alongside the backend creation event.
					// The safe wrapper prevents telemetry errors from failing duplication.
					agentTelemetry.trackDuplicatedAgent({
						sourceAgentId: agent.id,
						agentId: duplicated.id,
						projectId: agent.projectId,
					});
					upsertProjectAgentsListCache(agent.projectId, duplicated);
					toast.showMessage({
						title: locale.baseText('agents.duplicate.modal.success'),
						type: 'success',
					});
					onSelectAgent(duplicated.id, agent.projectId);
				} catch (error) {
					toast.showError(error, locale.baseText('agents.duplicate.modal.error'));
					throw error;
				}
			},
		},
	});
}

function onAgentPublished(updated: Agent) {
	const item = toAgentListItem(updated);
	allAgents.value = allAgents.value.map((a) => (a.id === item.id ? item : a));
	void fetchAgents();
}

function onAgentUnpublished(updated: Agent) {
	const item = toAgentListItem(updated);
	allAgents.value = allAgents.value.map((a) => (a.id === item.id ? item : a));
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

function onAgentArchived(updated: AgentResource) {
	if (filters.value.showArchived === true) {
		onAgentUnpublished(updated);
		return;
	}
	onAgentDeleted(updated.id);
}

watch(
	() => filters.value.showArchived === true,
	async (showArchived) => {
		const query = { ...route.query };
		if (showArchived) {
			query.showArchived = 'true';
		} else {
			delete query.showArchived;
		}
		await router.replace({ query });
		currentPage.value = 1;
		await fetchAgents();
	},
);

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

function targetProjectIdForCreate() {
	return projectId.value ?? projectsStore.personalProject?.id ?? '';
}

function onCreateAgentClick() {
	createAgent('button', targetProjectIdForCreate());
}

function onCreateBlank() {
	createAgent('empty_state_blank', targetProjectIdForCreate());
}

function onCreateFromPrompt(text: string) {
	createAgent('empty_state_prompt', targetProjectIdForCreate(), { kind: 'prompt', text });
}

function onCreateFromTemplate(template: AgentTemplate) {
	createAgent('empty_state_template', targetProjectIdForCreate(), {
		kind: 'template',
		templateId: template.id,
	});
}

onMounted(async () => {
	documentTitle.set(locale.baseText('agents.heading'));
	if (projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled) {
		void insightsStore.weeklySummary.execute();
	}
});
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="agents"
		type="list-paginated"
		:resources="agentRows"
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
		:ui-config="{ searchEnabled: true, showFiltersDropdown: true, sortEnabled: true }"
		:display-name="(agent: AgentListItem) => agent.name"
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
			<AgentsListIntro
				v-if="showTemplatesIntro"
				:disabled="!canCreateAgent"
				@create-blank="onCreateBlank"
				@submit="onCreateFromPrompt"
				@select="onCreateFromTemplate"
			/>
			<ResourcesListEmptyState
				v-else
				resource-key="agents"
				:button-disabled="!canCreateAgent"
				@click:button="onCreateAgentClick"
			/>
		</template>

		<template #filters="{ setKeyValue }">
			<N8nCheckbox
				:label="locale.baseText('agents.list.filters.showArchived')"
				:model-value="filters.showArchived === true"
				data-test-id="agents-show-archived-checkbox"
				@update:model-value="setKeyValue('showArchived', $event)"
			/>
		</template>

		<template #item="{ item: data }">
			<AgentCard
				v-if="isAgentListItem(data)"
				class="mb-2xs"
				:agent="data"
				:project-id="data.projectId"
				@select="onSelectAgent(data.id, data.projectId)"
				@new-chat="onNewAgentChat"
				@published="onAgentPublished"
				@unpublished="onAgentUnpublished"
				@deleted="onAgentDeleted"
				@archived="onAgentArchived"
				@unarchived="onAgentUnpublished"
				@duplicate="onAgentDuplicate"
			/>
		</template>
	</ResourcesListLayout>
</template>
