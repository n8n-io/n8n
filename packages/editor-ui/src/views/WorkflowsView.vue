<script lang="ts" setup>
import { computed, onMounted, watch, ref } from 'vue';
import ResourcesListLayout, {
	type Resource,
	type BaseFilters,
} from '@/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import {
	EASY_AI_WORKFLOW_EXPERIMENT,
	AI_CREDITS_EXPERIMENT,
	EnterpriseEditionFeature,
	VIEWS,
	DEFAULT_WORKFLOW_PAGE_SIZE,
} from '@/constants';
import type { IUser, IWorkflowDb } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useProjectsStore } from '@/stores/projects.store';
import { getResourcePermissions } from '@/permissions';
import { usePostHog } from '@/stores/posthog.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@/composables/useI18n';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from 'n8n-design-system';
import { pickBy } from 'lodash-es';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import { useDebounce } from '@/composables/useDebounce';

interface Filters extends BaseFilters {
	status: string | boolean;
	tags: string[];
}

const StatusFilter = {
	ACTIVE: true,
	DEACTIVATED: false,
	ALL: '',
};

/** Maps sort values from the ResourcesListLayout component to values expected by workflows endpoint */
const WORKFLOWS_SORT_MAP = {
	lastUpdated: 'updatedAt:desc',
	lastCreated: 'createdAt:desc',
	nameAsc: 'name:asc',
	nameDesc: 'name:desc',
} as const;

const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const sourceControlStore = useSourceControlStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const posthogStore = usePostHog();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const tagsStore = useTagsStore();
const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();

const loading = ref(false);
const filters = ref<Filters>({
	search: '',
	homeProject: '',
	status: StatusFilter.ALL,
	tags: [],
});

const workflows = ref<IWorkflowDb[]>([]);

const easyAICalloutVisible = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref('updatedAt:desc');

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const isShareable = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);

const workflowResources = computed<Resource[]>(() =>
	workflows.value.map((workflow) => ({
		id: workflow.id,
		name: workflow.name,
		value: '',
		active: workflow.active,
		updatedAt: workflow.updatedAt.toString(),
		createdAt: workflow.createdAt.toString(),
		homeProject: workflow.homeProject,
		scopes: workflow.scopes,
		type: 'workflow',
		sharedWithProjects: workflow.sharedWithProjects,
		readOnly: !getResourcePermissions(workflow.scopes).workflow.update,
		tags: workflow.tags,
	})),
);

const statusFilterOptions = computed(() => [
	{
		label: i18n.baseText('workflows.filters.status.all'),
		value: StatusFilter.ALL,
	},
	{
		label: i18n.baseText('workflows.filters.status.active'),
		value: StatusFilter.ACTIVE,
	},
	{
		label: i18n.baseText('workflows.filters.status.deactivated'),
		value: StatusFilter.DEACTIVATED,
	},
]);

const showEasyAIWorkflowCallout = computed(() => {
	const isEasyAIWorkflowExperimentEnabled =
		posthogStore.getVariant(EASY_AI_WORKFLOW_EXPERIMENT.name) ===
		EASY_AI_WORKFLOW_EXPERIMENT.variant;
	const easyAIWorkflowOnboardingDone = usersStore.isEasyAIWorkflowOnboardingDone;
	return isEasyAIWorkflowExperimentEnabled && !easyAIWorkflowOnboardingDone;
});

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
	);
});

const emptyListDescription = computed(() => {
	if (readOnlyEnv.value) {
		return i18n.baseText('workflows.empty.description.readOnlyEnv');
	} else if (!projectPermissions.value.workflow.create) {
		return i18n.baseText('workflows.empty.description.noPermission');
	} else {
		return i18n.baseText('workflows.empty.description');
	}
});

watch(
	() => route.params?.projectId,
	async () => {
		await initialize();
	},
);

// Lifecycle hooks
onMounted(async () => {
	documentTitle.set(i18n.baseText('workflows.heading'));
	void usersStore.showPersonalizationSurvey();
});

// Methods
const onFiltersUpdated = async (newFilters: BaseFilters) => {
	Object.assign(filters.value, newFilters);
	currentPage.value = 1;
	saveFiltersOnQueryString();
	await fetchWorkflows();
};

const onSearchUpdated = async (search: string) => {
	if (search) {
		currentPage.value = 1;
		await callDebounced(fetchWorkflows, { debounceTime: 500, trailing: true });
	} else {
		currentPage.value = 1;
		// No need to debounce when clearing search
		await fetchWorkflows();
	}
};

const addWorkflow = () => {
	uiStore.nodeViewInitialized = false;
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: { projectId: route.params?.projectId },
	});

	telemetry.track('User clicked add workflow button', {
		source: 'Workflows list',
	});
	trackEmptyCardClick('blank');
};

const trackEmptyCardClick = (option: 'blank' | 'templates' | 'courses') => {
	telemetry.track('User clicked empty page option', {
		option,
	});
};

const initialize = async () => {
	loading.value = true;
	await setFiltersFromQueryString();
	const [, workflowsPage] = await Promise.all([
		usersStore.fetchUsers(),
		fetchWorkflows(),
		workflowsStore.fetchActiveWorkflows(),
	]);
	workflows.value = workflowsPage;
	loading.value = false;
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	await fetchWorkflows();
};

const setPageSize = async (size: number) => {
	pageSize.value = size;
	await fetchWorkflows();
};

const fetchWorkflows = async () => {
	loading.value = true;
	const routeProjectId = route.params?.projectId as string | undefined;
	const homeProjectFilter = filters.value.homeProject || undefined;

	const fetchedWorkflows = await workflowsStore.fetchWorkflowsPage(
		routeProjectId ?? homeProjectFilter,
		currentPage.value,
		pageSize.value,
		currentSort.value,
		{
			name: filters.value.search || undefined,
			active: filters.value.status ? Boolean(filters.value.status) : undefined,
			tags: filters.value.tags.map((tagId) => tagsStore.tagsById[tagId]?.name),
		},
	);
	workflows.value = fetchedWorkflows;
	loading.value = false;
	return fetchedWorkflows;
};

const onClickTag = async (tagId: string) => {
	if (!filters.value.tags.includes(tagId)) {
		filters.value.tags.push(tagId);
		currentPage.value = 1;
		await fetchWorkflows();
	}
};

const saveFiltersOnQueryString = () => {
	// Get current query parameters
	const currentQuery = { ...route.query };

	// Update filter parameters
	if (filters.value.search) {
		currentQuery.search = filters.value.search;
	} else {
		delete currentQuery.search;
	}

	if (typeof filters.value.status !== 'string') {
		currentQuery.status = filters.value.status.toString();
	} else {
		delete currentQuery.status;
	}

	if (filters.value.tags.length) {
		currentQuery.tags = filters.value.tags.join(',');
	} else {
		delete currentQuery.tags;
	}

	if (filters.value.homeProject) {
		currentQuery.homeProject = filters.value.homeProject;
	} else {
		delete currentQuery.homeProject;
	}

	void router.replace({
		query: Object.keys(currentQuery).length ? currentQuery : undefined,
	});
};

function isValidProjectId(projectId: string) {
	return projectsStore.availableProjects.some((project) => project.id === projectId);
}

const setFiltersFromQueryString = async () => {
	const { tags, status, search, homeProject } = route.query ?? {};

	const filtersToApply: { [key: string]: string | string[] | boolean } = {};

	if (homeProject && typeof homeProject === 'string') {
		await projectsStore.getAvailableProjects();
		if (isValidProjectId(homeProject)) {
			filtersToApply.homeProject = homeProject;
		}
	}

	if (search && typeof search === 'string') {
		filtersToApply.search = search;
	}

	if (tags && typeof tags === 'string') {
		await tagsStore.fetchAll();
		const currentTags = tagsStore.allTags.map((tag) => tag.id);

		filtersToApply.tags = tags.split(',').filter((tag) => currentTags.includes(tag));
	}

	if (
		status &&
		typeof status === 'string' &&
		[StatusFilter.ACTIVE.toString(), StatusFilter.DEACTIVATED.toString()].includes(status)
	) {
		filtersToApply.status = status === 'true';
	}

	if (Object.keys(filtersToApply).length) {
		Object.assign(filters.value, filtersToApply);
	}

	void router.replace({ query: pickBy(route.query) });
};

sourceControlStore.$onAction(({ name, after }) => {
	if (name !== 'pullWorkfolder') return;
	after(async () => await initialize());
});

const openAIWorkflow = async (source: string) => {
	dismissEasyAICallout();
	telemetry.track(
		'User clicked test AI workflow',
		{
			source,
		},
		{ withPostHog: true },
	);

	const isAiCreditsExperimentEnabled =
		posthogStore.getVariant(AI_CREDITS_EXPERIMENT.name) === AI_CREDITS_EXPERIMENT.variant;

	const easyAiWorkflowJson = getEasyAiWorkflowJson({
		isInstanceInAiFreeCreditsExperiment: isAiCreditsExperimentEnabled,
		withOpenAiFreeCredits: settingsStore.aiCreditsQuota,
	});

	await router.push({
		name: VIEWS.TEMPLATE_IMPORT,
		params: { id: easyAiWorkflowJson.meta.templateId },
		query: { fromJson: 'true' },
	});
};

const dismissEasyAICallout = () => {
	easyAICalloutVisible.value = false;
};

const onSortUpdated = async (sort: string) => {
	currentSort.value =
		WORKFLOWS_SORT_MAP[sort as keyof typeof WORKFLOWS_SORT_MAP] ?? 'updatedAt:desc';
	await fetchWorkflows();
};
</script>

<template>
	<ResourcesListLayout
		resource-key="workflows"
		type="list-paginated"
		:resources="workflowResources"
		:filters="filters"
		:type-props="{ itemSize: 80 }"
		:shareable="isShareable"
		:initialize="initialize"
		:disabled="readOnlyEnv || !projectPermissions.workflow.create"
		:loading="false"
		:resources-refreshing="loading"
		:custom-page-size="10"
		:total-items="workflowsStore.totalWorkflowCount"
		:dont-perform-sorting-and-filtering="true"
		@click:add="addWorkflow"
		@update:filters="onFiltersUpdated"
		@update:search="onSearchUpdated"
		@update:current-page="setCurrentPage"
		@update:page-size="setPageSize"
		@sort="onSortUpdated"
	>
		<template #header>
			<ProjectHeader />
		</template>
		<template #callout>
			<N8nCallout
				v-if="showEasyAIWorkflowCallout && easyAICalloutVisible"
				theme="secondary"
				icon="robot"
				:class="$style['easy-ai-workflow-callout']"
			>
				{{ i18n.baseText('workflows.list.easyAI') }}
				<template #trailingContent>
					<div :class="$style['callout-trailing-content']">
						<n8n-button
							data-test-id="easy-ai-button"
							size="small"
							type="secondary"
							@click="openAIWorkflow('callout')"
						>
							{{ i18n.baseText('generic.tryNow') }}
						</n8n-button>
						<N8nIcon
							size="small"
							icon="times"
							:title="i18n.baseText('generic.dismiss')"
							class="clickable"
							@click="dismissEasyAICallout"
						/>
					</div>
				</template>
			</N8nCallout>
		</template>
		<template #item="{ item: data }">
			<WorkflowCard
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data as IWorkflowDb"
				:read-only="readOnlyEnv"
				@click:tag="onClickTag"
				@workflow:deleted="fetchWorkflows"
			/>
		</template>
		<template #empty>
			<div class="text-center mt-s">
				<N8nHeading tag="h2" size="xlarge" class="mb-2xs">
					{{
						currentUser.firstName
							? i18n.baseText('workflows.empty.heading', {
									interpolate: { name: currentUser.firstName },
								})
							: i18n.baseText('workflows.empty.heading.userNotSetup')
					}}
				</N8nHeading>
				<N8nText size="large" color="text-base">
					{{ emptyListDescription }}
				</N8nText>
			</div>
			<div
				v-if="!readOnlyEnv && projectPermissions.workflow.create"
				:class="['text-center', 'mt-2xl', $style.actionsContainer]"
			>
				<N8nCard
					:class="$style.emptyStateCard"
					hoverable
					data-test-id="new-workflow-card"
					@click="addWorkflow"
				>
					<N8nIcon :class="$style.emptyStateCardIcon" icon="file" />
					<N8nText size="large" class="mt-xs" color="text-dark">
						{{ i18n.baseText('workflows.empty.startFromScratch') }}
					</N8nText>
				</N8nCard>
				<N8nCard
					v-if="showEasyAIWorkflowCallout"
					:class="$style.emptyStateCard"
					hoverable
					data-test-id="easy-ai-workflow-card"
					@click="openAIWorkflow('empty')"
				>
					<N8nIcon :class="$style.emptyStateCardIcon" icon="robot" />
					<N8nText size="large" class="mt-xs pl-2xs pr-2xs" color="text-dark">
						{{ i18n.baseText('workflows.empty.easyAI') }}
					</N8nText>
				</N8nCard>
			</div>
		</template>
		<template #filters="{ setKeyValue }">
			<div v-if="settingsStore.areTagsEnabled" class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.tags')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<WorkflowTagsDropdown
					:placeholder="i18n.baseText('workflowOpen.filterWorkflows')"
					:model-value="filters.tags"
					:create-enabled="false"
					@update:model-value="setKeyValue('tags', $event)"
				/>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				/>
				<N8nSelect
					data-test-id="status-dropdown"
					:model-value="filters.status"
					@update:model-value="setKeyValue('status', $event)"
				>
					<N8nOption
						v-for="option in statusFilterOptions"
						:key="option.label"
						:label="option.label"
						:value="option.value"
						data-test-id="status"
					>
					</N8nOption>
				</N8nSelect>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.actionsContainer {
	display: flex;
	justify-content: center;
}

.easy-ai-workflow-callout {
	// Make the callout padding in line with workflow cards
	margin-top: var(--spacing-xs);
	padding-left: var(--spacing-s);
	padding-right: var(--spacing-m);

	.callout-trailing-content {
		display: flex;
		align-items: center;
		gap: var(--spacing-m);
	}
}

.emptyStateCard {
	width: 192px;
	text-align: center;
	display: inline-flex;
	height: 230px;

	& + & {
		margin-left: var(--spacing-s);
	}

	&:hover {
		svg {
			color: var(--color-primary);
		}
	}
}

.emptyStateCardIcon {
	font-size: 48px;

	svg {
		width: 48px !important;
		color: var(--color-foreground-dark);
		transition: color 0.3s ease;
	}
}
</style>
