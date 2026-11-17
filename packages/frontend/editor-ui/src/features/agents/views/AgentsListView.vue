<script setup lang="ts">
import debounce from 'lodash/debounce';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nCheckbox, N8nInfoTip, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import { PROJECT_ROOT } from 'n8n-workflow';
import { useToast } from '@n8n/composables/useToast';
import { DEBOUNCE_TIME, DEFAULT_WORKFLOW_PAGE_SIZE } from '@/app/constants';
import { type BatchRange, useLoadMoreBatches } from '@/app/composables/useLoadMoreBatches';
import { getDebounceTime, useDebounce } from '@n8n/composables/useDebounce';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import ProjectHeader from '@/features/collaboration/projects/components/ProjectHeader.vue';
import ResourcesListLayout from '@/app/components/layouts/ResourcesListLayout.vue';
import {
	type ResourceListColumn,
	useResourceListColumns,
} from '@/app/components/layouts/resourceListColumns';
import ResourcesListEmptyState from '@/app/components/layouts/ResourcesListEmptyState.vue';
import { InsightsSummary, useInsightsStore } from '@n8n/frontend-module-insights';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useAgentsListEmptyStateTemplatesExperiment } from '@/experiments/agentsListEmptyStateTemplates/useAgentsListEmptyStateTemplatesExperiment';
import {
	listAgentsPage,
	listAgentsPageGlobal,
	type ListAgentsSortBy,
} from '../composables/useAgentApi';
import { useAgentPermissions } from '../composables/useAgentPermissions';
import { useCreateAgent } from '../composables/useCreateAgent';
import { useAgentDuplicate } from '../composables/useAgentDuplicate';
import type { AgentTemplate } from '../agentTemplates';
import { toAgentListItem, type Agent, type AgentListItem } from '../agent.types';
import type { AgentListRowResource, AgentResource } from '../types';
import { AGENT_BUILDER_VIEW, NEW_SESSION_PARAM } from '../constants';
import AgentCard from '../components/AgentCard.vue';
import AgentsListIntro from '../components/AgentsListIntro.vue';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import { useSettingsStore } from '@n8n/stores/settings.store';
import AgentFolderBrowser from '../components/AgentFolderBrowser.vue';
import AgentFolderToolbar from '../components/AgentFolderToolbar.vue';
import AgentFolderDialog, { type AgentFolderAction } from '../components/AgentFolderDialog.vue';
import { N8nEmptyState, N8nText } from '@n8n/design-system';
import { getProjectFolders } from '@/features/core/folders/folders.api';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';

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
const resourceListColumns = useResourceListColumns();

const listColumns = computed<ResourceListColumn[]>(() => [
	resourceListColumns.name(),
	resourceListColumns.updated(),
	resourceListColumns.created(),
	// New chat and the row menu
	resourceListColumns.actions(2),
]);
const documentTitle = useDocumentTitle();

const route = useRoute();
const router = useRouter();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const folderBrowser = ref<InstanceType<typeof AgentFolderBrowser>>();
const folders = ref<ChangeLocationSearchResponseItem[]>([]);
const folderAction = ref<AgentFolderAction | null>(null);
const folderActionProjectId = ref('');
const folderId = computed(() =>
	typeof route.query.folderId === 'string' ? route.query.folderId : null,
);
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const insightsStore = useInsightsStore();
const projectPages = useProjectPages();
const toast = useToast();
const { createAgent } = useCreateAgent();
const { openDuplicate } = useAgentDuplicate();
const { callDebounced } = useDebounce();
const {
	isFeatureEnabled: templatesExperimentEnabled,
	variant: templatesVariant,
	trackExposure: trackTemplatesExposure,
} = useAgentsListEmptyStateTemplatesExperiment();
const showTemplatesIntro = computed(() => templatesExperimentEnabled.value);

const homeProject = computed(() => projectsStore.currentProject ?? projectsStore.personalProject);

const { canCreate: canCreateAgent, canUpdate: canUpdateAgent } = useAgentPermissions(
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
const batches = useLoadMoreBatches(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref<ListAgentsSortBy>('updatedAt:desc');
const totalItems = ref(0);
const hasArchivedAgents = ref(false);
const loading = ref(true);

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
);
const folderPermissions = computed(() => {
	const global = getResourcePermissions(usersStore.currentUser?.globalScopes).folder;
	const project = getResourcePermissions(
		projectsStore.myProjects.find((item) => item.id === projectId.value)?.scopes,
	).folder;
	const canWrite = !sourceControlStore.preferences.branchReadOnly;

	return {
		create: canWrite && Boolean(global.create || project.create),
		update: canWrite && Boolean(global.update || project.update),
		delete: canWrite && Boolean(global.delete || project.delete),
		list: Boolean(global.list || project.list),
	};
});
const showFolders = computed(() =>
	Boolean(projectId.value && settingsStore.isFoldersFeatureEnabled && folderPermissions.value.list),
);

// Exposure covers both arms: control users see the default empty state, test users
// the templates intro. The source mirrors the layout's empty-state condition, so a
// filtered list never counts, and includes the variant so a late flag or Instance AI
// readiness still fires while the surface is visible.
watch(
	() =>
		!loading.value &&
		totalItems.value === 0 &&
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
	const folderFilter = filters.value.search
		? showFolders.value && folderId.value
			? { parentFolderId: folderId.value, includeDescendants: true }
			: {}
		: showFolders.value
			? { parentFolderId: folderId.value }
			: {};
	const filter = {
		...folderFilter,
		...(filters.value.search ? { query: filters.value.search } : {}),
		...(filters.value.showArchived === true ? { includeArchived: true } : {}),
	};

	return Object.keys(filter).length > 0 ? filter : undefined;
}

let fetchGeneration = 0;

interface AgentsListRequest {
	projectId: string | undefined;
	folderId: string | null;
	search: string | undefined;
	sortBy: ListAgentsSortBy;
	includeFolders: boolean;
	filter: ReturnType<typeof buildListFilter>;
}

function getListRequest(): AgentsListRequest {
	return {
		projectId: projectId.value,
		folderId: folderId.value,
		search: filters.value.search,
		sortBy: currentSort.value,
		includeFolders: showFolders.value,
		filter: buildListFilter(),
	};
}

/**
 * Fetches the folders and Agents in a range of list rows. Like the workflows list, the list
 * shows folders first, and Agents fill the remaining rows. Returns `null` when `isCurrent`
 * reports that a newer request started.
 */
async function fetchListRange(
	request: AgentsListRequest,
	{ skip, take }: BatchRange,
	isCurrent: () => boolean = () => true,
) {
	const folderPage =
		request.projectId && request.includeFolders
			? await getProjectFolders(
					rootStore.restApiContext,
					request.projectId,
					{ resourceType: 'agent', skip, take, sortBy: request.sortBy },
					{
						parentFolderId: request.folderId ?? PROJECT_ROOT,
						...(request.search ? { name: request.search } : {}),
					},
					[
						'id',
						'name',
						'parentFolder',
						'agentCount',
						'subFolderCount',
						'path',
						'updatedAt',
						'createdAt',
					],
				)
			: { data: [], count: 0 };

	if (!isCurrent()) return null;

	const agentSlots = take - folderPage.data.length;
	const fetchOptions = {
		offset: Math.max(0, skip - folderPage.count),
		// The API requires a positive limit. Folder-only ranges still need the Agent count.
		limit: Math.max(1, agentSlots),
		sortBy: request.sortBy,
		filter: request.filter,
	};
	const { count, data } = request.projectId
		? await listAgentsPage(rootStore.restApiContext, request.projectId, fetchOptions)
		: await listAgentsPageGlobal(rootStore.restApiContext, fetchOptions);

	return {
		folders: folderPage.data,
		folderCount: folderPage.count,
		agents: agentSlots > 0 ? data : [],
		agentCount: count,
	};
}

async function fetchAgents() {
	const requestGeneration = ++fetchGeneration;
	const request = getListRequest();
	const shouldDelayLoading = allAgents.value.length > 0 || folders.value.length > 0;
	const delayedLoading = debounce(() => {
		if (requestGeneration === fetchGeneration) loading.value = true;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	if (shouldDelayLoading) {
		delayedLoading();
	} else {
		loading.value = true;
	}

	const range = batches.startRefresh();
	try {
		const page = await fetchListRange(
			request,
			range,
			() => requestGeneration === fetchGeneration,
		);

		if (!page || requestGeneration !== fetchGeneration) {
			return;
		}

		let archivedAgentsExist = false;

		if (
			!request.search &&
			!request.filter?.includeArchived &&
			page.agentCount === 0 &&
			page.folderCount === 0 &&
			(!request.includeFolders || !request.folderId)
		) {
			const archivedOptions = {
				offset: 0,
				limit: 1,
				filter: { ...request.filter, includeArchived: true },
			};
			const archivedPage = request.projectId
				? await listAgentsPage(rootStore.restApiContext, request.projectId, archivedOptions)
				: await listAgentsPageGlobal(rootStore.restApiContext, archivedOptions);
			archivedAgentsExist = archivedPage.count > 0;
		}

		if (requestGeneration !== fetchGeneration) {
			return;
		}

		folders.value = page.folders;
		allAgents.value = page.agents;
		totalItems.value = page.folderCount + page.agentCount;
		hasArchivedAgents.value = archivedAgentsExist;
	} catch (error) {
		if (requestGeneration === fetchGeneration) {
			toast.showError(error, locale.baseText('agents.list.loadError'));
		}
	} finally {
		batches.endRefresh();
		delayedLoading.cancel();
		if (requestGeneration === fetchGeneration) loading.value = false;
	}
}

async function loadMoreAgents() {
	const request = getListRequest();
	try {
		await batches.loadMore(
			folders.value.length + allAgents.value.length,
			async (range) => await fetchListRange(request, range),
			(page) => {
				if (!page) return;
				totalItems.value = page.folderCount + page.agentCount;
				// A row can move between batches if it changed since the last request
				const loadedFolderIds = new Set(folders.value.map(({ id }) => id));
				const newFolders = page.folders.filter(({ id }) => !loadedFolderIds.has(id));
				if (newFolders.length > 0) {
					folders.value = [...folders.value, ...newFolders];
				}
				const loadedAgentIds = new Set(allAgents.value.map(({ id }) => id));
				const newAgents = page.agents.filter(({ id }) => !loadedAgentIds.has(id));
				if (newAgents.length > 0) {
					allAgents.value = [...allAgents.value, ...newAgents];
				}
			},
		);
	} catch (error) {
		toast.showError(error, locale.baseText('resourcesList.loadMore.error'));
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
	openDuplicate(
		agent,
		allAgents.value.map((a) => a.name),
		onSelectAgent,
	);
}

function onAgentPublished(updated: Agent) {
	const item = toAgentListItem(updated);
	allAgents.value = allAgents.value.map((a) => (a.id === item.id ? item : a));
	void fetchAgents();
}

function createFolder() {
	if (!projectId.value || !showFolders.value) return;

	folderActionProjectId.value = projectId.value;
	folderAction.value = { mode: 'create', parentFolderId: folderId.value };
}

function openMove(agent: AgentListItem) {
	folderActionProjectId.value = agent.projectId;
	folderAction.value = {
		mode: 'moveAgent',
		id: agent.id,
		name: agent.name,
		parentFolderId: agent.parentFolderId,
	};
}

watch([projectId, folderId, showFolders], () => {
	batches.reset();
	folders.value = [];
	allAgents.value = [];
	totalItems.value = 0;
	hasArchivedAgents.value = false;

	void fetchAgents();
});

function onAgentUnpublished(updated: Agent) {
	const item = toAgentListItem(updated);
	allAgents.value = allAgents.value.map((a) => (a.id === item.id ? item : a));
	void fetchAgents();
}

function onAgentDeleted(agentId: string) {
	allAgents.value = allAgents.value.filter((a) => a.id !== agentId);
	totalItems.value = Math.max(0, totalItems.value - 1);
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
		batches.reset();
		await fetchAgents();
	},
);

async function onSearchUpdated(search: string) {
	filters.value = { ...filters.value, search };
	batches.reset();
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
	if (payload.sort) {
		batches.reset();
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
	<div style="display: contents">
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
			:list-columns="listColumns"
			:custom-page-size="DEFAULT_WORKFLOW_PAGE_SIZE"
			:total-items="totalItems"
			:loaded-count="folders.length + allAgents.length"
			:has-empty-state="!showFolders || (totalItems === 0 && !folderId)"
			:dont-perform-sorting-and-filtering="true"
			:shareable="false"
			:ui-config="{ searchEnabled: true, showFiltersDropdown: true, sortEnabled: true }"
			:display-name="(agent: AgentListItem) => agent.name"
			tab-key="agents"
			@update:search="onSearchUpdated"
			@update:pagination-and-sort="setPaginationAndSort"
			@load-more="loadMoreAgents"
		>
			<template #header>
				<ProjectHeader main-button="agent" @create-folder="createFolder">
					<InsightsSummary
						v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
						:loading="insightsStore.weeklySummary.isLoading"
						:summary="insightsStore.weeklySummary.state"
						time-range="week"
					/>
				</ProjectHeader>
			</template>

			<template v-if="showFolders" #breadcrumbs>
				<AgentFolderToolbar
					:project="homeProject ?? undefined"
					:items="folderBrowser?.breadcrumbs ?? []"
					:folder-id="folderId"
					:can-create="folderPermissions.create"
					:drag-active="folderBrowser?.isDragging ?? false"
					@navigate="folderBrowser?.navigate($event)"
					@drop="folderBrowser?.drop($event)"
					@create="createFolder"
				/>
			</template>

			<template v-if="showFolders && projectId" #list-prepend>
				<AgentFolderBrowser
					ref="folderBrowser"
					:project-id="projectId"
					:folder-id="folderId"
					:folders="folders"
					:search="filters.search"
					:folder-permissions="folderPermissions"
					@changed="fetchAgents"
				/>
				<template v-if="!loading && totalItems === 0">
					<N8nText v-if="filters.search" color="text-base" size="medium">
						{{ locale.baseText('agents.noResults') }}
					</N8nText>
					<N8nEmptyState
						v-else-if="folderId"
						data-test-id="empty-agent-folder-action-box"
						:heading="
							locale.baseText('folders.empty.actionbox.title', {
								interpolate: { folderName: folderBrowser?.breadcrumbs.at(-1)?.label ?? '' },
							})
						"
						:button-text="locale.baseText('projects.header.create.agent')"
						button-type="secondary"
						:button-disabled="!canCreateAgent"
						@click:button="onCreateAgentClick"
					/>
				</template>
			</template>

			<template #empty>
				<N8nInfoTip v-if="hasArchivedAgents" class="mb-s" :bold="false">
					{{ locale.baseText('agents.list.archivedOnly.hint') }}
					<N8nLink
						size="small"
						data-test-id="show-archived-agents"
						@click="filters.showArchived = true"
					>
						{{ locale.baseText('agents.list.filters.showArchived') }}
					</N8nLink>
				</N8nInfoTip>
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
				<div
					v-if="isAgentListItem(data)"
					:draggable="showFolders && canUpdateAgent"
					@dragstart="folderBrowser?.startAgentDrag(data.id)"
					@dragend="folderBrowser?.endDrag()"
				>
					<AgentCard
						:agent="data"
						:show-folder-path="Boolean(filters.search)"
						:project-id="data.projectId"
						@select="onSelectAgent(data.id, data.projectId)"
						@new-chat="onNewAgentChat"
						@published="onAgentPublished"
						@unpublished="onAgentUnpublished"
						@deleted="onAgentDeleted"
						@archived="onAgentArchived"
						@unarchived="onAgentUnpublished"
						@duplicate="onAgentDuplicate"
						@move="openMove(data)"
					/>
				</div>
			</template>
		</ResourcesListLayout>
		<AgentFolderDialog
			:project-id="folderActionProjectId"
			:action="folderAction"
			@close="folderAction = null"
			@saved="fetchAgents"
		/>
	</div>
</template>
