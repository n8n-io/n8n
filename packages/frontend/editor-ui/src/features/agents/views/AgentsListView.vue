<script setup lang="ts">
import debounce from 'lodash/debounce';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nCheckbox } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { getResourcePermissions } from '@n8n/permissions';
import { PROJECT_ROOT } from 'n8n-workflow';
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
import type { AgentResource } from '../types';
import { AGENT_BUILDER_VIEW, AGENT_DUPLICATE_MODAL_KEY, NEW_SESSION_PARAM } from '../constants';
import AgentCard from '../components/AgentCard.vue';
import AgentsListIntro from '../components/AgentsListIntro.vue';
import type { BaseFilters, SortingAndPaginationUpdates } from '@/Interface';
import { useSettingsStore } from '@n8n/stores/settings.store';
import AgentFolderBrowser from '../components/AgentFolderBrowser.vue';
import AgentFolderToolbar from '../components/AgentFolderToolbar.vue';
import AgentFolderDialog, { type AgentFolderAction } from '../components/AgentFolderDialog.vue';
import { N8nText } from '@n8n/design-system';
import { getProjectFolders } from '@/features/core/folders/folders.api';
import type { ChangeLocationSearchResponseItem } from '@/features/core/folders/folders.types';

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
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const folderBrowser = ref<InstanceType<typeof AgentFolderBrowser>>();
const folders = ref<ChangeLocationSearchResponseItem[]>([]);
const moveAction = ref<AgentFolderAction | null>(null);
const moveProjectId = ref('');
const folderId = computed(() =>
	typeof route.query.folderId === 'string' ? route.query.folderId : null,
);
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

const allAgents = ref<AgentResource[]>([]);
const filters = ref<BaseFilters>({
	search: '',
	homeProject: '',
	showArchived: route.query.showArchived === 'true',
});
const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref<ListAgentsSortBy>('updatedAt:desc');
const totalItems = ref(0);
const loading = ref(true);

const projectId = computed(() =>
	typeof route.params.projectId === 'string' ? route.params.projectId : undefined,
);
const folderPermissions = computed(() => {
	const global = getResourcePermissions(usersStore.currentUser?.globalScopes).folder;
	const project = getResourcePermissions(
		projectsStore.myProjects.find((item) => item.id === projectId.value)?.scopes,
	).folder;

	return {
		create: Boolean(global.create || project.create),
		update: Boolean(global.update || project.update),
		delete: Boolean(global.delete || project.delete),
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
	lastUpdated: (a: AgentResource, b: AgentResource) =>
		new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
	lastCreated: (a: AgentResource, b: AgentResource) =>
		new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	nameAsc: (a: AgentResource, b: AgentResource) => a.name.localeCompare(b.name),
	nameDesc: (a: AgentResource, b: AgentResource) => b.name.localeCompare(a.name),
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

async function fetchAgents() {
	const requestGeneration = ++fetchGeneration;
	const requestProjectId = projectId.value;
	const requestFolderId = folderId.value;
	const search = filters.value.search;
	const skip = (currentPage.value - 1) * pageSize.value;
	const take = pageSize.value;
	const sortBy = currentSort.value;
	const includeFolders = showFolders.value;
	const filter = buildListFilter();
	const shouldDelayLoading = allAgents.value.length > 0 || folders.value.length > 0;
	const delayedLoading = debounce(() => {
		if (requestGeneration === fetchGeneration) loading.value = true;
	}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

	if (shouldDelayLoading) {
		delayedLoading();
	} else {
		loading.value = true;
	}

	try {
		const folderPage =
			requestProjectId && includeFolders
				? await getProjectFolders(
						rootStore.restApiContext,
						requestProjectId,
						{ resourceType: 'agent', skip, take, sortBy },
						{
							parentFolderId: requestFolderId ?? PROJECT_ROOT,
							...(search ? { name: search } : {}),
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

		if (requestGeneration !== fetchGeneration) {
			return;
		}

		// Workflows list folders first. Share the remaining page slots with Agents.
		const agentSlots = take - folderPage.data.length;
		const fetchOptions = {
			skip: Math.max(0, skip - folderPage.count),
			// The API requires a positive take. Folder-only pages still need the Agent count.
			take: Math.max(1, agentSlots),
			sortBy,
			filter,
		};
		const { count, data } = requestProjectId
			? await listAgentsPage(rootStore.restApiContext, requestProjectId, fetchOptions)
			: await listAgentsPageGlobal(rootStore.restApiContext, fetchOptions);
		if (requestGeneration !== fetchGeneration) {
			return;
		}

		folders.value = folderPage.data;
		allAgents.value = agentSlots > 0 ? data : [];
		totalItems.value = folderPage.count + count;
	} finally {
		delayedLoading.cancel();
		if (requestGeneration === fetchGeneration) loading.value = false;
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
	if (!agent.schema) {
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

function onAgentPublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
	void fetchAgents();
}

function openMove(agent: AgentResource) {
	moveProjectId.value = agent.projectId;
	moveAction.value = { mode: 'moveAgent', id: agent.id, parentFolderId: agent.parentFolderId };
}

watch([projectId, folderId, showFolders], () => {
	currentPage.value = 1;
	folders.value = [];
	allAgents.value = [];
	totalItems.value = 0;

	void fetchAgents();
});

function onAgentUnpublished(updated: AgentResource) {
	allAgents.value = allAgents.value.map((a) => (a.id === updated.id ? updated : a));
	void fetchAgents();
}

function onAgentDeleted(agentId: string) {
	allAgents.value = allAgents.value.filter((a) => a.id !== agentId);
	totalItems.value = Math.max(0, totalItems.value - 1);

	if (allAgents.value.length === 0 && folders.value.length === 0 && currentPage.value > 1) {
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
	<div style="display: contents">
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
			:total-items="totalItems"
			:has-empty-state="!showFolders"
			:dont-perform-sorting-and-filtering="true"
			:shareable="false"
			:ui-config="{ searchEnabled: true, showFiltersDropdown: true, sortEnabled: true }"
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

			<template v-if="showFolders" #breadcrumbs>
				<AgentFolderToolbar
					:items="folderBrowser?.breadcrumbs ?? []"
					:folder-id="folderId"
					:can-create="folderPermissions.create"
					:drag-active="folderBrowser?.isDragging ?? false"
					@navigate="folderBrowser?.navigate($event)"
					@drop="folderBrowser?.drop($event)"
					@create="folderBrowser?.createFolder()"
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
					hide-toolbar
					@changed="fetchAgents"
				/>
				<template v-if="!loading && totalItems === 0">
					<N8nText v-if="filters.search" color="text-base" size="medium">
						{{ locale.baseText('agents.noResults') }}
					</N8nText>
					<AgentsListIntro
						v-else-if="showTemplatesIntro"
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
				<div
					v-if="isAgentResource(data)"
					:draggable="showFolders"
					@dragstart="folderBrowser?.startAgentDrag(data.id)"
					@dragend="folderBrowser?.endDrag()"
				>
					<AgentCard
						class="mb-2xs"
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
			:project-id="moveProjectId"
			:action="moveAction"
			@close="moveAction = null"
			@saved="fetchAgents"
		/>
	</div>
</template>
