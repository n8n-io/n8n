<script lang="ts" setup>
import ProjectCardBadge from '@/features/collaboration/projects/components/ProjectCardBadge.vue';
import { useLoadingService } from '@/app/composables/useLoadingService';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import { SOURCE_CONTROL_PUSH_MODAL_KEY } from '../sourceControl.constants';
import type { WorkflowResource } from '@/Interface';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '../sourceControl.store';
import { useUsersStore } from '@/features/settings/users/users.store';
import type {
	ProjectListItem,
	ProjectSharingData,
} from '@/features/collaboration/projects/projects.types';
import { ResourceType } from '@/features/collaboration/projects/projects.utils';
import { useRevealWorkflowInScroller } from '../composables/useRevealWorkflowInScroller';
import { useSourceControlFileList } from '../composables/useSourceControlFileList';
import { useWorkflowTreeRows } from '../composables/useWorkflowTreeRows';
import {
	buildFolderFilterOptions,
	formatSourceControlUpdatedAt,
	getPushPriorityByStatus,
	getStatusText,
	getStatusTheme,
} from '../sourceControl.utils';
import type { SourceControlTreeRow } from '../sourceControl.types';
import type { SourceControlledFile, SourceControlledFileStatus } from '@n8n/api-types';
import {
	ROLE,
	SOURCE_CONTROL_FILE_LOCATION,
	SOURCE_CONTROL_FILE_STATUS,
	SOURCE_CONTROL_FILE_TYPE,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { refDebounced, useStorage } from '@vueuse/core';
import { computed, onBeforeMount, onMounted, reactive, ref, toRaw, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from '@/app/components/Modal.vue';
import ProjectSharing from '@/features/collaboration/projects/components/ProjectSharing.vue';
import { useAvailableProjectSearch } from '@/features/collaboration/projects/projects.utils';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nNotice,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
const props = defineProps<{
	data: { eventBus: EventBus; status?: SourceControlledFile[] };
}>();

const loadingService = useLoadingService();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const projectsStore = useProjectsStore();
const route = useRoute();
const router = useRouter();
const telemetry = useTelemetry();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();

const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);

// Reactive status state - starts with props data or empty, then loads fresh data
const status = ref<SourceControlledFile[]>(props.data.status ?? []);
const isLoading = ref(false);

// Load fresh source control status when modal opens
async function loadSourceControlStatus() {
	if (isLoading.value) return;

	isLoading.value = true;
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));

	try {
		const freshStatus = await sourceControlStore.getAggregatedStatus();

		if (!freshStatus.length) {
			toast.showMessage({
				title: 'No changes to commit',
				message: 'Everything is up to date',
				type: 'info',
			});
			// Close modal since there's nothing to show
			close();
			return;
		}

		status.value = freshStatus;

		// Auto-select all credentials and data tables by default (only once on load)
		freshStatus.forEach((file) => {
			if (file.type === 'credential') {
				selectedCredentials.add(file.id);
			}
			if (file.type === 'datatable') {
				selectedDataTables.add(file.id);
			}
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
		close();
	} finally {
		loadingService.stopLoading();
		loadingService.setLoadingText(i18n.baseText('genericHelpers.loading'));
		isLoading.value = false;
	}
}

const projectAdminCalloutDismissed = useStorage(
	'SOURCE_CONTROL_PROJECT_ADMIN_CALLOUT_DISMISSED',
	false,
	localStorage,
);

const searchFnForFilters = useAvailableProjectSearch();
const filterFnForFilters = (project: ProjectListItem) =>
	!project.role || project.role === 'project:admin';

onBeforeMount(async () => {
	// Load projects for file→project mapping display and for member search
	await projectsStore.getAvailableProjects();
});

const concatenateWithAnd = (messages: string[]) =>
	new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages);

type SourceControlledFileWithProject = SourceControlledFile & {
	project?: ProjectListItem;
};
type Changes = {
	tags: SourceControlledFileWithProject[];
	variables: SourceControlledFileWithProject[];
	datatable: SourceControlledFileWithProject[];
	credential: SourceControlledFileWithProject[];
	workflow: SourceControlledFileWithProject[];
	currentWorkflow?: SourceControlledFileWithProject;
	folders: SourceControlledFileWithProject[];
	projects: SourceControlledFileWithProject[];
};

const classifyFilesByType = (files: SourceControlledFile[], currentWorkflowId?: string): Changes =>
	files.reduce<Changes>(
		(acc, file) => {
			const project = projectsStore.availableProjects.find(
				({ id }) => id === file.owner?.projectId,
			);

			// do not show remote workflows that are not yet created locally during push
			if (
				file.location === SOURCE_CONTROL_FILE_LOCATION.remote &&
				file.type === SOURCE_CONTROL_FILE_TYPE.workflow &&
				file.status === SOURCE_CONTROL_FILE_STATUS.created
			) {
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.variables) {
				acc.variables.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.datatable) {
				acc.datatable.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.tags) {
				acc.tags.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.folders) {
				acc.folders.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow && currentWorkflowId === file.id) {
				acc.currentWorkflow = { ...file, project };
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow) {
				acc.workflow.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.credential) {
				acc.credential.push({ ...file, project });
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.project) {
				acc.projects.push({ ...file, project });
				return acc;
			}

			return acc;
		},
		{
			tags: [],
			variables: [],
			datatable: [],
			credential: [],
			workflow: [],
			folders: [],
			projects: [],
			currentWorkflow: undefined,
		},
	);

const userNotices = computed(() => {
	const messages: Array<{ title: string; content: string }> = [];

	if (changes.value.variables.length) {
		messages.push({
			title: 'Variables',
			content: 'at least one new or modified',
		});
	}

	if (changes.value.tags.length) {
		messages.push({
			title: 'Tags',
			content: 'at least one new or modified',
		});
	}

	if (changes.value.folders.length) {
		messages.push({
			title: 'Folders',
			content: 'at least one new or modified',
		});
	}

	if (changes.value.projects.length) {
		messages.push({
			title: 'Projects',
			content: 'at least one new or modified',
		});
	}

	return messages;
});

const hasModifiedCredentialsSelected = computed(() => {
	return changes.value.credential.some(
		(credential) => selectedCredentials.has(credential.id) && credential.status === 'modified',
	);
});

const workflowId = computed(
	() =>
		([VIEWS.WORKFLOW].includes(route.name as VIEWS) && route.params.workflowId?.toString()) ||
		undefined,
);

const changes = computed(() => classifyFilesByType(status.value, workflowId.value));

const selectedWorkflows = reactive<Set<string>>(new Set());

const maybeSelectCurrentWorkflow = (workflow?: SourceControlledFileWithProject) =>
	workflow && selectedWorkflows.add(workflow.id);

const filters = ref<{
	status?: SourceControlledFileStatus;
	project: ProjectSharingData | null;
	folder?: string;
}>({
	project: null,
	folder: '',
});
const filtersApplied = computed(
	() => Boolean(search.value) || Boolean(Object.values(filters.value).filter(Boolean).length),
);
const resetFilters = () => {
	filters.value = { project: null, folder: '' };
	search.value = '';
};

function clearProjectFilter() {
	filters.value.project = null;
}

const statusFilterOptions: Array<{ label: string; value: SourceControlledFileStatus }> = [
	{
		label: 'New',
		value: SOURCE_CONTROL_FILE_STATUS.created,
	},
	{
		label: 'Modified',
		value: SOURCE_CONTROL_FILE_STATUS.modified,
	},
	{
		label: 'Deleted',
		value: SOURCE_CONTROL_FILE_STATUS.deleted,
	},
] as const;

const search = ref('');
const debouncedSearch = refDebounced(search, 250);

const filterCount = computed(() =>
	Object.values(filters.value).reduce((acc, item) => (item ? acc + 1 : acc), 0),
);

const folderFilterOptions = computed(() => buildFolderFilterOptions(changes.value.workflow));

const sortedWorkflows = useSourceControlFileList({
	files: computed(() => changes.value.workflow),
	sortBy: [
		({ folderPath }) => folderPath?.join('/') ?? '',
		({ status }) => getPushPriorityByStatus(status),
		'updatedAt',
	],
	sortOrder: ['asc', 'asc', 'desc'],
	filter: (workflow) => {
		const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
		const nameMatches = workflow.name.toLocaleLowerCase().includes(searchQuery);
		const folderPathMatches = (workflow.folderPath ?? []).some((segment) =>
			segment.toLocaleLowerCase().includes(searchQuery),
		);

		if (searchQuery && !nameMatches && !folderPathMatches) {
			return false;
		}

		if (filters.value.project && workflow.project?.id !== filters.value.project.id) {
			return false;
		}

		if (filters.value.status && filters.value.status !== workflow.status) {
			return false;
		}

		const folderFilter = filters.value.folder?.trim();
		if (!folderFilter) {
			return true;
		}

		const workflowPath = (workflow.folderPath ?? []).join('/');
		return workflowPath === folderFilter || workflowPath.startsWith(`${folderFilter}/`);
	},
});

const activeTab = ref<
	| typeof SOURCE_CONTROL_FILE_TYPE.workflow
	| typeof SOURCE_CONTROL_FILE_TYPE.credential
	| typeof SOURCE_CONTROL_FILE_TYPE.datatable
>(SOURCE_CONTROL_FILE_TYPE.workflow);

const workflowScroller = ref<{ scrollToItem: (index: number) => void; $el?: Element } | null>(null);

const {
	workflowTreeRows,
	visibleWorkflowRows,
	isFolderCollapsed,
	toggleFolderCollapse,
	expandFolders,
	getAncestorFolderIdsForWorkflow,
} = useWorkflowTreeRows(sortedWorkflows);

const { revealAndScrollToCurrentWorkflow } = useRevealWorkflowInScroller({
	visibleWorkflowRows,
	workflowScroller,
	activeTab,
	workflowTabValue: SOURCE_CONTROL_FILE_TYPE.workflow,
	currentWorkflowId: computed(() => changes.value.currentWorkflow?.id),
	isLoading,
	expandAncestorFolders: (workflowId) => {
		expandFolders(getAncestorFolderIdsForWorkflow(workflowId));
	},
});

const folderChildrenMap = computed(() => {
	const childrenByFolderId = new Map<string, string[]>();
	const rows = workflowTreeRows.value;

	for (const [index, row] of rows.entries()) {
		if (row.type !== 'folder') {
			continue;
		}

		const childWorkflowIds: string[] = [];
		for (let next = index + 1; next < rows.length; next++) {
			const candidate = rows[next];

			if (candidate.depth <= row.depth) {
				break;
			}

			if (candidate.type === 'file') {
				childWorkflowIds.push(candidate.file.id);
			}
		}

		childrenByFolderId.set(row.id, childWorkflowIds);
	}

	return childrenByFolderId;
});

const selectedCredentials = reactive<Set<string>>(new Set());

const selectedDataTables = reactive<Set<string>>(new Set());

const sortedCredentials = useSourceControlFileList({
	files: computed(() => changes.value.credential),
	sortBy: [({ status }) => getPushPriorityByStatus(status), 'updatedAt'],
	sortOrder: ['asc', 'desc'],
	filter: (credential) => {
		const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
		if (searchQuery && !credential.name.toLocaleLowerCase().includes(searchQuery)) {
			return false;
		}

		if (filters.value.project && credential.project?.id !== filters.value.project.id) {
			return false;
		}

		if (filters.value.status && filters.value.status !== credential.status) {
			return false;
		}

		return true;
	},
});

const sortedDataTables = useSourceControlFileList({
	files: computed(() => changes.value.datatable),
	sortBy: [({ status }) => getPushPriorityByStatus(status), 'updatedAt'],
	sortOrder: ['asc', 'desc'],
	filter: (dataTable) => {
		const searchQuery = debouncedSearch.value.toLocaleLowerCase().trim();
		if (searchQuery && !dataTable.name.toLocaleLowerCase().includes(searchQuery)) {
			return false;
		}

		if (filters.value.project && dataTable.project?.id !== filters.value.project.id) {
			return false;
		}

		if (filters.value.status && filters.value.status !== dataTable.status) {
			return false;
		}

		return true;
	},
});

const commitMessage = ref('');
const isSubmitDisabled = computed(() => {
	if (!commitMessage.value.trim()) {
		return true;
	}

	const toBePushed =
		selectedCredentials.size +
		selectedDataTables.size +
		changes.value.tags.length +
		changes.value.variables.length +
		changes.value.folders.length +
		changes.value.projects.length +
		selectedWorkflows.size;

	return toBePushed <= 0;
});

const selectAllIndeterminate = computed(() => {
	if (!activeSelection.value.size) {
		return false;
	}

	const selectedVisibleItems = toRaw(activeSelection.value).intersection(
		new Set(activeDataSourceFiltered.value.map(({ id }) => id)),
	);

	if (selectedVisibleItems.size === 0) {
		return false;
	}

	return !allVisibleItemsSelected.value;
});

const selectedCount = computed(
	() => selectedWorkflows.size + selectedCredentials.size + selectedDataTables.size,
);

function onToggleSelectAll() {
	if (allVisibleItemsSelected.value) {
		const diff = toRaw(activeSelection.value).difference(
			new Set(activeDataSourceFiltered.value.map(({ id }) => id)),
		);

		activeSelection.value.clear();
		diff.forEach((id) => activeSelection.value.add(id));
	} else {
		activeDataSourceFiltered.value.forEach((file) => activeSelection.value.add(file.id));
	}
}

function close() {
	// Navigate back in history to maintain proper browser navigation
	// The useWorkflowDiffRouting composable will handle closing the modal
	router.back();
}

function renderUpdatedAt(file: SourceControlledFile) {
	return formatSourceControlUpdatedAt(file.updatedAt);
}

async function onCommitKeyDownEnter() {
	if (!isSubmitDisabled.value) {
		await commitAndPush();
	}
}

const successNotificationMessage = () => {
	const messages: string[] = [];

	if (selectedWorkflows.size) {
		messages.push(
			i18n.baseText('generic.workflow', {
				adjustToNumber: selectedWorkflows.size,
				interpolate: { count: selectedWorkflows.size },
			}),
		);
	}

	if (selectedCredentials.size) {
		messages.push(
			i18n.baseText('generic.credential', {
				adjustToNumber: selectedCredentials.size,
				interpolate: { count: selectedCredentials.size },
			}),
		);
	}

	if (changes.value.variables.length) {
		messages.push(i18n.baseText('generic.variable_plural'));
	}

	if (selectedDataTables.size) {
		messages.push(
			i18n.baseText('generic.datatable', {
				adjustToNumber: selectedDataTables.size,
				interpolate: { count: selectedDataTables.size },
			}),
		);
	}

	if (changes.value.folders.length) {
		messages.push(i18n.baseText('generic.folders_plural'));
	}

	if (changes.value.tags.length) {
		messages.push(i18n.baseText('generic.tag_plural'));
	}

	if (changes.value.projects.length) {
		messages.push(i18n.baseText('generic.projects'));
	}

	const totalCount =
		selectedWorkflows.size +
		selectedCredentials.size +
		changes.value.variables.length +
		selectedDataTables.size +
		changes.value.folders.length +
		changes.value.tags.length +
		changes.value.projects.length;

	return [
		concatenateWithAnd(messages),
		i18n.baseText('settings.sourceControl.modals.push.success.description', {
			adjustToNumber: totalCount,
		}),
	].join(' ');
};

async function commitAndPush() {
	const files = changes.value.tags
		.concat(changes.value.variables)
		.concat(changes.value.datatable.filter((file) => selectedDataTables.has(file.id)))
		.concat(changes.value.credential.filter((file) => selectedCredentials.has(file.id)))
		.concat(changes.value.folders)
		.concat(changes.value.projects)
		.concat(changes.value.workflow.filter((file) => selectedWorkflows.has(file.id)));
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.push'));
	close();

	try {
		await sourceControlStore.pushWorkfolder({
			force: true,
			commitMessage: commitMessage.value,
			fileNames: files,
		});

		toast.showToast({
			title: i18n.baseText('settings.sourceControl.modals.push.success.title'),
			message: successNotificationMessage(),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('error'));
	} finally {
		loadingService.stopLoading();
	}
}

const modalHeight = computed(() => (changes.value.workflow.length ? 'min(80vh, 850px)' : 'auto'));

watch(
	() => filters.value.status,
	(status) => {
		telemetry.track('User filtered by status in commit modal', { status });
	},
);
watch(refDebounced(search, 500), (term) => {
	telemetry.track('User searched workflows in commit modal', { search: term });
});

const allVisibleItemsSelected = computed(() => {
	if (!activeSelection.value.size) {
		return false;
	}

	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		const workflowsSet = new Set(sortedWorkflows.value.map(({ id }) => id));

		if (!workflowsSet.size) {
			return false;
		}
		const notSelectedVisibleItems = workflowsSet.difference(toRaw(activeSelection.value));

		return !notSelectedVisibleItems.size;
	}

	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		const credentialsSet = new Set(sortedCredentials.value.map(({ id }) => id));
		if (!credentialsSet.size) {
			return false;
		}
		const notSelectedVisibleItems = credentialsSet.difference(toRaw(activeSelection.value));

		return !notSelectedVisibleItems.size;
	}

	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
		const dataTablesSet = new Set(sortedDataTables.value.map(({ id }) => id));
		if (!dataTablesSet.size) {
			return false;
		}
		const notSelectedVisibleItems = dataTablesSet.difference(toRaw(activeSelection.value));

		return !notSelectedVisibleItems.size;
	}

	return false;
});

function toggleSelected(id: string) {
	if (activeSelection.value.has(id)) {
		activeSelection.value.delete(id);
	} else {
		activeSelection.value.add(id);
	}
}

function isFolderSelected(folderId: string) {
	const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
	if (!folderChildren.length) {
		return false;
	}

	return folderChildren.every((childId) => selectedWorkflows.has(childId));
}

function isFolderSelectionIndeterminate(folderId: string) {
	const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
	if (!folderChildren.length) {
		return false;
	}

	const selectedChildrenCount = folderChildren.filter((childId) =>
		selectedWorkflows.has(childId),
	).length;

	return selectedChildrenCount > 0 && selectedChildrenCount < folderChildren.length;
}

function toggleFolderSelection(folderId: string) {
	const folderChildren = folderChildrenMap.value.get(folderId) ?? [];
	if (!folderChildren.length) {
		return;
	}

	if (isFolderSelected(folderId)) {
		folderChildren.forEach((childId) => selectedWorkflows.delete(childId));
		return;
	}

	folderChildren.forEach((childId) => selectedWorkflows.add(childId));
}

const activeDataSource = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return changes.value.workflow;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return changes.value.credential;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
		return changes.value.datatable;
	}
	return [];
});

const activeDataSourceFiltered = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return sortedWorkflows.value;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return sortedCredentials.value;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
		return sortedDataTables.value;
	}
	return [];
});

const activeRows = computed<Array<SourceControlTreeRow<SourceControlledFileWithProject>>>(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return visibleWorkflowRows.value;
	}

	return activeDataSourceFiltered.value.map((file) => ({
		id: `file:${file.id}`,
		type: 'file' as const,
		file,
		depth: 0,
	}));
});

const activeEntityLocale = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return 'generic.workflows';
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return 'generic.credentials';
	}
	return 'generic.datatable';
});

const activeSelection = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return selectedWorkflows;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return selectedCredentials;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
		return selectedDataTables;
	}
	return new Set<string>();
});

const tabs = computed(() => {
	return [
		{
			label: 'Workflows',
			value: SOURCE_CONTROL_FILE_TYPE.workflow,
			selected: selectedWorkflows.size,
			total: changes.value.workflow.length,
		},
		{
			label: 'Credentials',
			value: SOURCE_CONTROL_FILE_TYPE.credential,
			selected: selectedCredentials.size,
			total: changes.value.credential.length,
		},
		{
			label: 'Data Tables',
			value: SOURCE_CONTROL_FILE_TYPE.datatable,
			selected: selectedDataTables.size,
			total: changes.value.datatable.length,
		},
	];
});

const filtersNoResultText = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return i18n.baseText('workflows.noResults');
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return i18n.baseText('credentials.noResults');
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.datatable) {
		return i18n.baseText('dataTables.noResults');
	}
	return i18n.baseText('workflows.noResults');
});

function castType(type: string): ResourceType {
	if (type === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return ResourceType.Workflow;
	}
	return ResourceType.Credential;
}

function castProject(project: ProjectListItem): WorkflowResource {
	// Create a properly typed object that satisfies WorkflowResource
	// This is a workaround for the ProjectCardBadge component expecting WorkflowResource
	const resource: WorkflowResource = {
		homeProject: project,
		id: '',
		name: '',
		active: false,
		activeVersionId: null,
		createdAt: '',
		updatedAt: '',
		isArchived: false,
		readOnly: false,
		resourceType: 'workflow',
		sharedWithProjects: [],
	};
	return resource;
}

function openDiffModal(id: string, workflowStatus: SourceControlledFileStatus) {
	telemetry.track('User clicks compare workflows', {
		workflow_id: id,
		context: 'source_control_push',
	});

	// Only update route - modal will be opened by route watcher
	void router.push({
		query: {
			...route.query,
			diff: id,
			workflowStatus,
			direction: 'push',
		},
	});
}

// Auto-select current workflow when it becomes available
watchEffect(() => {
	if (changes.value.currentWorkflow && !selectedWorkflows.has(changes.value.currentWorkflow.id)) {
		maybeSelectCurrentWorkflow(changes.value.currentWorkflow);
	}
});

watch(
	[
		() => changes.value.currentWorkflow?.id,
		() => activeTab.value,
		() => visibleWorkflowRows.value.length,
		() => workflowScroller.value,
		() => isLoading.value,
	],
	() => {
		void revealAndScrollToCurrentWorkflow();
	},
	{ immediate: true, flush: 'post' },
);

// Load data when modal opens
onMounted(async () => {
	// Always load fresh data to ensure workflow names are populated
	await loadSourceControlStatus();
});
</script>

<template>
	<Modal
		v-if="!isLoading"
		width="812px"
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PUSH_MODAL_KEY"
		:height="modalHeight"
		:custom-class="$style.sourceControlPush"
		:before-close="close"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.modals.push.title') }}
			</N8nHeading>

			<div
				v-if="changes.workflow.length || changes.credential.length || changes.datatable.length"
				:class="[$style.filtersRow]"
				class="mt-l"
			>
				<div :class="[$style.filters]">
					<N8nInput
						v-model="search"
						data-test-id="source-control-push-search"
						placeholder="Filter by title"
						clearable
						style="width: 234px"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<N8nPopover
						width="304px"
						:content-class="$style['popover-content']"
						style="align-self: normal"
						z-index="2000"
					>
						<template #trigger>
							<N8nButton
								variant="subtle"
								icon="funnel"
								:class="$style.filterButton"
								:active="Boolean(filterCount)"
								data-test-id="source-control-filter-dropdown"
							>
								<N8nBadge v-if="filterCount" theme="primary" class="mr-4xs">
									{{ filterCount }}
								</N8nBadge>
							</N8nButton>
						</template>
						<template #content>
							<N8nInputLabel
								:label="i18n.baseText('workflows.filters.status')"
								:bold="false"
								size="small"
								color="text-base"
								class="mb-3xs"
							/>
							<N8nSelect
								v-model="filters.status"
								data-test-id="source-control-status-filter"
								clearable
							>
								<N8nOption
									v-for="option in statusFilterOptions"
									:key="option.label"
									data-test-id="source-control-status-filter-option"
									v-bind="option"
								/>
							</N8nSelect>
							<N8nInputLabel
								:label="i18n.baseText('forms.resourceFiltersDropdown.owner')"
								:bold="false"
								size="small"
								color="text-base"
								class="mb-3xs mt-3xs"
							/>
							<ProjectSharing
								v-model="filters.project"
								data-test-id="source-control-push-modal-project-search"
								clearable
								:search-fn="searchFnForFilters"
								:filter-fn="filterFnForFilters"
								:placeholder="i18n.baseText('forms.resourceFiltersDropdown.owner.placeholder')"
								:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
								@clear="clearProjectFilter"
							/>
							<N8nInputLabel
								:label="i18n.baseText('generic.folder')"
								:bold="false"
								size="small"
								color="text-base"
								class="mb-3xs mt-3xs"
							/>
							<N8nSelect
								v-model="filters.folder"
								data-test-id="source-control-folder-filter"
								clearable
								filterable
								:placeholder="i18n.baseText('generic.folder')"
							>
								<N8nOption
									v-for="option in folderFilterOptions"
									:key="option.value"
									:label="option.label"
									:value="option.value"
								/>
							</N8nSelect>
							<div v-if="filterCount" class="mt-s">
								<N8nLink @click="resetFilters">
									{{ i18n.baseText('forms.resourceFiltersDropdown.reset') }}
								</N8nLink>
							</div>
						</template>
					</N8nPopover>
				</div>
			</div>
			<template v-if="usersStore.currentUser && usersStore.currentUser.role">
				<template
					v-if="
						usersStore.currentUser.role !== ROLE.Owner && usersStore.currentUser.role !== ROLE.Admin
					"
				>
					<N8nCallout v-if="!projectAdminCalloutDismissed" theme="secondary" class="mt-s">
						{{ i18n.baseText('settings.sourceControl.modals.push.projectAdmin.callout') }}
						<template #trailingContent>
							<N8nIcon
								icon="x"
								title="Dismiss"
								size="medium"
								type="secondary"
								@click="projectAdminCalloutDismissed = true"
							/>
						</template>
					</N8nCallout>
				</template>
			</template>
		</template>
		<template #content>
			<div style="display: flex; height: 100%">
				<div :class="$style.tabs">
					<template v-for="tab in tabs" :key="tab.value">
						<button
							type="button"
							:class="[$style.tab, { [$style.tabActive]: activeTab === tab.value }]"
							:data-test-id="`source-control-push-modal-tab-${tab.value}`"
							@click="activeTab = tab.value"
						>
							<div>{{ tab.label }}</div>
							<N8nText tag="div" color="text-light">
								{{ tab.selected }} / {{ tab.total }} selected
							</N8nText>
						</button>
					</template>
				</div>
				<div style="flex: 1">
					<div :class="[$style.table]">
						<div :class="[$style.tableHeader]">
							<N8nCheckbox
								:class="$style.selectAll"
								:indeterminate="selectAllIndeterminate"
								:model-value="allVisibleItemsSelected"
								data-test-id="source-control-push-modal-toggle-all"
								:disabled="activeDataSourceFiltered.length === 0"
								@update:model-value="onToggleSelectAll"
							>
								<template #label>
									<N8nText> Title </N8nText>
								</template>
							</N8nCheckbox>
							<N8nInfoTip
								v-if="filtersApplied"
								class="p-xs"
								:bold="false"
								:class="$style.filtersApplied"
							>
								{{
									i18n.baseText('settings.sourceControl.modals.push.filter', {
										interpolate: {
											count: `${activeDataSourceFiltered.length} / ${activeDataSource.length}`,
											entity: i18n.baseText(activeEntityLocale).toLowerCase(),
										},
									})
								}}
								<N8nLink
									size="small"
									data-test-id="source-control-filters-reset"
									@click="resetFilters"
								>
									{{ i18n.baseText('workflows.filters.active.reset') }}
								</N8nLink>
							</N8nInfoTip>
						</div>
						<div style="flex: 1; overflow: hidden">
							<N8nInfoTip v-if="!activeDataSourceFiltered.length" class="p-xs" :bold="false">
								{{ filtersNoResultText }}
							</N8nInfoTip>
							<DynamicScroller
								v-if="activeRows.length"
								ref="workflowScroller"
								:class="[$style.scroller]"
								:items="activeRows"
								:min-item-size="57"
								item-class="scrollerItem"
							>
								<template #default="{ item: row, active, index }">
									<DynamicScrollerItem
										:item="row"
										:active="active"
										:size-dependencies="[
											row.type,
											row.type === 'file' ? row.file.name : row.name,
											row.id,
											row.depth,
										]"
										:data-index="index"
									>
										<div
											v-if="row.type === 'folder'"
											:class="[
												$style.folderRow,
												{ [$style.rowNoBorder]: index === activeRows.length - 1 },
											]"
											:style="{ paddingLeft: `${16 + row.depth * 16}px` }"
										>
											<N8nCheckbox
												:class="$style.folderCheckbox"
												data-test-id="source-control-push-modal-folder-checkbox"
												:model-value="isFolderSelected(row.id)"
												:indeterminate="isFolderSelectionIndeterminate(row.id)"
												@update:model-value="toggleFolderSelection(row.id)"
											>
												<template #label>
													<div :class="$style.folderLabel">
														<N8nIcon icon="folder" color="text-light" size="small" />
														<N8nText tag="span" color="text-light">
															{{ row.name }}
														</N8nText>
														<button
															type="button"
															:class="$style.folderToggle"
															data-test-id="source-control-push-modal-folder-toggle"
															@click.stop.prevent="toggleFolderCollapse(row.id)"
															@mousedown.stop.prevent
															@mouseup.stop.prevent
															@pointerdown.stop.prevent
														>
															<N8nIcon
																:icon="isFolderCollapsed(row.id) ? 'chevron-right' : 'chevron-down'"
																color="text-light"
																size="small"
															/>
														</button>
													</div>
												</template>
											</N8nCheckbox>
										</div>
										<div
											v-else
											:class="[
												$style.fileRow,
												{ [$style.rowNoBorder]: index === activeRows.length - 1 },
											]"
											:style="{ paddingLeft: `${row.depth * 16}px` }"
											:data-workflow-id="
												row.file.type === SOURCE_CONTROL_FILE_TYPE.workflow
													? row.file.id
													: undefined
											"
										>
											<N8nCheckbox
												:class="[$style.listItem]"
												data-test-id="source-control-push-modal-file-checkbox"
												:model-value="activeSelection.has(row.file.id)"
												@update:model-value="toggleSelected(row.file.id)"
											>
												<template #label>
													<div :class="$style.listItemContent">
														<span>
															<N8nText
																tag="div"
																bold
																color="text-dark"
																:class="[$style.listItemName]"
															>
																{{ row.file.name || row.file.id }}
															</N8nText>
															<N8nText
																v-if="row.file.updatedAt"
																tag="p"
																class="mt-0"
																color="text-light"
																size="small"
															>
																{{ renderUpdatedAt(row.file) }}
															</N8nText>
														</span>
														<span :class="[$style.badges]">
															<N8nBadge
																v-if="
																	changes.currentWorkflow &&
																	row.file.id === changes.currentWorkflow.id
																"
																class="mr-2xs"
															>
																{{
																	i18n.baseText(
																		'settings.sourceControl.modals.push.currentWorkflow',
																	)
																}}
															</N8nBadge>
															<template
																v-if="
																	row.file.type === SOURCE_CONTROL_FILE_TYPE.workflow ||
																	row.file.type === SOURCE_CONTROL_FILE_TYPE.credential ||
																	row.file.type === SOURCE_CONTROL_FILE_TYPE.datatable
																"
															>
																<ProjectCardBadge
																	v-if="row.file.project"
																	data-test-id="source-control-push-modal-project-badge"
																	:resource="castProject(row.file.project)"
																	:resource-type="castType(row.file.type)"
																	:resource-type-label="
																		i18n.baseText(`generic.${row.file.type}`).toLowerCase()
																	"
																	:personal-project="projectsStore.personalProject"
																	:show-badge-border="false"
																/>
															</template>
															<N8nBadge
																:theme="getStatusTheme(row.file.status)"
																style="height: 25px"
															>
																{{ getStatusText(row.file.status) }}
															</N8nBadge>
															<template v-if="isWorkflowDiffsEnabled">
																<N8nTooltip
																	v-if="row.file.type === SOURCE_CONTROL_FILE_TYPE.workflow"
																	:content="i18n.baseText('workflowDiff.compare')"
																	placement="top"
																>
																	<N8nIconButton
																		variant="subtle"
																		data-test-id="source-control-workflow-diff-button"
																		icon="file-diff"
																		@click="openDiffModal(row.file.id, row.file.status)"
																	/>
																</N8nTooltip>
															</template>
														</span>
													</div>
												</template>
											</N8nCheckbox>
										</div>
									</DynamicScrollerItem>
								</template>
							</DynamicScroller>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nNotice
				v-if="userNotices.length || hasModifiedCredentialsSelected"
				id="source-control-push-modal-notice"
				:compact="false"
				class="mt-0"
			>
				<template v-if="userNotices.length">
					<N8nText bold size="medium">Changes to variables, tags, folders and projects </N8nText>
					<br />
					<template v-for="{ title, content } in userNotices" :key="title">
						<N8nText bold size="small"> {{ title }}</N8nText>
						<N8nText size="small">: {{ content }}. </N8nText>
					</template>
					<br v-if="hasModifiedCredentialsSelected" />
				</template>

				<N8nText v-if="hasModifiedCredentialsSelected" size="small">
					{{ i18n.baseText('settings.sourceControl.modals.push.modifiedCredentialsNotice') }}
				</N8nText>
			</N8nNotice>

			<N8nText bold tag="p">
				{{ i18n.baseText('settings.sourceControl.modals.push.commitMessage') }}
			</N8nText>

			<div :class="$style.footer">
				<N8nInput
					v-model="commitMessage"
					class="mr-2xs"
					data-test-id="source-control-push-modal-commit"
					:placeholder="
						i18n.baseText('settings.sourceControl.modals.push.commitMessage.placeholder')
					"
					@keydown.enter.stop="onCommitKeyDownEnter"
				/>
				<N8nButton
					variant="solid"
					data-test-id="source-control-push-modal-submit"
					:disabled="isSubmitDisabled"
					size="large"
					@click="commitAndPush"
				>
					{{ i18n.baseText('settings.sourceControl.modals.push.buttons.save') }}
					{{ selectedCount ? `(${selectedCount})` : undefined }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.filterButton {
	align-self: stretch;
	height: auto;
}

.filtersRow {
	display: flex;
	align-items: center;
	gap: 8px;
	justify-content: space-between;
}

.filters {
	display: flex;
	align-items: center;
	gap: 8px;
}

.selectAll {
	flex-shrink: 0;
	margin-bottom: 0;
	padding: 10px 16px;
}

.filtersApplied {
	border-top: var(--border);
}

.scroller {
	max-height: 100%;
	scrollbar-color: var(--color--foreground) transparent;
	outline: var(--border);
}

.listItem {
	align-items: center;
	padding: 10px 16px;
	margin: 0;
	border-bottom: 0;
	width: 100%;

	.listItemContent {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.listItemName {
		line-clamp: 2;
		-webkit-line-clamp: 2;
		text-overflow: ellipsis;
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		word-wrap: break-word; /* Important for long words! */
	}
}

.folderRow {
	display: flex;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-bottom: var(--border);
}

.folderCheckbox {
	display: flex;
	align-items: center;
	width: 100%;
	margin-bottom: 0;
}

.folderToggle {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border: 0;
	background: transparent;
	padding: 0;
	margin-left: var(--spacing--4xs);
	cursor: pointer;
}

.folderLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.fileRow {
	box-sizing: border-box;
	width: 100%;
	border-bottom: var(--border);
}

.rowNoBorder {
	border-bottom: 0;
}

.badges {
	display: flex;
	gap: 10px;
	align-items: center;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	margin-top: 8px;
}

.sourceControlPush {
	&:global(.el-dialog) {
		margin: 0;
	}

	:global(.el-dialog__header) {
		padding-bottom: var(--spacing--xs);
	}
}

.table {
	height: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	border: var(--border);
	border-top-right-radius: 8px;
	border-bottom-right-radius: 8px;
}

.tableHeader {
	border-bottom: var(--border);
	display: flex;
	flex-direction: column;
}

.tabs {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 165px;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-right: 0;
	border-top-left-radius: 8px;
	border-bottom-left-radius: 8px;
}

.tab {
	color: var(--color--text);
	background-color: transparent;
	border: 1px solid transparent;
	padding: var(--spacing--2xs);
	cursor: pointer;
	border-radius: 4px;
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 2px;
	&:hover {
		border-color: var(--color--background);
	}
}

.tabActive {
	background-color: var(--color--background);
	color: var(--color--text--shade-1);
}

.popover-content {
	padding: var(--spacing--sm);
}
</style>
