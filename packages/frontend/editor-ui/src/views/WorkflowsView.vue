<script lang="ts" setup>
import { computed, onMounted, watch, ref, onBeforeUnmount } from 'vue';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import type {
	Resource,
	BaseFilters,
	FolderResource,
	WorkflowResource,
} from '@/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import {
	EASY_AI_WORKFLOW_EXPERIMENT,
	AI_CREDITS_EXPERIMENT,
	EnterpriseEditionFeature,
	VIEWS,
	DEFAULT_WORKFLOW_PAGE_SIZE,
	MODAL_CONFIRM,
} from '@/constants';
import type {
	IUser,
	UserAction,
	WorkflowListResource,
	WorkflowListItem,
	FolderPathItem,
} from '@/Interface';
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
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import { useDebounce } from '@/composables/useDebounce';
import { createEventBus } from '@n8n/utils/event-bus';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { type ProjectSharingData, ProjectTypes } from '@/types/projects.types';
import { FOLDER_LIST_ITEM_ACTIONS } from '@/components/Folders/constants';
import { debounce } from 'lodash-es';
import { useMessage } from '@/composables/useMessage';
import { useToast } from '@/composables/useToast';
import { useFoldersStore } from '@/stores/folders.store';

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
const message = useMessage();
const toast = useToast();

const sourceControlStore = useSourceControlStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const posthogStore = usePostHog();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const tagsStore = useTagsStore();
const foldersStore = useFoldersStore();

const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();

const loading = ref(false);
const breadcrumbsLoading = ref(false);
const filters = ref<Filters>({
	search: '',
	homeProject: '',
	status: StatusFilter.ALL,
	tags: [],
});

const workflowListEventBus = createEventBus();

const workflowsAndFolders = ref<WorkflowListResource[]>([]);

const easyAICalloutVisible = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref('updatedAt:desc');

const currentFolderId = ref<string | null>(null);

/**
 * Folder actions
 * These can appear on the list header, and then they are applied to current folder
 * or on each folder card, and then they are applied to the clicked folder
 * 'onlyAvailableOn' is used to specify where the action should be available, if not specified it will be available on both
 */
const folderActions = ref<Array<UserAction & { onlyAvailableOn?: 'mainBreadcrumbs' | 'card' }>>([
	{
		label: 'Open',
		value: FOLDER_LIST_ITEM_ACTIONS.OPEN,
		disabled: false,
		onlyAvailableOn: 'card',
	},
	{
		label: 'Create Folder',
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE,
		disabled: false,
	},
	{
		label: 'Create Workflow',
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW,
		disabled: false,
	},
	{
		label: 'Rename',
		value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
		disabled: true,
	},
	{
		label: 'Move to Folder',
		value: FOLDER_LIST_ITEM_ACTIONS.MOVE,
		disabled: true,
	},
	{
		label: 'Change Owner',
		value: FOLDER_LIST_ITEM_ACTIONS.CHOWN,
		disabled: true,
	},
	{
		label: 'Manage Tags',
		value: FOLDER_LIST_ITEM_ACTIONS.TAGS,
		disabled: true,
	},
	{
		label: 'Delete',
		value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
		disabled: true,
	},
]);
const folderCardActions = computed(() =>
	folderActions.value.filter(
		(action) => !action.onlyAvailableOn || action.onlyAvailableOn === 'card',
	),
);
const mainBreadcrumbsActions = computed(() =>
	folderActions.value.filter(
		(action) => !action.onlyAvailableOn || action.onlyAvailableOn === 'mainBreadcrumbs',
	),
);
const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const foldersEnabled = computed(() => settingsStore.settings.folders.enabled);
const isOverviewPage = computed(() => route.name === VIEWS.WORKFLOWS);
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const isShareable = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);
const showFolders = computed(() => foldersEnabled.value && !isOverviewPage.value);

const currentFolder = computed(() => {
	return currentFolderId.value ? foldersStore.breadcrumbsCache[currentFolderId.value] : null;
});

const currentProject = computed(() => projectsStore.currentProject);

const projectName = computed(() => {
	if (currentProject.value?.type === ProjectTypes.Personal) {
		return i18n.baseText('projects.menu.personal');
	}
	return currentProject.value?.name;
});

const currentParentName = computed(() => {
	if (currentFolder.value) {
		return currentFolder.value.name;
	}
	return projectName.value;
});

const workflowListResources = computed<Resource[]>(() => {
	const resources: Resource[] = (workflowsAndFolders.value || []).map((resource) => {
		if (resource.resource === 'folder') {
			return {
				resourceType: 'folder',
				id: resource.id,
				name: resource.name,
				createdAt: resource.createdAt.toString(),
				updatedAt: resource.updatedAt.toString(),
				homeProject: resource.homeProject,
				sharedWithProjects: resource.sharedWithProjects,
				workflowCount: resource.workflowCount,
				parentFolder: resource.parentFolder,
			} as FolderResource;
		} else {
			return {
				resourceType: 'workflow',
				id: resource.id,
				name: resource.name,
				active: resource.active ?? false,
				updatedAt: resource.updatedAt.toString(),
				createdAt: resource.createdAt.toString(),
				homeProject: resource.homeProject,
				scopes: resource.scopes,
				sharedWithProjects: resource.sharedWithProjects,
				readOnly: !getResourcePermissions(resource.scopes).workflow.update,
				tags: resource.tags,
				parentFolder: resource.parentFolder,
			} as WorkflowResource;
		}
	});
	return resources;
});

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

/**
 * WATCHERS AND STORE SUBSCRIPTIONS
 */

watch(
	() => route.params?.projectId,
	async () => {
		await initialize();
	},
);

watch(
	() => route.params?.folderId,
	async (newVal) => {
		currentFolderId.value = newVal as string;
		await fetchWorkflows();
	},
);

sourceControlStore.$onAction(({ name, after }) => {
	if (name !== 'pullWorkfolder') return;
	after(async () => await initialize());
});

/**
 * LIFE-CYCLE HOOKS
 */

onMounted(async () => {
	documentTitle.set(i18n.baseText('workflows.heading'));
	void usersStore.showPersonalizationSurvey();

	workflowListEventBus.on('resource-moved', fetchWorkflows);
	workflowListEventBus.on('workflow-duplicated', fetchWorkflows);
});

onBeforeUnmount(() => {
	workflowListEventBus.off('resource-moved', fetchWorkflows);
	workflowListEventBus.off('workflow-duplicated', fetchWorkflows);
});

/**
 * METHODS
 */

// Main component fetch methods
const initialize = async () => {
	loading.value = true;
	await setFiltersFromQueryString();
	if (!route.params.folderId) {
		currentFolderId.value = null;
	}
	const [, resourcesPage] = await Promise.all([
		usersStore.fetchUsers(),
		fetchWorkflows(),
		workflowsStore.fetchActiveWorkflows(),
	]);
	breadcrumbsLoading.value = false;
	workflowsAndFolders.value = resourcesPage;
	loading.value = false;
};

/**
 * Fetches:
 * - Current workflows and folders page
 * - Total count of workflows and folders in the current project
 * - Path to the current folder (if not cached)
 */
const fetchWorkflows = async () => {
	// We debounce here so that fast enough fetches don't trigger
	// the placeholder graphics for a few milliseconds, which would cause a flicker
	const delayedLoading = debounce(() => {
		loading.value = true;
	}, 300);
	const routeProjectId = route.params?.projectId as string | undefined;
	const homeProjectFilter = filters.value.homeProject || undefined;
	const parentFolder = (route.params?.folderId as string) || undefined;

	const fetchedResources = await workflowsStore.fetchWorkflowsPage(
		routeProjectId ?? homeProjectFilter,
		currentPage.value,
		pageSize.value,
		currentSort.value,
		{
			name: filters.value.search || undefined,
			active: filters.value.status ? Boolean(filters.value.status) : undefined,
			tags: filters.value.tags.map((tagId) => tagsStore.tagsById[tagId]?.name),
			parentFolderId: parentFolder ?? '0', // 0 is the root folder in the API
		},
		showFolders.value,
	);
	foldersStore.cacheFolders(
		fetchedResources
			.filter((resource) => resource.resource === 'folder')
			.map((r) => ({ id: r.id, name: r.name, parentFolder: r.parentFolder?.id })),
	);
	const isCurrentFolderCached = foldersStore.breadcrumbsCache[parentFolder ?? ''] !== undefined;
	const needToFetchFolderPath = parentFolder && !isCurrentFolderCached && routeProjectId;
	if (needToFetchFolderPath) {
		breadcrumbsLoading.value = true;
		await foldersStore.getFolderPath(routeProjectId, parentFolder);
		currentFolderId.value = parentFolder;
		breadcrumbsLoading.value = false;
	}
	await foldersStore.fetchTotalWorkflowsAndFoldersCount(routeProjectId);

	delayedLoading.cancel();
	workflowsAndFolders.value = fetchedResources;
	loading.value = false;
	return fetchedResources;
};

// Filter and sort methods

const onSortUpdated = async (sort: string) => {
	currentSort.value =
		WORKFLOWS_SORT_MAP[sort as keyof typeof WORKFLOWS_SORT_MAP] ?? 'updatedAt:desc';
	if (currentSort.value !== 'updatedAt:desc') {
		void router.replace({ query: { ...route.query, sort } });
	} else {
		void router.replace({ query: { ...route.query, sort: undefined } });
	}
	await fetchWorkflows();
};

const onFiltersUpdated = async () => {
	currentPage.value = 1;
	saveFiltersOnQueryString();
	await fetchWorkflows();
};

const onSearchUpdated = async (search: string) => {
	currentPage.value = 1;
	saveFiltersOnQueryString();
	if (search) {
		await callDebounced(fetchWorkflows, { debounceTime: 500, trailing: true });
	} else {
		// No need to debounce when clearing search
		await fetchWorkflows();
	}
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	await fetchWorkflows();
};

const setPageSize = async (size: number) => {
	pageSize.value = size;
	await fetchWorkflows();
};

const onClickTag = async (tagId: string) => {
	if (!filters.value.tags.includes(tagId)) {
		filters.value.tags.push(tagId);
		currentPage.value = 1;
		saveFiltersOnQueryString();
		await fetchWorkflows();
	}
};

// Query string methods

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

const setFiltersFromQueryString = async () => {
	const newQuery: LocationQueryRaw = { ...route.query };
	const { tags, status, search, homeProject, sort } = route.query ?? {};

	// Helper to check if string value is not empty
	const isValidString = (value: unknown): value is string =>
		typeof value === 'string' && value.trim().length > 0;

	// Handle home project
	if (isValidString(homeProject)) {
		await projectsStore.getAvailableProjects();
		if (isValidProjectId(homeProject)) {
			newQuery.homeProject = homeProject;
			filters.value.homeProject = homeProject;
		} else {
			delete newQuery.homeProject;
		}
	} else {
		delete newQuery.homeProject;
	}

	// Handle search
	if (isValidString(search)) {
		newQuery.search = search;
		filters.value.search = search;
	} else {
		delete newQuery.search;
	}

	// Handle tags
	if (isValidString(tags)) {
		await tagsStore.fetchAll();
		const validTags = tags
			.split(',')
			.filter((tag) => tagsStore.allTags.map((t) => t.id).includes(tag));

		if (validTags.length) {
			newQuery.tags = validTags.join(',');
			filters.value.tags = validTags;
		} else {
			delete newQuery.tags;
		}
	} else {
		delete newQuery.tags;
	}

	// Handle status
	const validStatusValues = [StatusFilter.ACTIVE.toString(), StatusFilter.DEACTIVATED.toString()];
	if (isValidString(status) && validStatusValues.includes(status)) {
		newQuery.status = status;
		filters.value.status = status === 'true';
	} else {
		delete newQuery.status;
	}

	// Handle sort
	if (isValidString(sort)) {
		const newSort = WORKFLOWS_SORT_MAP[sort as keyof typeof WORKFLOWS_SORT_MAP] ?? 'updatedAt:desc';
		newQuery.sort = sort;
		currentSort.value = newSort;
	} else {
		delete newQuery.sort;
	}

	void router.replace({ query: newQuery });
};

// Misc methods

const addWorkflow = () => {
	uiStore.nodeViewInitialized = false;
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: { projectId: route.params?.projectId, parentFolderId: route.params?.folderId },
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

function isValidProjectId(projectId: string) {
	return projectsStore.availableProjects.some((project) => project.id === projectId);
}

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
		query: { fromJson: 'true', parentFolderId: route.params.folderId },
	});
};

const dismissEasyAICallout = () => {
	easyAICalloutVisible.value = false;
};

const onWorkflowActiveToggle = (data: { id: string; active: boolean }) => {
	const workflow: WorkflowListItem | undefined = workflowsAndFolders.value.find(
		(w): w is WorkflowListItem => w.id === data.id,
	);
	if (!workflow) return;
	workflow.active = data.active;
};

// Breadcrumbs methods

/**
 * Breadcrumbs: Calculate visible and hidden items for both main breadcrumbs and card breadcrumbs
 * We do this here and pass to each component to avoid recalculating in each card
 */
const visibleBreadcrumbsItems = computed<FolderPathItem[]>(() => {
	if (!currentFolder.value) return [];
	const items: FolderPathItem[] = [];
	const parent = foldersStore.getCachedFolder(currentFolder.value.parentFolder ?? '');
	if (parent) {
		items.push({
			id: parent.id,
			label: parent.name,
			href: `/projects/${route.params.projectId}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
	}
	items.push({
		id: currentFolder.value.id,
		label: currentFolder.value.name,
		parentFolder: parent?.parentFolder,
	});
	return items;
});

const hiddenBreadcrumbsItems = computed<FolderPathItem[]>(() => {
	const lastVisibleParent: FolderPathItem =
		visibleBreadcrumbsItems.value[visibleBreadcrumbsItems.value.length - 1];
	if (!lastVisibleParent) return [];
	const items: FolderPathItem[] = [];
	// Go through all the parent folders and add them to the hidden items
	let parentFolder = lastVisibleParent.parentFolder;
	while (parentFolder) {
		const parent = foldersStore.getCachedFolder(parentFolder);

		if (!parent) break;
		items.unshift({
			id: parent.id,
			label: parent.name,
			href: `/projects/${route.params.projectId}/folders/${parent.id}/workflows`,
			parentFolder: parent.parentFolder,
		});
		parentFolder = parent.parentFolder;
	}
	return items;
});

/**
 * Main breadcrumbs items that show on top of the list
 * These show path to the current folder with up to 2 parents visible
 */
const mainBreadcrumbs = computed(() => {
	return {
		visibleItems: visibleBreadcrumbsItems.value,
		hiddenItems: hiddenBreadcrumbsItems.value,
	};
});

/**
 * Card breadcrumbs items that show on workflow and folder cards
 * These show path to the current folder with up to one parent visible
 */
const cardBreadcrumbs = computed(() => {
	const visibleItems = visibleBreadcrumbsItems.value;
	const hiddenItems = hiddenBreadcrumbsItems.value;
	if (visibleItems.length > 1) {
		return {
			visibleItems: [visibleItems[visibleItems.length - 1]],
			hiddenItems: [...hiddenItems, ...visibleItems.slice(0, visibleItems.length - 1)],
		};
	}
	return {
		visibleItems,
		hiddenItems,
	};
});

const onBreadcrumbItemClick = (item: PathItem) => {
	if (item.href) {
		loading.value = true;
		void router
			.push(item.href)
			.then(() => {
				currentFolderId.value = item.id;
				loading.value = false;
			})
			.catch((error) => {
				toast.showError(error, 'Error navigating to folder');
			});
	}
};

// Folder actions

// Main header action handlers
// These render next to the breadcrumbs and are applied to the current folder/project
const onBreadCrumbsAction = async (action: string) => {
	switch (action) {
		case FOLDER_LIST_ITEM_ACTIONS.CREATE:
			if (!route.params.projectId) return;
			const currentParent = currentFolder.value?.name || projectName.value;
			if (!currentParent) return;
			await createFolder({
				id: (route.params.folderId as string) ?? '-1',
				name: currentParent,
				type: currentFolder.value ? 'folder' : 'project',
			});
			break;
		case FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW:
			addWorkflow();
			break;
		default:
			break;
	}
};

// Folder card action handlers
// These render on each folder card and are applied to the clicked folder
const onFolderCardAction = async (payload: { action: string; folderId: string }) => {
	const clickedFolder = foldersStore.getCachedFolder(payload.folderId);
	if (!clickedFolder) return;
	switch (payload.action) {
		case FOLDER_LIST_ITEM_ACTIONS.CREATE:
			await createFolder({
				id: clickedFolder.id,
				name: clickedFolder.name,
				type: 'folder',
			});
			break;
		case FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW:
			currentFolderId.value = clickedFolder.id;
			void router.push({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: route.params?.projectId, parentFolderId: clickedFolder.id },
			});
			break;
		default:
			break;
	}
};

// Reusable action handlers
// Both action handlers ultimately call these methods once folder to apply action to is determined
const createFolder = async (parent: { id: string; name: string; type: 'project' | 'folder' }) => {
	const promptResponsePromise = message.prompt(
		i18n.baseText('folders.add.to.parent.message', { interpolate: { parent: parent.name } }),
		{
			confirmButtonText: i18n.baseText('generic.create'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputErrorMessage: i18n.baseText('folders.add.invalidName.message'),
			inputValue: '',
			inputPattern: /^[a-zA-Z0-9-_ ]{1,100}$/,
			customClass: 'add-folder-modal',
		},
	);
	const promptResponse = await promptResponsePromise;
	if (promptResponse.action === MODAL_CONFIRM) {
		const folderName = promptResponse.value;
		try {
			const newFolder = await foldersStore.createFolder(
				folderName,
				route.params.projectId as string,
				parent.type === 'folder' ? parent.id : undefined,
			);

			let newFolderURL = `/projects/${route.params.projectId}`;
			if (newFolder.parentFolder) {
				newFolderURL = `/projects/${route.params.projectId}/folders/${newFolder.id}/workflows`;
			}
			toast.showMessage({
				title: i18n.baseText('folders.add.success.title'),
				message: i18n.baseText('folders.add.success.message', {
					interpolate: {
						link: newFolderURL,
						name: newFolder.name,
					},
				}),
				type: 'success',
			});
			// If we are on an empty list, just add the new folder to the list
			if (!workflowsAndFolders.value.length) {
				workflowsAndFolders.value = [
					{
						id: newFolder.id,
						name: newFolder.name,
						resource: 'folder',
						createdAt: newFolder.createdAt,
						updatedAt: newFolder.updatedAt,
						homeProject: projectsStore.currentProject as ProjectSharingData,
						sharedWithProjects: [],
						workflowCount: 0,
					},
				];
			} else {
				// Else fetch again with same filters & pagination applied
				await fetchWorkflows();
			}
		} catch (error) {
			toast.showError(error, 'Error creating folder');
		}
	}
};

const createFolderInCurrent = async () => {
	if (!route.params.projectId) return;
	const currentParent = currentFolder.value?.name || projectName.value;
	if (!currentParent) return;
	await createFolder({
		id: (route.params.folderId as string) ?? '-1',
		name: currentParent,
		type: currentFolder.value ? 'folder' : 'project',
	});
};
</script>

<template>
	<ResourcesListLayout
		v-model:filters="filters"
		resource-key="workflows"
		type="list-paginated"
		:resources="workflowListResources"
		:type-props="{ itemSize: 80 }"
		:shareable="isShareable"
		:initialize="initialize"
		:disabled="readOnlyEnv || !projectPermissions.workflow.create"
		:loading="false"
		:resources-refreshing="loading"
		:custom-page-size="DEFAULT_WORKFLOW_PAGE_SIZE"
		:total-items="workflowsStore.totalWorkflowCount"
		:dont-perform-sorting-and-filtering="true"
		@click:add="addWorkflow"
		@update:search="onSearchUpdated"
		@update:current-page="setCurrentPage"
		@update:page-size="setPageSize"
		@update:filters="onFiltersUpdated"
		@sort="onSortUpdated"
	>
		<template #header>
			<ProjectHeader @create-folder="createFolderInCurrent" />
		</template>
		<template v-if="showFolders" #add-button>
			<N8nTooltip placement="top">
				<template #content>
					{{
						currentParentName
							? i18n.baseText('folders.add.to.parent.message', {
									interpolate: { parent: currentParentName },
								})
							: i18n.baseText('folders.add.here.message')
					}}
				</template>
				<N8nButton
					size="large"
					icon="folder-plus"
					type="tertiary"
					data-test-id="add-folder-button"
					:class="$style['add-folder-button']"
					@click="createFolderInCurrent"
				/>
			</N8nTooltip>
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
		<template #breadcrumbs>
			<div v-if="breadcrumbsLoading" :class="$style['breadcrumbs-loading']">
				<n8n-loading :loading="breadcrumbsLoading" :rows="1" variant="p" />
			</div>
			<div v-else-if="showFolders && currentFolder" :class="$style['breadcrumbs-container']">
				<FolderBreadcrumbs
					:breadcrumbs="mainBreadcrumbs"
					:actions="mainBreadcrumbsActions"
					@item-selected="onBreadcrumbItemClick"
					@action="onBreadCrumbsAction"
				/>
			</div>
		</template>
		<template #item="{ item: data }">
			<FolderCard
				v-if="(data as FolderResource | WorkflowResource).resourceType === 'folder'"
				:data="data as FolderResource"
				:actions="folderCardActions"
				:breadcrumbs="cardBreadcrumbs"
				class="mb-2xs"
				@action="onFolderCardAction"
			/>
			<WorkflowCard
				v-else
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data as WorkflowResource"
				:breadcrumbs="cardBreadcrumbs"
				:workflow-list-event-bus="workflowListEventBus"
				:read-only="readOnlyEnv"
				@click:tag="onClickTag"
				@workflow:deleted="fetchWorkflows"
				@workflow:moved="fetchWorkflows"
				@workflow:duplicated="fetchWorkflows"
				@workflow:active-toggle="onWorkflowActiveToggle"
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

.add-folder-button {
	width: 40px;
}

.breadcrumbs-container {
	display: flex;
	align-items: center;
}

.breadcrumbs-loading {
	:global(.el-skeleton__item) {
		margin: 0;
		height: 40px;
		width: 400px;
	}
}
</style>

<style lang="scss">
.add-folder-modal {
	width: 500px;
	padding-bottom: 0;
	.el-message-box__message {
		font-size: var(--font-size-xl);
	}
	.el-message-box__btns {
		padding: 0 var(--spacing-l) var(--spacing-l);
	}
	.el-message-box__content {
		padding: var(--spacing-l);
	}
}
</style>
