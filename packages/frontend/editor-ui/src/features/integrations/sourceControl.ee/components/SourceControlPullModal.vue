<script lang="ts" setup>
import { useLoadingService } from '@/app/composables/useLoadingService';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { VIEWS } from '@/app/constants';
import {
	SOURCE_CONTROL_PULL_MODAL_KEY,
	SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
} from '../sourceControl.constants';
import { sourceControlEventBus } from '../sourceControl.eventBus';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useSourceControlStore } from '../sourceControl.store';
import type { ProjectListItem } from '@/features/collaboration/projects/projects.types';
import {
	getPullPriorityByStatus,
	getStatusText,
	getStatusTheme,
	notifyUserAboutPullWorkFolderOutcome,
} from '../sourceControl.utils';
import { useUIStore } from '@/app/stores/ui.store';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_TYPE } from '@n8n/api-types';
import { shouldAutoPublishWorkflow, type AutoPublishMode } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import dateformat from 'dateformat';
import orderBy from 'lodash/orderBy';
import { computed, onBeforeMount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from '@/app/components/Modal.vue';
import type { PackageProjectPreview } from '../sourceControl.api';

import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIconButton,
	N8nInfoTip,
	N8nLink,
	N8nLoading,
	N8nNotice,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
type SourceControlledFileType = SourceControlledFile['type'];
type SourceControlledFileWithProject = SourceControlledFile & {
	project?: ProjectListItem;
	willBeAutoPublished?: boolean;
};

const props = defineProps<{
	data: { eventBus: EventBus; status?: SourceControlledFile[] };
}>();

const telemetry = useTelemetry();
const loadingService = useLoadingService();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const projectsStore = useProjectsStore();
const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);

// Project-scoped import mode detection
const activeProjectId = computed(() => projectsStore.currentProjectId);
const isProjectScoped = computed(
	() => !!activeProjectId.value && activeProjectId.value !== projectsStore.personalProject?.id,
);
const activeProjectName = computed(() => {
	if (!activeProjectId.value) return '';
	const project = projectsStore.availableProjects.find((p) => p.id === activeProjectId.value);
	return project?.name ?? '';
});
const isPackageImporting = ref(false);

// Package preview state
const packagePreview = ref<PackageProjectPreview[]>([]);
const isLoadingPreview = ref(false);
const previewError = ref('');
const selectedProjectId = ref<string | null>(null);

const selectedProject = computed(() =>
	packagePreview.value.find((p) => p.id === selectedProjectId.value) ?? null,
);

const previewResourceCounts = computed(() => {
	const p = selectedProject.value;
	if (!p) return null;
	return {
		workflows: p.workflows.length,
		credentials: p.credentials.length,
		variables: p.variables.length,
		folders: p.folders.length,
		dataTables: p.dataTables.length,
	};
});

async function loadPackagePreview() {
	isLoadingPreview.value = true;
	previewError.value = '';
	try {
		const preview = await sourceControlStore.getPackagePreview();
		packagePreview.value = preview.projects;
		if (preview.projects.length === 1) {
			selectedProjectId.value = preview.projects[0].id;
		}
	} catch (error) {
		previewError.value = (error as Error).message || 'Failed to load package preview';
	} finally {
		isLoadingPreview.value = false;
	}
}

// Reactive status state - starts with props data or empty, then loads fresh data
const status = ref<SourceControlledFile[]>(props.data.status || []);
const isLoading = ref(false);

// Auto-publish selection
const autoPublish = ref<AutoPublishMode>('none');

const autoPublishOptions = computed(() => {
	const workflows = status.value.filter((f) => f.type === SOURCE_CONTROL_FILE_TYPE.workflow);
	const hasPublishedWorkflows = workflows.some((w) => w.isLocalPublished && w.status !== 'created');

	return [
		{
			label: i18n.baseText('settings.sourceControl.modals.pull.autoPublish.options.off'),
			description: i18n.baseText(
				'settings.sourceControl.modals.pull.autoPublish.options.off.description',
			),
			value: 'none',
		},
		{
			label: i18n.baseText('settings.sourceControl.modals.pull.autoPublish.options.published'),
			description: i18n.baseText(
				'settings.sourceControl.modals.pull.autoPublish.options.published.description',
			),
			value: 'published',
			disabled: !hasPublishedWorkflows,
		},
		{
			label: i18n.baseText('settings.sourceControl.modals.pull.autoPublish.options.on'),
			description: i18n.baseText(
				'settings.sourceControl.modals.pull.autoPublish.options.on.description',
			),
			value: 'all',
		},
	];
});

const hasModifiedWorkflows = computed(() => {
	return status.value.some(
		(f) => f.type === SOURCE_CONTROL_FILE_TYPE.workflow && f.status === 'modified',
	);
});

const hasModifiedCredentials = computed(() => {
	return status.value.some(
		(f) => f.type === SOURCE_CONTROL_FILE_TYPE.credential && f.status === 'modified',
	);
});

// Load fresh source control status when modal opens
async function loadSourceControlStatus() {
	if (isLoading.value) return;

	isLoading.value = true;
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));

	try {
		// Use aggregated status API to preview what will be pulled (doesn't import)
		const freshStatus = await sourceControlStore.getAggregatedStatus({
			direction: 'pull',
			preferLocalVersion: false,
			verbose: false,
		});
		status.value = freshStatus || [];

		// Close modal if there are no changes to pull
		if (status.value.length === 0) {
			toast.showMessage({
				title: i18n.baseText('settings.sourceControl.pull.upToDate.description'),
				type: 'success',
			});
			close();
		}
	} catch (error) {
		toast.showError(error, 'Error');
		close();
	} finally {
		isLoading.value = false;
		loadingService.stopLoading();
		loadingService.setLoadingText(i18n.baseText('genericHelpers.loading'));
	}
}
onBeforeMount(() => {
	void projectsStore.getAvailableProjects();
});

// Tab state
const activeTab = ref<
	| typeof SOURCE_CONTROL_FILE_TYPE.workflow
	| typeof SOURCE_CONTROL_FILE_TYPE.credential
	| typeof SOURCE_CONTROL_FILE_TYPE.datatable
>(SOURCE_CONTROL_FILE_TYPE.workflow);

const groupedFilesByType = computed(() => {
	const grouped: Partial<Record<SourceControlledFileType, SourceControlledFileWithProject[]>> = {};

	status.value.forEach((file) => {
		if (!grouped[file.type]) {
			grouped[file.type] = [];
		}
		grouped[file.type]!.push(file);
	});

	return grouped;
});

// Filtered workflows
const filteredWorkflows = computed(() => {
	const workflows = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow] || [];
	return workflows;
});

const sortedWorkflows = computed(() => {
	const sorted = orderBy(
		filteredWorkflows.value,
		[({ status }) => getPullPriorityByStatus(status), 'updatedAt'],
		['asc', 'desc'],
	);

	// Add willBeAutoPublished property to each workflow
	return sorted.map((file) => ({
		...file,
		willBeAutoPublished:
			file.type === SOURCE_CONTROL_FILE_TYPE.workflow &&
			file.status !== 'deleted' &&
			shouldAutoPublishWorkflow({
				isNewWorkflow: file.status === 'created',
				isLocalPublished: file.isLocalPublished ?? false,
				isRemoteArchived: file.isRemoteArchived ?? false,
				autoPublish: autoPublish.value,
			}),
	}));
});

// Filtered credentials
const filteredCredentials = computed(() => {
	const credentials = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential] || [];
	return credentials;
});

const sortedCredentials = computed(() =>
	orderBy(
		filteredCredentials.value,
		[({ status }) => getPullPriorityByStatus(status), 'updatedAt'],
		['asc', 'desc'],
	),
);

// Filtered data tables
const filteredDataTables = computed(() => {
	const dataTables = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.datatable] || [];
	return dataTables;
});

const sortedDataTables = computed(() =>
	orderBy(
		filteredDataTables.value,
		[({ status }) => getPullPriorityByStatus(status), 'updatedAt'],
		['asc', 'desc'],
	),
);

// Data tables with schema conflicts (columns will be lost)
const conflictedDataTables = computed(() => {
	return filteredDataTables.value.filter((dt) => {
		// For pull operations, show warning for modified data tables with conflicts
		// (schema changes) not for deleted data tables (entire table removed)
		return dt.conflict === true && dt.status === 'modified';
	});
});

const hasDataTableConflicts = computed(() => conflictedDataTables.value.length > 0);

const dataTableWarningMessage = computed(() => {
	if (!hasDataTableConflicts.value) return '';

	return i18n.baseText('settings.sourceControl.modals.pull.dataTablesWarning', {
		interpolate: { count: conflictedDataTables.value.length },
	});
});

// Active data source based on tab
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

// Tab data
const tabs = computed(() => {
	return [
		{
			label: 'Workflows',
			value: SOURCE_CONTROL_FILE_TYPE.workflow,
			total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow]?.length || 0,
		},
		{
			label: 'Credentials',
			value: SOURCE_CONTROL_FILE_TYPE.credential,
			total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential]?.length || 0,
		},
		{
			label: 'Data Tables',
			value: SOURCE_CONTROL_FILE_TYPE.datatable,
			total: groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.datatable]?.length || 0,
		},
	];
});

// Other files (variables, tags, folders, projects) that are always pulled
const otherFiles = computed(() => {
	const others: SourceControlledFileWithProject[] = [];

	const variables = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.variables];
	if (variables) {
		others.push.apply(others, variables);
	}
	const tags = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.tags];
	if (tags) {
		others.push.apply(others, tags);
	}
	const folders = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.folders];
	if (folders) {
		others.push.apply(others, folders);
	}
	const projects = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.project];
	if (projects) {
		others.push.apply(others, projects);
	}

	return others;
});

const otherFilesText = computed(() => {
	const parts: string[] = [];

	const variables = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.variables];
	if (variables?.length) {
		parts.push(`Variables (${variables.length})`);
	}

	const tags = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.tags];
	if (tags?.length) {
		parts.push(`Tags (${tags.length})`);
	}

	const folders = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.folders];
	if (folders?.length) {
		parts.push(`Folders (${folders.length})`);
	}

	const projects = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.project];
	if (projects?.length) {
		parts.push(`Projects (${projects.length})`);
	}

	return parts.join(', ');
});

function close() {
	// Navigate back in history to maintain proper browser navigation
	// The global route watcher will handle closing the modal
	router.back();
}

async function pullPackage() {
	if (!selectedProjectId.value) return;

	const projectName = selectedProject.value?.name ?? '';
	isPackageImporting.value = true;
	loadingService.startLoading('Importing package...');
	close();

	try {
		await sourceControlStore.importPackage({
			force: true,
			projectIds: [selectedProjectId.value],
		});

		toast.showToast({
			title: 'Package imported',
			message: `Resources imported from project "${projectName}".`,
			type: 'success',
		});

		sourceControlEventBus.emit('pull');
	} catch (error) {
		toast.showError(error, 'Import failed');
	} finally {
		isPackageImporting.value = false;
		loadingService.stopLoading();
	}
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));

	const workflowsToAutoPublish = sortedWorkflows.value.filter((w) => w.willBeAutoPublished);

	try {
		const pullStatus = await sourceControlStore.pullWorkfolder(true, autoPublish.value);

		await notifyUserAboutPullWorkFolderOutcome(pullStatus, toast, router);

		sourceControlEventBus.emit('pull');

		// Show result modal if any workflows were auto-published
		if (workflowsToAutoPublish.length > 0) {
			// Filter to only show workflows that were intended to be auto-published
			const workflowResults = pullStatus.filter(
				(file) =>
					file.type === SOURCE_CONTROL_FILE_TYPE.workflow &&
					workflowsToAutoPublish.some((w) => w.id === file.id),
			);

			if (workflowResults.length > 0) {
				uiStore.openModalWithData({
					name: SOURCE_CONTROL_PULL_RESULT_MODAL_KEY,
					data: {
						workflows: workflowResults,
					},
				});
			}
		}
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
		close();
	}
}

function renderUpdatedAt(file: SourceControlledFile) {
	const currentYear = new Date().getFullYear().toString();

	return i18n.baseText('settings.sourceControl.lastUpdated', {
		interpolate: {
			date: dateformat(
				file.updatedAt,
				`d mmm${file.updatedAt?.startsWith(currentYear) ? '' : ', yyyy'}`,
			),
			time: dateformat(file.updatedAt, 'HH:MM'),
		},
	});
}

function openDiffModal(id: string) {
	telemetry.track('User clicks compare workflows', {
		workflow_id: id,
		context: 'source_control_pull',
	});

	// Only update route - modal will be opened by route watcher
	void router.push({
		query: {
			...route.query,
			diff: id,
			direction: 'pull',
		},
	});
}

const modalHeight = computed(() =>
	groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow]?.length ||
	groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential]?.length
		? 'min(80vh, 850px)'
		: 'auto',
);

// Load data when modal opens
onMounted(() => {
	if (isProjectScoped.value) {
		void loadPackagePreview();
		return;
	}
	if (!props.data.status || props.data.status.length === 0) {
		void loadSourceControlStatus();
	}
});
</script>

<template>
	<!-- Project-scoped import mode -->
	<Modal
		v-if="!isLoading && isProjectScoped"
		width="620px"
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
		height="auto"
		:custom-class="$style.sourceControlPull"
		:before-close="close"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">Import from git</N8nHeading>
		</template>
		<template #content>
			<div :class="$style.packageContent">
				<!-- Loading state -->
				<div v-if="isLoadingPreview" :class="$style.previewLoading">
					<N8nLoading :rows="3" />
					<N8nText color="text-light" size="small" class="mt-2xs">
						Fetching package contents from git...
					</N8nText>
				</div>

				<!-- Error state -->
				<N8nCallout v-else-if="previewError" theme="danger">
					{{ previewError }}
				</N8nCallout>

				<!-- Empty state -->
				<N8nCallout v-else-if="packagePreview.length === 0" theme="info">
					No projects found in the git repository. Push a project first.
				</N8nCallout>

				<!-- Preview content -->
				<template v-else>
					<!-- Project selector -->
					<div :class="$style.projectSelector">
						<N8nText bold size="medium" color="text-dark">Project</N8nText>
						<N8nSelect
							:model-value="selectedProjectId"
							size="medium"
							:class="$style.projectSelect"
							placeholder="Select a project to import"
							data-test-id="package-project-select"
							@update:model-value="selectedProjectId = $event"
						>
							<N8nOption
								v-for="project in packagePreview"
								:key="project.id"
								:value="project.id"
								:label="project.name"
							/>
						</N8nSelect>
					</div>

					<!-- Resource preview for selected project -->
					<div v-if="selectedProject" :class="$style.resourcePreview">
						<div :class="$style.resourceGrid">
							<div :class="$style.resourceCard">
								<N8nText bold size="xlarge" color="text-dark">
									{{ previewResourceCounts?.workflows ?? 0 }}
								</N8nText>
								<N8nText size="small" color="text-light">Workflows</N8nText>
							</div>
							<div :class="$style.resourceCard">
								<N8nText bold size="xlarge" color="text-dark">
									{{ previewResourceCounts?.credentials ?? 0 }}
								</N8nText>
								<N8nText size="small" color="text-light">Credentials</N8nText>
							</div>
							<div :class="$style.resourceCard">
								<N8nText bold size="xlarge" color="text-dark">
									{{ previewResourceCounts?.variables ?? 0 }}
								</N8nText>
								<N8nText size="small" color="text-light">Variables</N8nText>
							</div>
							<div :class="$style.resourceCard">
								<N8nText bold size="xlarge" color="text-dark">
									{{ previewResourceCounts?.dataTables ?? 0 }}
								</N8nText>
								<N8nText size="small" color="text-light">Data tables</N8nText>
							</div>
						</div>

						<!-- Resource details -->
						<div :class="$style.resourceDetails">
							<div v-if="selectedProject.workflows.length" :class="$style.resourceSection">
								<N8nText bold size="small" color="text-dark" class="mb-4xs">
									Workflows
								</N8nText>
								<ul :class="$style.resourceList">
									<li
										v-for="wf in selectedProject.workflows"
										:key="wf.id"
										:class="$style.resourceItem"
									>
										<N8nText size="small">{{ wf.name }}</N8nText>
									</li>
								</ul>
							</div>
							<div v-if="selectedProject.credentials.length" :class="$style.resourceSection">
								<N8nText bold size="small" color="text-dark" class="mb-4xs">
									Credentials
								</N8nText>
								<ul :class="$style.resourceList">
									<li
										v-for="cred in selectedProject.credentials"
										:key="cred.id"
										:class="$style.resourceItem"
									>
										<N8nText size="small">{{ cred.name }}</N8nText>
										<N8nText size="small" color="text-light">&middot; {{ cred.type }}</N8nText>
									</li>
								</ul>
							</div>
							<div v-if="selectedProject.variables.length" :class="$style.resourceSection">
								<N8nText bold size="small" color="text-dark" class="mb-4xs">
									Variables
								</N8nText>
								<ul :class="$style.resourceList">
									<li
										v-for="v in selectedProject.variables"
										:key="v.id"
										:class="$style.resourceItem"
									>
										<N8nText size="small">{{ v.key }}</N8nText>
									</li>
								</ul>
							</div>
							<div v-if="selectedProject.dataTables.length" :class="$style.resourceSection">
								<N8nText bold size="small" color="text-dark" class="mb-4xs">
									Data tables
								</N8nText>
								<ul :class="$style.resourceList">
									<li
										v-for="dt in selectedProject.dataTables"
										:key="dt.id"
										:class="$style.resourceItem"
									>
										<N8nText size="small">{{ dt.name }}</N8nText>
									</li>
								</ul>
							</div>
						</div>
					</div>

					<N8nNotice v-if="selectedProject" :compact="false" class="mt-xs">
						<N8nText size="small">
							Importing will create or update all resources from this project. Existing resources
							with the same IDs will be overwritten.
						</N8nText>
					</N8nNotice>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton variant="subtle" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</N8nButton>
				<N8nButton
					variant="solid"
					data-test-id="force-pull"
					:disabled="isPackageImporting || !selectedProjectId || isLoadingPreview"
					@click="pullPackage"
				>
					Import project
				</N8nButton>
			</div>
		</template>
	</Modal>

	<!-- Standard instance-wide pull mode -->
	<Modal
		v-else-if="!isLoading"
		width="812px"
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
		:height="modalHeight"
		:custom-class="$style.sourceControlPull"
		:before-close="close"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.modals.pull.title') }}
			</N8nHeading>

			<div :class="[$style.filtersRow]" class="mt-xs">
				<N8nText tag="div">
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
					<N8nLink :to="i18n.baseText('settings.sourceControl.docs.using.pushPull.url')">
						{{ i18n.baseText('settings.sourceControl.modals.push.description.learnMore') }}
					</N8nLink>
				</N8nText>
			</div>
		</template>
		<template #content>
			<div style="display: flex; flex-direction: column; height: 100%">
				<div :class="$style.autoPublishSection">
					<N8nText tag="div" bold size="medium" color="text-dark">
						{{ i18n.baseText('settings.sourceControl.modals.pull.autoPublish.title') }}
					</N8nText>
					<N8nSelect
						v-model="autoPublish"
						size="medium"
						:class="$style.select"
						data-test-id="auto-publish-select"
					>
						<N8nOption
							v-for="option in autoPublishOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
							:disabled="option.disabled"
						>
							<div :class="$style.listOption">
								<N8nText bold>{{ option.label }}</N8nText>
								<N8nText v-if="option.description" size="small" color="text-light">
									{{ option.description }}
								</N8nText>
							</div>
						</N8nOption>
					</N8nSelect>
				</div>
				<div style="display: flex; flex: 1; min-height: 0">
					<div :class="$style.tabs">
						<template v-for="tab in tabs" :key="tab.value">
							<button
								type="button"
								:class="[$style.tab, { [$style.tabActive]: activeTab === tab.value }]"
								:data-test-id="`source-control-pull-modal-tab-${tab.value}`"
								@click="activeTab = tab.value"
							>
								<div>{{ tab.label }}</div>
								<N8nText tag="div" color="text-light">
									{{ tab.total }} {{ tab.total === 1 ? 'item' : 'items' }}
								</N8nText>
							</button>
						</template>
					</div>
					<div style="flex: 1">
						<div :class="[$style.table]">
							<div :class="[$style.tableHeader]">
								<div :class="$style.headerTitle">
									<N8nText>Title</N8nText>
								</div>
							</div>
							<div style="flex: 1; overflow: hidden">
								<N8nInfoTip v-if="!activeDataSourceFiltered.length" class="p-xs" :bold="false">
									{{ filtersNoResultText }}
								</N8nInfoTip>
								<DynamicScroller
									v-if="activeDataSourceFiltered.length"
									:class="[$style.scroller]"
									:items="activeDataSourceFiltered"
									:min-item-size="57"
									item-class="scrollerItem"
								>
									<template #default="{ item: file, active, index }">
										<DynamicScrollerItem
											:item="file"
											:active="active"
											:size-dependencies="[file.name, file.id]"
											:data-index="index"
										>
											<div :class="[$style.listItem]" data-test-id="pull-modal-item">
												<div :class="[$style.itemContent]">
													<N8nText tag="div" bold color="text-dark" :class="[$style.listItemName]">
														<RouterLink
															v-if="file.type === SOURCE_CONTROL_FILE_TYPE.credential"
															target="_blank"
															rel="noopener noreferrer"
															:to="{ name: VIEWS.CREDENTIALS, params: { credentialId: file.id } }"
														>
															{{ file.name }}
														</RouterLink>
														<RouterLink
															v-else-if="file.type === SOURCE_CONTROL_FILE_TYPE.workflow"
															target="_blank"
															rel="noopener noreferrer"
															:to="{ name: VIEWS.WORKFLOW, params: { name: file.id } }"
														>
															{{ file.name }}
														</RouterLink>
														<span v-else>{{ file.name }}</span>
													</N8nText>
													<div :class="$style.statusLine">
														<N8nText v-if="file.updatedAt" color="text-light" size="small">
															{{ renderUpdatedAt(file) }}
														</N8nText>
														<N8nText
															v-if="file.willBeAutoPublished"
															color="success"
															size="small"
															bold
														>
															{{
																i18n.baseText('settings.sourceControl.modals.pull.autoPublishing')
															}}
														</N8nText>
														<N8nText v-if="file.isRemoteArchived" color="warning" size="small" bold>
															{{
																i18n.baseText('settings.sourceControl.modals.pull.willBeArchived')
															}}
														</N8nText>
													</div>
												</div>
												<span :class="[$style.badges]">
													<N8nBadge :theme="getStatusTheme(file.status)" style="height: 25px">
														{{ getStatusText(file.status) }}
													</N8nBadge>
													<template v-if="isWorkflowDiffsEnabled">
														<N8nTooltip
															v-if="
																file.type === SOURCE_CONTROL_FILE_TYPE.workflow &&
																file.status === 'modified'
															"
															:content="i18n.baseText('workflowDiff.compare')"
															placement="top"
														>
															<N8nIconButton
																variant="subtle"
																icon="file-diff"
																@click="openDiffModal(file.id)"
															/>
														</N8nTooltip>
													</template>
												</span>
											</div>
										</DynamicScrollerItem>
									</template>
								</DynamicScroller>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nNotice v-if="hasModifiedCredentials" :compact="false" class="mt-0">
				<N8nText size="small">
					{{ i18n.baseText('settings.sourceControl.modals.pull.modifiedCredentialsNotice') }}
				</N8nText>
			</N8nNotice>

			<div v-if="otherFiles.length" class="mb-xs">
				<N8nText bold size="medium">Additional changes to be pulled:</N8nText>
				<N8nText size="small">{{ otherFilesText }}</N8nText>
			</div>
			<N8nCallout v-if="hasDataTableConflicts" theme="warning" class="mb-xs">
				<div :class="$style.warningContent">
					<div>{{ dataTableWarningMessage }}</div>
					<ul :class="$style.dataTableList">
						<li v-for="table in conflictedDataTables" :key="table.id">{{ table.name }}</li>
					</ul>
				</div>
			</N8nCallout>
			<div :class="$style.footer">
				<N8nButton variant="subtle" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</N8nButton>
				<N8nButton variant="solid" data-test-id="force-pull" @click="pullWorkfolder">
					{{
						hasModifiedWorkflows
							? i18n.baseText('settings.sourceControl.modals.pull.buttons.save')
							: i18n.baseText('settings.sourceControl.modals.pull.buttons.pull')
					}}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.sourceControlPull {
	&:global(.el-dialog) {
		margin: 0;
	}

	:global(.el-dialog__header) {
		padding-bottom: var(--spacing--xs);
	}
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

.headerTitle {
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

	:global(.scrollerItem) {
		&:last-child {
			.listItem {
				border-bottom: 0;
			}
		}
	}
}

.listItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 10px 16px;
	margin: 0;
	border-bottom: var(--border);
	gap: 30px;
}

.itemContent {
	flex: 1;
	min-width: 0;
}

.listItemName {
	line-clamp: 2;
	-webkit-line-clamp: 2;
	text-overflow: ellipsis;
	overflow: hidden;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	word-wrap: break-word;

	a {
		color: inherit;
		text-decoration: none;
		&:hover {
			text-decoration: underline;
		}
	}
}

.badges {
	display: flex;
	gap: 10px;
	align-items: center;
	flex-shrink: 0;
}

.footer {
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	margin-top: 8px;
}

.warningContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}

.dataTableList {
	margin: var(--spacing--4xs) 0 0 0;
	padding-left: 0;
	list-style-position: inside;

	li {
		margin-bottom: var(--spacing--3xs);

		&:last-child {
			margin-bottom: 0;
		}
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

.autoPublishSection {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	padding: var(--spacing--4xs) 0;
	margin-bottom: var(--spacing--xs);
}

.select {
	width: 250px;
}

.statusLine {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.listOption {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: var(--spacing--3xs) 0;
	white-space: normal;
	padding-right: var(--spacing--md);
}

.packageContent {
	padding: var(--spacing--xs) 0;
}

.previewLoading {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--lg) 0;
}

.projectSelector {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--xs);
}

.projectSelect {
	flex: 1;
}

.resourcePreview {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.resourceGrid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--spacing--2xs);
}

.resourceCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--color--background);
}

.resourceDetails {
	max-height: 280px;
	overflow-y: auto;
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	scrollbar-color: var(--color--foreground) transparent;
}

.resourceSection {
	display: flex;
	flex-direction: column;

	& + & {
		padding-top: var(--spacing--xs);
		border-top: var(--border);
	}
}

.resourceList {
	list-style: none;
	padding: 0;
	margin: 0;
}

.resourceItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--4xs) 0;
}
</style>
