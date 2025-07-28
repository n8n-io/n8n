<script lang="ts" setup>
import Draggable from '@/components/Draggable.vue';
import { FOLDER_LIST_ITEM_ACTIONS } from '@/components/Folders/constants';
import ResourcesListLayout from '@/components/layouts/ResourcesListLayout.vue';
import ProjectHeader from '@/components/Projects/ProjectHeader.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import { useDebounce } from '@/composables/useDebounce';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import type { DragTarget, DropTarget } from '@/composables/useFolders';
import { useFolders } from '@/composables/useFolders';
import { useMessage } from '@/composables/useMessage';
import { useProjectPages } from '@/composables/useProjectPages';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import {
	COMMUNITY_PLUS_ENROLLMENT_MODAL,
	DEFAULT_WORKFLOW_PAGE_SIZE,
	EnterpriseEditionFeature,
	MODAL_CONFIRM,
	VIEWS,
} from '@/constants';
import InsightsSummary from '@/features/insights/components/InsightsSummary.vue';
import { useInsightsStore } from '@/features/insights/insights.store';
import type {
	BaseFilters,
	FolderListItem,
	FolderResource,
	Resource,
	SortingAndPaginationUpdates,
	UserAction,
	WorkflowListItem,
	WorkflowListResource,
	WorkflowResource,
} from '@/Interface';
import { useFoldersStore } from '@/stores/folders.store';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useTemplatesStore } from '@/stores/templates.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsageStore } from '@/stores/usage.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { type Project, type ProjectSharingData, ProjectTypes } from '@/types/projects.types';
import { getEasyAiWorkflowJson } from '@/utils/easyAiWorkflowUtils';
import {
	isExtraTemplateLinksExperimentEnabled,
	isPersonalizedTemplatesExperimentEnabled,
	TemplateClickSource,
	trackTemplatesClick,
} from '@/utils/experiments';
import {
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInlineTextEdit,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import type { PathItem } from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
import { useI18n } from '@n8n/i18n';
import { getResourcePermissions } from '@n8n/permissions';
import { createEventBus } from '@n8n/utils/event-bus';
import debounce from 'lodash/debounce';
import { type IUser, PROJECT_ROOT } from 'n8n-workflow';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue';
import { type LocationQueryRaw, useRoute, useRouter } from 'vue-router';
import { useAITemplatesStarterCollectionStore } from '@/experiments/aiTemplatesStarterCollection/stores/aiTemplatesStarterCollection.store';

const SEARCH_DEBOUNCE_TIME = 300;
const FILTERS_DEBOUNCE_TIME = 100;

interface Filters extends BaseFilters {
	status: string | boolean;
	showArchived: boolean;
	tags: string[];
}

const StatusFilter = {
	ALL: '',
	ACTIVE: 'active',
	DEACTIVATED: 'deactivated',
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
const folderHelpers = useFolders();

const sourceControlStore = useSourceControlStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const projectsStore = useProjectsStore();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const tagsStore = useTagsStore();
const foldersStore = useFoldersStore();
const usageStore = useUsageStore();
const insightsStore = useInsightsStore();
const templatesStore = useTemplatesStore();
const aiStarterTemplatesStore = useAITemplatesStarterCollectionStore();

const documentTitle = useDocumentTitle();
const { callDebounced } = useDebounce();
const projectPages = useProjectPages();

// We render component in a loading state until initialization is done
// This will prevent any additional workflow fetches while initializing
const loading = ref(true);
const breadcrumbsLoading = ref(false);
const filters = ref<Filters>({
	search: '',
	homeProject: '',
	status: StatusFilter.ALL,
	showArchived: false,
	tags: [],
});

const workflowListEventBus = createEventBus();

const workflowsAndFolders = ref<WorkflowListResource[]>([]);

const easyAICalloutVisible = ref(true);

const currentPage = ref(1);
const pageSize = ref(DEFAULT_WORKFLOW_PAGE_SIZE);
const currentSort = ref('updatedAt:desc');

const currentFolderId = ref<string | null>(null);

const showCardsBadge = ref(false);

/**
 * Folder actions
 * These can appear on the list header, and then they are applied to current folder
 * or on each folder card, and then they are applied to the clicked folder
 * 'onlyAvailableOn' is used to specify where the action should be available, if not specified it will be available on both
 */
const folderActions = computed<
	Array<UserAction<IUser> & { onlyAvailableOn?: 'mainBreadcrumbs' | 'card' }>
>(() => [
	{
		label: i18n.baseText('generic.open'),
		value: FOLDER_LIST_ITEM_ACTIONS.OPEN,
		disabled: false,
		onlyAvailableOn: 'card',
	},
	{
		label: i18n.baseText('folders.actions.create'),
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE,
		disabled: readOnlyEnv.value || !hasPermissionToCreateFolders.value,
	},
	{
		label: i18n.baseText('folders.actions.create.workflow'),
		value: FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW,
		disabled: readOnlyEnv.value || !hasPermissionToCreateWorkflows.value,
	},
	{
		label: i18n.baseText('generic.rename'),
		value: FOLDER_LIST_ITEM_ACTIONS.RENAME,
		disabled: readOnlyEnv.value || !hasPermissionToUpdateFolders.value,
	},
	{
		label: i18n.baseText('folders.actions.moveToFolder'),
		value: FOLDER_LIST_ITEM_ACTIONS.MOVE,
		disabled: readOnlyEnv.value || !hasPermissionToUpdateFolders.value,
	},
	{
		label: i18n.baseText('generic.delete'),
		value: FOLDER_LIST_ITEM_ACTIONS.DELETE,
		disabled: readOnlyEnv.value || !hasPermissionToDeleteFolders.value,
	},
]);

const folderCardActions = computed(
	(): Array<UserAction<IUser>> =>
		folderActions.value.filter(
			(action) => !action.onlyAvailableOn || action.onlyAvailableOn === 'card',
		),
);

const mainBreadcrumbsActions = computed(
	(): Array<UserAction<IUser>> =>
		folderActions.value.filter(
			(action) => !action.onlyAvailableOn || action.onlyAvailableOn === 'mainBreadcrumbs',
		),
);

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const isShareable = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);

const foldersEnabled = computed(() => {
	return settingsStore.isFoldersFeatureEnabled;
});

const teamProjectsEnabled = computed(() => {
	return projectsStore.isTeamProjectFeatureEnabled;
});

const showFolders = computed(() => {
	return foldersEnabled.value && !projectPages.isOverviewSubPage && !projectPages.isSharedSubPage;
});

const currentFolder = computed(() => {
	return currentFolderId.value ? foldersStore.breadcrumbsCache[currentFolderId.value] : null;
});

const currentFolderParent = computed(() => {
	return currentFolder.value?.parentFolder
		? foldersStore.breadcrumbsCache[currentFolder.value.parentFolder]
		: null;
});

const isDragging = computed(() => {
	return foldersStore.draggedElement !== null;
});

const isDragNDropEnabled = computed(() => {
	return !readOnlyEnv.value && hasPermissionToUpdateFolders.value;
});

const hasPermissionToCreateFolders = computed(() => {
	if (!currentProject.value) return false;
	return getResourcePermissions(currentProject.value.scopes).folder.create === true;
});

const hasPermissionToUpdateFolders = computed(() => {
	if (!currentProject.value) return false;
	return getResourcePermissions(currentProject.value.scopes).folder.update === true;
});

const hasPermissionToDeleteFolders = computed(() => {
	if (!currentProject.value) return false;
	return getResourcePermissions(currentProject.value.scopes).folder.delete === true;
});

const hasPermissionToCreateWorkflows = computed(() => {
	if (!currentProject.value) return false;
	return getResourcePermissions(currentProject.value.scopes).workflow.create === true;
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

const personalProject = computed<Project | null>(() => {
	return projectsStore.personalProject;
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
				workflowCount: resource.workflowCount,
				subFolderCount: resource.subFolderCount,
				parentFolder: resource.parentFolder,
			} satisfies FolderResource;
		} else {
			return {
				resourceType: 'workflow',
				id: resource.id,
				name: resource.name,
				active: resource.active ?? false,
				isArchived: resource.isArchived,
				updatedAt: resource.updatedAt.toString(),
				createdAt: resource.createdAt.toString(),
				homeProject: resource.homeProject,
				scopes: resource.scopes,
				sharedWithProjects: resource.sharedWithProjects,
				readOnly: !getResourcePermissions(resource.scopes).workflow.update,
				tags: resource.tags,
				parentFolder: resource.parentFolder,
			} satisfies WorkflowResource;
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
	const easyAIWorkflowOnboardingDone = usersStore.isEasyAIWorkflowOnboardingDone;
	return !easyAIWorkflowOnboardingDone;
});

const templatesCardEnabled = computed(() => {
	return isExtraTemplateLinksExperimentEnabled() && settingsStore.isTemplatesEnabled;
});

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? personalProject.value?.scopes,
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

const hasFilters = computed(() => {
	return !!(
		filters.value.search ||
		filters.value.status !== StatusFilter.ALL ||
		filters.value.showArchived ||
		filters.value.tags.length
	);
});

const isSelfHostedDeployment = computed(() => settingsStore.deploymentType === 'default');

const canUserRegisterCommunityPlus = computed(
	() => getResourcePermissions(usersStore.currentUser?.globalScopes).community.register,
);

const showRegisteredCommunityCTA = computed(
	() => isSelfHostedDeployment.value && !foldersEnabled.value && canUserRegisterCommunityPlus.value,
);

const experimentalShowSuggestedWorkflows = computed(() =>
	isPersonalizedTemplatesExperimentEnabled(),
);

const showAIStarterCollectionCallout = computed(() => {
	return (
		!loading.value &&
		aiStarterTemplatesStore.isFeatureEnabled &&
		!aiStarterTemplatesStore.calloutDismissed &&
		!readOnlyEnv.value &&
		// We want to show the callout only if the user has permissions to create folders and workflows
		// but also on the overview page
		(projectPages.isOverviewSubPage ||
			(hasPermissionToCreateFolders.value && hasPermissionToCreateWorkflows.value))
	);
});

/**
 * WATCHERS, STORE SUBSCRIPTIONS AND EVENT BUS HANDLERS
 */

watch([() => route.params?.projectId, () => route.name], async () => {
	loading.value = true;
});

watch(
	() => route.params?.folderId,
	async (newVal) => {
		currentFolderId.value = newVal as string;
		filters.value.search = '';
		saveFiltersOnQueryString();
		await fetchWorkflows();
	},
);

sourceControlStore.$onAction(({ name, after }) => {
	if (name !== 'pullWorkfolder') return;
	after(async () => await initialize());
});

const refreshWorkflows = async () => {
	await Promise.all([
		fetchWorkflows(),
		foldersStore.fetchTotalWorkflowsAndFoldersCount(route.params.projectId as string | undefined),
	]);
};

const onFolderDeleted = async (payload: {
	folderId: string;
	workflowCount: number;
	folderCount: number;
}) => {
	const folderInfo = foldersStore.getCachedFolder(payload.folderId);
	foldersStore.deleteFoldersFromCache([payload.folderId, folderInfo?.parentFolder ?? '']);
	// If the deleted folder is the current folder, navigate to the parent folder
	await foldersStore.fetchTotalWorkflowsAndFoldersCount(
		route.params.projectId as string | undefined,
	);

	if (currentFolderId.value === payload.folderId) {
		void router.push({
			name: VIEWS.PROJECTS_FOLDERS,
			params: { projectId: route.params.projectId, folderId: folderInfo?.parentFolder ?? '' },
		});
	} else {
		await fetchWorkflows();
	}
	telemetry.track('User deleted folder', {
		folder_id: payload.folderId,
		deleted_sub_folders: payload.folderCount,
		deleted_sub_workflows: payload.workflowCount,
	});
};

/**
 * LIFE-CYCLE HOOKS
 */

onMounted(async () => {
	documentTitle.set(i18n.baseText('workflows.heading'));
	void usersStore.showPersonalizationSurvey();

	workflowListEventBus.on('resource-moved', fetchWorkflows);
	workflowListEventBus.on('workflow-duplicated', fetchWorkflows);
	workflowListEventBus.on('folder-deleted', onFolderDeleted);
	workflowListEventBus.on('folder-moved', moveFolder);
	workflowListEventBus.on('folder-transferred', onFolderTransferred);
	workflowListEventBus.on('workflow-moved', onWorkflowMoved);
	workflowListEventBus.on('workflow-transferred', onWorkflowTransferred);
});

onBeforeUnmount(() => {
	workflowListEventBus.off('resource-moved', fetchWorkflows);
	workflowListEventBus.off('workflow-duplicated', fetchWorkflows);
	workflowListEventBus.off('folder-deleted', onFolderDeleted);
	workflowListEventBus.off('folder-moved', moveFolder);
	workflowListEventBus.off('folder-transferred', onFolderTransferred);
	workflowListEventBus.off('workflow-moved', onWorkflowMoved);
	workflowListEventBus.off('workflow-transferred', onWorkflowTransferred);
});

/**
 * METHODS
 */

// Main component fetch methods
const initialize = async () => {
	loading.value = true;
	await setFiltersFromQueryString();

	currentFolderId.value = route.params.folderId as string | null;
	const [, resourcesPage] = await Promise.all([
		usersStore.fetchUsers(),
		fetchWorkflows(),
		workflowsStore.fetchActiveWorkflows(),
		usageStore.getLicenseInfo(),
		foldersStore.fetchTotalWorkflowsAndFoldersCount(route.params.projectId as string | undefined),
		templatesStore.experimentalFetchSuggestedWorkflows(),
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

	const tags = filters.value.tags.length
		? filters.value.tags.map((tagId) => tagsStore.tagsById[tagId]?.name)
		: [];

	const activeFilter =
		filters.value.status === StatusFilter.ALL
			? undefined
			: filters.value.status === StatusFilter.ACTIVE;

	const archivedFilter = filters.value.showArchived ? undefined : false;

	// Only fetch folders if showFolders is enabled and there are not tags or active filter applied
	const fetchFolders = showFolders.value && !tags.length && activeFilter === undefined;

	try {
		const fetchedResources = await workflowsStore.fetchWorkflowsPage(
			routeProjectId ?? homeProjectFilter,
			currentPage.value,
			pageSize.value,
			currentSort.value,
			{
				name: filters.value.search || undefined,
				active: activeFilter,
				isArchived: archivedFilter,
				tags: tags.length ? tags : undefined,
				parentFolderId: getParentFolderId(parentFolder),
			},
			fetchFolders,
			projectPages.isSharedSubPage,
		);

		foldersStore.cacheFolders(
			fetchedResources
				.filter((resource) => resource.resource === 'folder')
				.map((r) => ({ id: r.id, name: r.name, parentFolder: r.parentFolder?.id })),
		);

		// This is for the case when user lands straight on a folder page
		const isCurrentFolderCached = foldersStore.breadcrumbsCache[parentFolder ?? ''] !== undefined;
		const needToFetchFolderPath = parentFolder && !isCurrentFolderCached && routeProjectId;

		if (needToFetchFolderPath) {
			breadcrumbsLoading.value = true;
			await foldersStore.getFolderPath(routeProjectId, parentFolder);
			breadcrumbsLoading.value = false;
		}

		workflowsAndFolders.value = fetchedResources;

		// Toggle ownership cards visibility only after we have fetched the workflows
		showCardsBadge.value =
			projectPages.isOverviewSubPage || projectPages.isSharedSubPage || filters.value.search !== '';

		return fetchedResources;
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.list.error.fetching'));
		// redirect to the project page if the folder is not found
		void router.push({ name: VIEWS.PROJECTS_FOLDERS, params: { projectId: routeProjectId } });
		return [];
	} finally {
		delayedLoading.cancel();
		loading.value = false;
		if (breadcrumbsLoading.value) {
			breadcrumbsLoading.value = false;
		}
	}
};

/**
 * Get parent folder id for filtering requests
 */
const getParentFolderId = (routeId?: string) => {
	// If parentFolder is defined in route, use it
	if (routeId !== null && routeId !== undefined) {
		return routeId;
	}

	// If we're on overview/shared page or searching, don't filter by parent folder
	if (projectPages.isOverviewSubPage || projectPages.isSharedSubPage || filters?.value.search) {
		return undefined;
	}

	// Default: 0 will only show one level of folders
	return PROJECT_ROOT;
};

// Filter and sort methods
const onFiltersUpdated = async () => {
	currentPage.value = 1;
	saveFiltersOnQueryString();
	if (!loading.value) {
		await callDebounced(fetchWorkflows, { debounceTime: FILTERS_DEBOUNCE_TIME, trailing: true });
	}
};

const onSearchUpdated = async (search: string) => {
	currentPage.value = 1;
	saveFiltersOnQueryString();
	if (search) {
		await callDebounced(fetchWorkflows, { debounceTime: SEARCH_DEBOUNCE_TIME, trailing: true });
	} else {
		// No need to debounce when clearing search
		await fetchWorkflows();
	}
};

const setPaginationAndSort = async (payload: SortingAndPaginationUpdates) => {
	if (payload.page) {
		currentPage.value = payload.page;
	}
	if (payload.pageSize) {
		pageSize.value = payload.pageSize;
	}
	if (payload.sort) {
		currentSort.value =
			WORKFLOWS_SORT_MAP[payload.sort as keyof typeof WORKFLOWS_SORT_MAP] ?? 'updatedAt:desc';
	}
	// Don't fetch workflows if we are loading
	// This will prevent unnecessary API calls when changing sort and pagination from url/local storage
	// when switching between projects
	if (!loading.value) {
		await callDebounced(fetchWorkflows, { debounceTime: FILTERS_DEBOUNCE_TIME, trailing: true });
	}
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

	if (filters.value.status !== StatusFilter.ALL) {
		currentQuery.status = (filters.value.status === StatusFilter.ACTIVE).toString();
	} else {
		delete currentQuery.status;
	}

	if (filters.value.showArchived) {
		currentQuery.showArchived = 'true';
	} else {
		delete currentQuery.showArchived;
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
	const { tags, status, search, homeProject, sort, showArchived } = route.query ?? {};

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
	if (isValidString(status)) {
		newQuery.status = status;
		filters.value.status = status === 'true' ? StatusFilter.ACTIVE : StatusFilter.DEACTIVATED;
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

	if (isValidString(showArchived)) {
		newQuery.showArchived = showArchived;
		filters.value.showArchived = showArchived === 'true';
	} else {
		delete newQuery.showArchived;
		filters.value.showArchived = false;
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

const openTemplatesRepository = async () => {
	trackTemplatesClick(TemplateClickSource.emptyInstanceCard);

	if (templatesStore.hasCustomTemplatesHost) {
		await router.push({ name: VIEWS.TEMPLATES });
		return;
	}

	window.open(templatesStore.websiteTemplateRepositoryURL, '_blank');
};

const trackEmptyCardClick = (option: 'blank' | 'templates' | 'courses') => {
	telemetry.track('User clicked empty page option', {
		option,
	});
};

function isValidProjectId(projectId: string) {
	return projectsStore.availableProjects.some((project) => project.id === projectId);
}

const createAIStarterWorkflows = async (source: 'card' | 'callout') => {
	try {
		const projectId = projectPages.isOverviewSubPage
			? personalProject.value?.id
			: (route.params.projectId as string);
		if (typeof projectId !== 'string') {
			toast.showError(new Error(), i18n.baseText('workflows.ai.starter.collection.error'));
			return;
		}
		const newFolder = await aiStarterTemplatesStore.createStarterWorkflows(
			projectId,
			currentFolderId.value ?? undefined,
		);
		// If we are on the overview page, navigate to the new folder
		if (projectPages.isOverviewSubPage) {
			await router.push({
				name: VIEWS.PROJECTS_FOLDERS,
				params: { projectId, folderId: newFolder.id },
			});
		} else {
			// If we are in a specific folder, just add the new folder to the list
			workflowsAndFolders.value.unshift({
				id: newFolder.id,
				name: newFolder.name,
				resource: 'folder',
				createdAt: newFolder.createdAt,
				updatedAt: newFolder.updatedAt,
				subFolderCount: 0,
				workflowCount: 3,
				parentFolder: newFolder.parentFolder,
			});
		}
		aiStarterTemplatesStore.trackUserCreatedStarterCollection(source);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflows.ai.starter.collection.error'));
		return;
	}
};

const openAIWorkflow = async (source: string) => {
	dismissEasyAICallout();
	telemetry.track('User clicked test AI workflow', {
		source,
	});

	const easyAiWorkflowJson = getEasyAiWorkflowJson();

	await router.push({
		name: VIEWS.TEMPLATE_IMPORT,
		params: { id: easyAiWorkflowJson.meta.templateId },
		query: { fromJson: 'true', parentFolderId: route.params.folderId },
	});
};

const dismissStarterCollectionCallout = () => {
	aiStarterTemplatesStore.dismissCallout();
	aiStarterTemplatesStore.trackUserDismissedCallout();
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

const getFolderListItem = (folderId: string): FolderListItem | undefined => {
	return workflowsAndFolders.value.find(
		(resource): resource is FolderListItem =>
			resource.resource === 'folder' && resource.id === folderId,
	);
};

const getFolderContent = async (folderId: string) => {
	const folderListItem = getFolderListItem(folderId);
	if (folderListItem) {
		return {
			workflowCount: folderListItem.workflowCount,
			subFolderCount: folderListItem.subFolderCount,
		};
	}
	try {
		// Fetch the folder content from API
		const content = await foldersStore.fetchFolderContent(currentProject.value?.id ?? '', folderId);
		return { workflowCount: content.totalWorkflows, subFolderCount: content.totalSubFolders };
	} catch (error) {
		toast.showMessage({
			title: i18n.baseText('folders.delete.error.message'),
			message: i18n.baseText('folders.not.found.message'),
			type: 'error',
		});
		return { workflowCount: 0, subFolderCount: 0 };
	}
};

/* Drag and drop methods */

const onFolderCardDrop = async (event: MouseEvent) => {
	const { draggedResource, dropTarget } = folderHelpers.handleDrop(event);
	if (!draggedResource || !dropTarget) return;
	await moveResourceOnDrop(draggedResource, dropTarget);
};

const onBreadCrumbsItemDrop = async (item: PathItem) => {
	if (!foldersStore.draggedElement) return;
	await moveResourceOnDrop(
		{
			id: foldersStore.draggedElement.id,
			type: foldersStore.draggedElement.type,
			name: foldersStore.draggedElement.name,
		},
		{
			id: item.id,
			type: 'folder',
			name: item.label,
		},
	);
	folderHelpers.onDragEnd();
};

const moveFolderToProjectRoot = async (id: string, name: string) => {
	if (!foldersStore.draggedElement) return;
	await moveResourceOnDrop(
		{
			id: foldersStore.draggedElement.id,
			type: foldersStore.draggedElement.type,
			name: foldersStore.draggedElement.name,
		},
		{
			id,
			type: 'project',
			name,
		},
	);
	folderHelpers.onDragEnd();
};

/**
 * Perform resource move on drop, also handles toast messages and updating the UI
 * @param draggedResource
 * @param dropTarget
 */
const moveResourceOnDrop = async (draggedResource: DragTarget, dropTarget: DropTarget) => {
	if (draggedResource.type === 'folder') {
		await moveFolder({
			folder: { id: draggedResource.id, name: draggedResource.name },
			newParent: { id: dropTarget.id, name: dropTarget.name, type: dropTarget.type },
			options: { skipFetch: true, skipNavigation: true },
		});
		// Remove the dragged folder from the list
		workflowsAndFolders.value = workflowsAndFolders.value.filter(
			(folder) => folder.id !== draggedResource.id,
		);
		// Increase the count of the target folder
		const targetFolder = getFolderListItem(dropTarget.id);
		if (targetFolder) {
			targetFolder.subFolderCount += 1;
		}
	} else if (draggedResource.type === 'workflow') {
		await onWorkflowMoved({
			workflow: {
				id: draggedResource.id,
				name: draggedResource.name,
				oldParentId: currentFolderId.value ?? '',
			},
			newParent: { id: dropTarget.id, name: dropTarget.name, type: dropTarget.type },
			options: { skipFetch: true },
		});
		// Remove the dragged workflow from the list
		workflowsAndFolders.value = workflowsAndFolders.value.filter(
			(workflow) => workflow.id !== draggedResource.id,
		);
		// Increase the count of the target folder
		const targetFolder = getFolderListItem(dropTarget.id);
		if (targetFolder) {
			targetFolder.workflowCount += 1;
		}
	}
};

// Breadcrumbs methods

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
				toast.showError(error, i18n.baseText('folders.open.error.title'));
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
		case FOLDER_LIST_ITEM_ACTIONS.DELETE:
			if (!route.params.folderId) return;
			const content = await getFolderContent(route.params.folderId as string);
			await deleteFolder(
				route.params.folderId as string,
				content.workflowCount,
				content.subFolderCount,
			);
			break;
		case FOLDER_LIST_ITEM_ACTIONS.RENAME:
			onNameToggle();
			break;
		case FOLDER_LIST_ITEM_ACTIONS.MOVE:
			if (!currentFolder.value) return;
			uiStore.openMoveToFolderModal(
				'folder',
				{
					id: currentFolder.value?.id,
					name: currentFolder.value?.name,
					parentFolderId: currentFolder.value?.parentFolder,
				},
				workflowListEventBus,
			);
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
			await createFolder(
				{
					id: clickedFolder.id,
					name: clickedFolder.name,
					type: 'folder',
				},
				{ openAfterCreate: true },
			);
			break;
		case FOLDER_LIST_ITEM_ACTIONS.CREATE_WORKFLOW:
			currentFolderId.value = clickedFolder.id;
			void router.push({
				name: VIEWS.NEW_WORKFLOW,
				query: { projectId: route.params?.projectId, parentFolderId: clickedFolder.id },
			});
			break;
		case FOLDER_LIST_ITEM_ACTIONS.DELETE: {
			const content = await getFolderContent(clickedFolder.id);
			await deleteFolder(clickedFolder.id, content.workflowCount, content.subFolderCount);
			break;
		}
		case FOLDER_LIST_ITEM_ACTIONS.RENAME:
			await renameFolder(clickedFolder.id);
			break;
		case FOLDER_LIST_ITEM_ACTIONS.MOVE:
			uiStore.openMoveToFolderModal(
				'folder',
				{
					id: clickedFolder.id,
					name: clickedFolder.name,
					parentFolderId: clickedFolder.parentFolder,
				},
				workflowListEventBus,
			);
			break;
		default:
			break;
	}
};

// Reusable action handlers
// Both action handlers ultimately call these methods once folder to apply action to is determined
const createFolder = async (
	parent: { id: string; name: string; type: 'project' | 'folder' },
	options: { openAfterCreate: boolean } = { openAfterCreate: false },
) => {
	const promptResponsePromise = message.prompt(
		i18n.baseText('folders.add.to.parent.message', { interpolate: { parent: parent.name } }),
		{
			confirmButtonText: i18n.baseText('generic.create'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValidator: folderHelpers.validateFolderName,
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

			const newFolderURL = router.resolve({
				name: VIEWS.PROJECTS_FOLDERS,
				params: { projectId: route.params.projectId, folderId: newFolder.id },
			}).href;
			toast.showToast({
				title: i18n.baseText('folders.add.success.title'),
				message: i18n.baseText('folders.add.success.message', {
					interpolate: {
						link: newFolderURL,
						folderName: newFolder.name,
					},
				}),
				onClick: (event: MouseEvent | undefined) => {
					if (event?.target instanceof HTMLAnchorElement) {
						event.preventDefault();
						void router.push(newFolderURL);
					}
				},
				type: 'success',
			});
			telemetry.track('User created folder', {
				folder_id: newFolder.id,
			});
			if (options.openAfterCreate) {
				// Navigate to parent folder id option specified by the caller
				await router.push({
					name: VIEWS.PROJECTS_FOLDERS,
					params: { projectId: route.params.projectId, folderId: parent.id },
				});
			} else {
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
							workflowCount: 0,
							subFolderCount: 0,
						},
					];
					foldersStore.cacheFolders([
						{ id: newFolder.id, name: newFolder.name, parentFolder: currentFolder.value?.id },
					]);
				} else {
					// Else fetch again with same filters & pagination applied
					await fetchWorkflows();
				}
			}
		} catch (error) {
			toast.showError(error, i18n.baseText('folders.create.error.title'));
		}
	}
};

const renameFolder = async (folderId: string) => {
	const folder = foldersStore.getCachedFolder(folderId);
	if (!folder || !currentProject.value) return;
	const promptResponsePromise = message.prompt(
		i18n.baseText('folders.rename.message', { interpolate: { folderName: folder.name } }),
		{
			confirmButtonText: i18n.baseText('generic.rename'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			inputValue: folder.name,
			customClass: 'rename-folder-modal',
			inputValidator: folderHelpers.validateFolderName,
		},
	);
	const promptResponse = await promptResponsePromise;
	if (promptResponse.action === MODAL_CONFIRM) {
		const newFolderName = promptResponse.value;
		try {
			await foldersStore.renameFolder(currentProject.value?.id, folderId, newFolderName);
			foldersStore.breadcrumbsCache[folderId].name = newFolderName;
			toast.showMessage({
				title: i18n.baseText('folders.rename.success.message', {
					interpolate: { folderName: newFolderName },
				}),
				type: 'success',
			});
			await fetchWorkflows();
			telemetry.track('User renamed folder', {
				folder_id: folderId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('folders.rename.error.title'));
		}
	}
};

const createFolderInCurrent = async () => {
	// Show the community plus enrollment modal if the user is self-hosted, and hasn't enabled folders
	if (showRegisteredCommunityCTA.value) {
		uiStore.openModalWithData({
			name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: { customHeading: i18n.baseText('folders.registeredCommunity.cta.heading') },
		});
		return;
	}
	if (!route.params.projectId) return;
	const currentParent = currentFolder.value?.name || projectName.value;
	if (!currentParent) return;
	await createFolder({
		id: (route.params.folderId as string) ?? '-1',
		name: currentParent,
		type: currentFolder.value ? 'folder' : 'project',
	});
};

const deleteFolder = async (folderId: string, workflowCount: number, subFolderCount: number) => {
	if (subFolderCount || workflowCount) {
		uiStore.openDeleteFolderModal(folderId, workflowListEventBus, {
			workflowCount,
			subFolderCount,
		});
	} else {
		await foldersStore.deleteFolder(route.params.projectId as string, folderId);
		toast.showMessage({
			title: i18n.baseText('folders.delete.success.message'),
			type: 'success',
		});
		await onFolderDeleted({ folderId, workflowCount, folderCount: subFolderCount });
	}
};

const moveFolder = async (payload: {
	folder: { id: string; name: string };
	newParent: { id: string; name: string; type: 'folder' | 'project' };
	options?: {
		skipFetch?: boolean;
		skipNavigation?: boolean;
	};
}) => {
	if (!route.params.projectId) return;

	try {
		await foldersStore.moveFolder(
			route.params.projectId as string,
			payload.folder.id,
			payload.newParent.type === 'folder' ? payload.newParent.id : '0',
		);
		const isCurrentFolder = currentFolderId.value === payload.folder.id;

		const newFolderURL = router.resolve({
			name: VIEWS.PROJECTS_FOLDERS,
			params: {
				projectId: route.params.projectId,
				folderId: payload.newParent.type === 'folder' ? payload.newParent.id : undefined,
			},
		}).href;
		if (isCurrentFolder && !payload.options?.skipNavigation) {
			// If we just moved the current folder, automatically navigate to the new folder
			void router.push(newFolderURL);
		} else {
			// Else show success message and update the list
			toast.showToast({
				title: i18n.baseText('folders.move.success.title'),
				message: i18n.baseText('folders.move.success.message', {
					interpolate: {
						folderName: payload.folder.name,
						newFolderName: payload.newParent.name,
					},
				}),
				onClick: (event: MouseEvent | undefined) => {
					if (event?.target instanceof HTMLAnchorElement) {
						event.preventDefault();
						void router.push(newFolderURL);
					}
				},
				type: 'success',
			});
			if (!payload.options?.skipFetch) {
				await fetchWorkflows();
			}
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.move.error.title'));
	}
};

const onFolderTransferred = async (payload: {
	source: {
		projectId: string;
		folder: { id: string; name: string };
	};
	destination: {
		projectId: string;
		parentFolder: { id: string | undefined; name: string };
		canAccess: boolean;
	};
	shareCredentials?: string[];
}) => {
	try {
		await foldersStore.moveFolderToProject(
			payload.source.projectId,
			payload.source.folder.id,
			payload.destination.projectId,
			payload.destination.parentFolder.id,
			payload.shareCredentials,
		);

		const isCurrentFolder = currentFolderId.value === payload.source.folder.id;
		const newFolderURL = router.resolve({
			name: VIEWS.PROJECTS_FOLDERS,
			params: {
				projectId: payload.destination.canAccess
					? payload.destination.projectId
					: payload.source.projectId,
				folderId: payload.destination.canAccess ? payload.source.folder.id : undefined,
			},
		}).href;

		if (isCurrentFolder) {
			if (payload.destination.canAccess) {
				// If we just moved the current folder and can access the destination navigate there
				void router.push(newFolderURL);
			} else {
				// Otherwise navigate to the workflows page of the source project
				void router.push({
					name: VIEWS.PROJECTS_WORKFLOWS,
					params: {
						projectId: payload.source.projectId,
					},
				});
			}
		} else {
			await refreshWorkflows();

			if (payload.destination.canAccess) {
				toast.showToast({
					title: i18n.baseText('folders.move.success.title'),
					message: i18n.baseText('folders.move.success.message', {
						interpolate: {
							folderName: payload.source.folder.name,
							newFolderName: payload.destination.parentFolder.name,
						},
					}),
					onClick: (event: MouseEvent | undefined) => {
						if (event?.target instanceof HTMLAnchorElement) {
							event.preventDefault();
							void router.push(newFolderURL);
						}
					},
					type: 'success',
				});
			} else {
				toast.showToast({
					title: i18n.baseText('folders.move.success.title'),
					message: i18n.baseText('folders.move.success.messageNoAccess', {
						interpolate: {
							folderName: payload.source.folder.name,
							newFolderName: payload.destination.parentFolder.name,
						},
					}),
					type: 'success',
				});
			}
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.move.error.title'));
	}
};

const moveWorkflowToFolder = async (payload: {
	id: string;
	name: string;
	parentFolderId?: string;
	sharedWithProjects?: ProjectSharingData[];
}) => {
	if (showRegisteredCommunityCTA.value) {
		uiStore.openModalWithData({
			name: COMMUNITY_PLUS_ENROLLMENT_MODAL,
			data: { customHeading: i18n.baseText('folders.registeredCommunity.cta.heading') },
		});
		return;
	}
	uiStore.openMoveToFolderModal(
		'workflow',
		{
			id: payload.id,
			name: payload.name,
			parentFolderId: payload.parentFolderId,
			sharedWithProjects: payload.sharedWithProjects,
		},
		workflowListEventBus,
	);
};

const onWorkflowTransferred = async (payload: {
	source: {
		projectId: string;
		workflow: { id: string; name: string };
	};
	destination: {
		projectId: string;
		parentFolder: { id: string | undefined; name: string };
		canAccess: boolean;
	};
	shareCredentials?: string[];
}) => {
	try {
		await projectsStore.moveResourceToProject(
			'workflow',
			payload.source.workflow.id,
			payload.destination.projectId,
			payload.destination.parentFolder.id,
			payload.shareCredentials,
		);

		await refreshWorkflows();

		if (payload.destination.canAccess) {
			toast.showToast({
				title: i18n.baseText('folders.move.workflow.success.title'),
				message: i18n.baseText('folders.move.workflow.success.message', {
					interpolate: {
						workflowName: payload.source.workflow.name,
						newFolderName: payload.destination.parentFolder.name,
					},
				}),
				onClick: (event: MouseEvent | undefined) => {
					if (event?.target instanceof HTMLAnchorElement) {
						event.preventDefault();
						void router.push({
							name: VIEWS.PROJECTS_FOLDERS,
							params: {
								projectId: payload.destination.projectId,
								folderId: payload.destination.parentFolder.id,
							},
						});
					}
				},
				type: 'success',
			});
		} else {
			toast.showToast({
				title: i18n.baseText('folders.move.workflow.success.title'),
				message: i18n.baseText('folders.move.workflow.success.messageNoAccess', {
					interpolate: {
						workflowName: payload.source.workflow.name,
						newFolderName: payload.destination.parentFolder.name,
					},
				}),
				type: 'success',
			});
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.move.workflow.error.title'));
	}
};

const onWorkflowMoved = async (payload: {
	workflow: { id: string; name: string; oldParentId: string };
	newParent: { id: string; name: string; type: 'folder' | 'project' };
	options?: {
		skipFetch?: boolean;
	};
}) => {
	if (!route.params.projectId) return;
	try {
		const newFolderURL = router.resolve({
			name: VIEWS.PROJECTS_FOLDERS,
			params: {
				projectId: route.params.projectId,
				folderId: payload.newParent.type === 'folder' ? payload.newParent.id : undefined,
			},
		}).href;
		const workflowResource = workflowsAndFolders.value.find(
			(resource): resource is WorkflowListItem => resource.id === payload.workflow.id,
		);
		await workflowsStore.updateWorkflow(payload.workflow.id, {
			parentFolderId: payload.newParent.type === 'folder' ? payload.newParent.id : '0',
			versionId: workflowResource?.versionId,
		});
		if (!payload.options?.skipFetch) {
			await fetchWorkflows();
		}
		toast.showToast({
			title: i18n.baseText('folders.move.workflow.success.title'),
			message: i18n.baseText('folders.move.workflow.success.message', {
				interpolate: {
					workflowName: payload.workflow.name,
					newFolderName: payload.newParent.name,
				},
			}),
			onClick: (event: MouseEvent | undefined) => {
				if (event?.target instanceof HTMLAnchorElement) {
					event.preventDefault();
					void router.push(newFolderURL);
				}
			},
			type: 'success',
		});
		telemetry.track('User moved content', {
			workflow_id: payload.workflow.id,
			source_folder_id: payload.workflow.oldParentId,
			destination_folder_id: payload.newParent.id,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('folders.move.workflow.error.title'));
	}
};

const onCreateWorkflowClick = () => {
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: {
			projectId: currentProject.value?.id,
			parentFolderId: route.params.folderId as string,
		},
	});
};

const renameInput = useTemplateRef('renameInput');
function onNameToggle() {
	setTimeout(() => {
		if (renameInput.value?.forceFocus) {
			renameInput.value.forceFocus();
		}
	}, 0);
}

const onNameSubmit = async (name: string) => {
	if (!currentFolder.value || !currentProject.value) return;

	const newName = name.trim();
	if (!newName) {
		toast.showMessage({
			title: i18n.baseText('renameAction.emptyName.title'),
			message: i18n.baseText('renameAction.emptyName.message'),
			type: 'error',
		});

		return;
	}

	if (newName === currentFolder.value.name) {
		renameInput.value?.forceCancel();
		return;
	}

	const validationResult = folderHelpers.validateFolderName(newName);
	if (typeof validationResult === 'string') {
		toast.showMessage({
			title: i18n.baseText('renameAction.invalidName.title'),
			message: validationResult,
			type: 'error',
		});
		renameInput.value?.forceCancel();
		return;
	} else {
		try {
			await foldersStore.renameFolder(currentProject.value?.id, currentFolder.value.id, newName);
			foldersStore.breadcrumbsCache[currentFolder.value.id].name = newName;
			toast.showMessage({
				title: i18n.baseText('folders.rename.success.message', {
					interpolate: { folderName: newName },
				}),
				type: 'success',
			});
			telemetry.track('User renamed folder', {
				folder_id: currentFolder.value.id,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('folders.rename.error.title'));
			renameInput.value?.forceCancel();
		}
	}
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
		:has-empty-state="foldersStore.totalWorkflowCount === 0 && !currentFolderId"
		@click:add="addWorkflow"
		@update:search="onSearchUpdated"
		@update:filters="onFiltersUpdated"
		@update:pagination-and-sort="setPaginationAndSort"
		@mouseleave="folderHelpers.resetDropTarget"
	>
		<template #header>
			<ProjectHeader @create-folder="createFolderInCurrent">
				<InsightsSummary
					v-if="projectPages.isOverviewSubPage && insightsStore.isSummaryEnabled"
					:loading="insightsStore.weeklySummary.isLoading"
					:summary="insightsStore.weeklySummary.state"
					time-range="week"
				/>
			</ProjectHeader>
		</template>
		<template v-if="foldersEnabled || showRegisteredCommunityCTA" #add-button>
			<N8nTooltip
				placement="top"
				:disabled="
					!(
						projectPages.isOverviewSubPage ||
						projectPages.isSharedSubPage ||
						(!readOnlyEnv && hasPermissionToCreateFolders)
					)
				"
			>
				<template #content>
					<span
						v-if="
							(projectPages.isOverviewSubPage || projectPages.isSharedSubPage) &&
							!showRegisteredCommunityCTA
						"
					>
						<span v-if="teamProjectsEnabled">
							{{ i18n.baseText('folders.add.overview.withProjects.message') }}
						</span>
						<span v-else>
							{{ i18n.baseText('folders.add.overview.community.message') }}
						</span>
					</span>
					<span v-else>
						{{
							currentParentName
								? i18n.baseText('folders.add.to.parent.message', {
										interpolate: { parent: currentParentName },
									})
								: i18n.baseText('folders.add.here.message')
						}}
					</span>
				</template>
				<N8nButton
					size="small"
					icon="folder-plus"
					type="tertiary"
					data-test-id="add-folder-button"
					:class="$style['add-folder-button']"
					:disabled="!showRegisteredCommunityCTA && (readOnlyEnv || !hasPermissionToCreateFolders)"
					@click="createFolderInCurrent"
				/>
			</N8nTooltip>
		</template>
		<template #callout>
			<N8nCallout
				v-if="showAIStarterCollectionCallout"
				theme="secondary"
				icon="gift"
				:class="$style['easy-ai-workflow-callout']"
			>
				{{ i18n.baseText('workflows.ai.starter.collection.callout') }}
				<template #trailingContent>
					<div :class="$style['callout-trailing-content']">
						<N8nButton
							data-test-id="easy-ai-button"
							size="small"
							type="secondary"
							@click="createAIStarterWorkflows('callout')"
						>
							{{ i18n.baseText('generic.startNow') }}
						</N8nButton>
						<N8nIcon
							size="small"
							icon="x"
							:title="i18n.baseText('generic.dismiss')"
							class="clickable"
							@click="dismissStarterCollectionCallout"
						/>
					</div>
				</template>
			</N8nCallout>
			<N8nCallout
				v-else-if="!loading && showEasyAIWorkflowCallout && easyAICalloutVisible"
				theme="secondary"
				icon="bot"
				:class="$style['easy-ai-workflow-callout']"
			>
				{{ i18n.baseText('workflows.list.easyAI') }}
				<template #trailingContent>
					<div :class="$style['callout-trailing-content']">
						<N8nButton
							data-test-id="easy-ai-button"
							size="small"
							type="secondary"
							@click="openAIWorkflow('callout')"
						>
							{{ i18n.baseText('generic.tryNow') }}
						</N8nButton>
						<N8nIcon
							size="small"
							icon="x"
							:title="i18n.baseText('generic.dismiss')"
							class="clickable"
							@click="dismissEasyAICallout"
						/>
					</div>
				</template>
			</N8nCallout>
			<SuggestedWorkflows v-if="experimentalShowSuggestedWorkflows">
				<SuggestedWorkflowCard
					v-for="workflow in templatesStore.experimentalSuggestedWorkflows"
					:key="workflow.id"
					data-test-id="resource-list-item-suggested-workflow"
					:data="{
						id: workflow.id,
						name: workflow.name,
					}"
				/>
			</SuggestedWorkflows>
		</template>
		<template #breadcrumbs>
			<div v-if="breadcrumbsLoading" :class="$style['breadcrumbs-loading']">
				<n8n-loading :loading="breadcrumbsLoading" :rows="1" variant="p" />
			</div>
			<div
				v-else-if="showFolders && currentFolder"
				:class="$style['breadcrumbs-container']"
				data-test-id="main-breadcrumbs"
			>
				<FolderBreadcrumbs
					:current-folder="currentFolderParent"
					:actions="mainBreadcrumbsActions"
					:hidden-items-trigger="isDragging ? 'hover' : 'click'"
					:current-folder-as-link="true"
					@item-selected="onBreadcrumbItemClick"
					@action="onBreadCrumbsAction"
					@item-drop="onBreadCrumbsItemDrop"
					@project-drop="moveFolderToProjectRoot"
				>
					<template #append>
						<span :class="$style['path-separator']">/</span>
						<N8nInlineTextEdit
							ref="renameInput"
							:key="currentFolder?.id"
							data-test-id="breadcrumbs-item-current"
							:placeholder="i18n.baseText('folders.rename.placeholder')"
							:model-value="currentFolder.name"
							:max-length="30"
							:read-only="readOnlyEnv || !hasPermissionToUpdateFolders"
							:class="{ [$style.name]: true, [$style['pointer-disabled']]: isDragging }"
							@update:model-value="onNameSubmit"
						/>
					</template>
				</FolderBreadcrumbs>
			</div>
		</template>
		<template #item="{ item: data, index }">
			<Draggable
				v-if="(data as FolderResource | WorkflowResource).resourceType === 'folder'"
				:key="`folder-${index}`"
				:disabled="!isDragNDropEnabled"
				type="move"
				target-data-key="folder"
				@dragstart="folderHelpers.onDragStart"
				@dragend="folderHelpers.onDragEnd"
			>
				<template #preview>
					<N8nCard>
						<N8nText tag="h2" bold>
							{{ (data as FolderResource).name }}
						</N8nText>
					</N8nCard>
				</template>
				<FolderCard
					:data="data as FolderResource"
					:actions="folderCardActions"
					:read-only="
						readOnlyEnv || (!hasPermissionToDeleteFolders && !hasPermissionToCreateFolders)
					"
					:personal-project="personalProject"
					:data-resourceid="(data as FolderResource).id"
					:data-resourcename="(data as FolderResource).name"
					:class="{
						['mb-2xs']: true,
						[$style['drag-active']]: isDragging,
						[$style.dragging]:
							foldersStore.draggedElement?.type === 'folder' &&
							foldersStore.draggedElement?.id === (data as FolderResource).id,
						[$style['drop-active']]:
							foldersStore.activeDropTarget?.id === (data as FolderResource).id,
					}"
					:show-ownership-badge="showCardsBadge"
					data-target="folder"
					class="mb-2xs"
					@action="onFolderCardAction"
					@mouseenter="folderHelpers.onDragEnter"
					@mouseup="onFolderCardDrop"
				/>
			</Draggable>
			<Draggable
				v-else
				:key="`workflow-${index}`"
				:disabled="!isDragNDropEnabled"
				type="move"
				target-data-key="workflow"
				@dragstart="folderHelpers.onDragStart"
				@dragend="folderHelpers.onDragEnd"
			>
				<template #preview>
					<N8nCard>
						<N8nText tag="h2" bold>
							{{ (data as WorkflowResource).name }}
						</N8nText>
					</N8nCard>
				</template>
				<WorkflowCard
					data-test-id="resources-list-item-workflow"
					:class="{
						['mb-2xs']: true,
						[$style['drag-active']]: isDragging,
						[$style.dragging]:
							foldersStore.draggedElement?.type === 'workflow' &&
							foldersStore.draggedElement?.id === (data as WorkflowResource).id,
					}"
					:data="data as WorkflowResource"
					:workflow-list-event-bus="workflowListEventBus"
					:read-only="readOnlyEnv"
					:data-resourceid="(data as WorkflowResource).id"
					:data-resourcename="(data as WorkflowResource).name"
					:show-ownership-badge="showCardsBadge"
					data-target="workflow"
					@click:tag="onClickTag"
					@workflow:deleted="refreshWorkflows"
					@workflow:archived="refreshWorkflows"
					@workflow:unarchived="refreshWorkflows"
					@workflow:moved="fetchWorkflows"
					@workflow:duplicated="fetchWorkflows"
					@workflow:active-toggle="onWorkflowActiveToggle"
					@action:move-to-folder="moveWorkflowToFolder"
					@mouseenter="isDragging ? folderHelpers.resetDropTarget() : {}"
				/>
			</Draggable>
		</template>
		<template #empty>
			<EmptySharedSectionActionBox
				v-if="projectPages.isSharedSubPage && personalProject"
				:personal-project="personalProject"
				resource-type="workflows"
			/>
			<div v-else>
				<div class="text-center mt-s" data-test-id="list-empty-state">
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
						<div :class="$style.emptyStateCardContent">
							<N8nIcon
								:class="$style.emptyStateCardIcon"
								icon="file"
								color="foreground-dark"
								:stroke-width="1.5"
							/>
							<N8nText size="large" class="mt-xs">
								{{ i18n.baseText('workflows.empty.startFromScratch') }}
							</N8nText>
						</div>
					</N8nCard>
					<N8nCard
						v-if="showAIStarterCollectionCallout"
						:class="$style.emptyStateCard"
						hoverable
						data-test-id="easy-ai-workflow-card"
						@click="createAIStarterWorkflows('card')"
					>
						<div :class="$style.emptyStateCardContent">
							<N8nIcon
								:class="$style.emptyStateCardIcon"
								:stroke-width="1.5"
								icon="gift"
								color="foreground-dark"
							/>
							<N8nText size="large" class="mt-xs pl-2xs pr-2xs">
								{{ i18n.baseText('workflows.ai.starter.collection.card') }}
							</N8nText>
						</div>
					</N8nCard>
					<N8nCard
						v-else-if="showEasyAIWorkflowCallout"
						:class="$style.emptyStateCard"
						hoverable
						data-test-id="easy-ai-workflow-card"
						@click="openAIWorkflow('empty')"
					>
						<div :class="$style.emptyStateCardContent">
							<N8nIcon
								:class="$style.emptyStateCardIcon"
								:stroke-width="1.5"
								icon="bot"
								color="foreground-dark"
							/>
							<N8nText size="large" class="mt-xs pl-2xs pr-2xs">
								{{ i18n.baseText('workflows.empty.easyAI') }}
							</N8nText>
						</div>
					</N8nCard>
					<N8nCard
						v-if="templatesCardEnabled"
						:class="$style.emptyStateCard"
						hoverable
						data-test-id="new-workflow-from-template-card"
						@click="openTemplatesRepository"
					>
						<div :class="$style.emptyStateCardContent">
							<N8nIcon
								:class="$style.emptyStateCardIcon"
								:stroke-width="1.5"
								icon="package-open"
								color="foreground-dark"
							/>
							<N8nText size="large" class="mt-xs pl-2xs pr-2xs">
								{{ i18n.baseText('workflows.empty.startWithTemplate') }}
							</N8nText>
						</div>
					</N8nCard>
				</div>
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
			<div class="mb-s">
				<N8nCheckbox
					:label="i18n.baseText('workflows.filters.showArchived')"
					:model-value="filters.showArchived || false"
					data-test-id="show-archived-checkbox"
					@update:model-value="setKeyValue('showArchived', $event)"
				/>
			</div>
		</template>
		<template #postamble>
			<!-- Empty states for shared section and folders -->
			<div
				v-if="workflowsAndFolders.length === 0 && !hasFilters"
				:class="$style['empty-folder-container']"
				data-test-id="empty-folder-container"
			>
				<EmptySharedSectionActionBox
					v-if="projectPages.isSharedSubPage && personalProject"
					:personal-project="personalProject"
					resource-type="workflows"
				/>
				<N8nActionBox
					v-else-if="currentFolder"
					data-test-id="empty-folder-action-box"
					:heading="
						i18n.baseText('folders.empty.actionbox.title', {
							interpolate: { folderName: currentFolder.name },
						})
					"
					:button-text="i18n.baseText('generic.create.workflow')"
					button-type="secondary"
					:button-disabled="readOnlyEnv || !projectPermissions.workflow.create"
					@click:button="onCreateWorkflowClick"
				>
					<template #disabledButtonTooltip>
						{{
							readOnlyEnv
								? i18n.baseText('readOnlyEnv.cantAdd.workflow')
								: i18n.baseText('generic.missing.permissions')
						}}
					</template></N8nActionBox
				>
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

.emptyStateCardContent {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.emptyStateCardIcon {
	font-size: 48px;

	svg {
		transition: color 0.3s ease;
	}
}

.add-folder-button {
	width: 30px;
	height: 30px;
}

.breadcrumbs-container {
	display: flex;
	align-items: center;
	align-self: flex-end;
}

.breadcrumbs-loading {
	:global(.el-skeleton__item) {
		margin: 0;
		height: 40px;
		width: 400px;
	}
}

.empty-folder-container {
	button {
		margin-top: var(--spacing-2xs);
	}
}

.drag-active *,
.drag-active :global(.action-toggle) {
	cursor: grabbing !important;
}

.dragging {
	transition: opacity 0.3s ease;
	opacity: 0.3;
	border-style: dashed;
	pointer-events: none;
}

.drop-active {
	:global(.card) {
		border-color: var(--color-secondary);
		background-color: var(--color-callout-secondary-background);
	}
}

.path-separator {
	font-size: var(--font-size-xl);
	color: var(--color-foreground-base);
	padding: var(--spacing-3xs) var(--spacing-4xs) var(--spacing-4xs);
}

.name {
	color: $custom-font-dark;
	font-size: var(--font-size-s);
	padding: var(--spacing-3xs) var(--spacing-4xs) var(--spacing-4xs);
}

.pointer-disabled {
	pointer-events: none;
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
