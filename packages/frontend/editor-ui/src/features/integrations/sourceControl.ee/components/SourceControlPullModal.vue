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

import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nIconButton,
	N8nInfoTip,
	N8nLink,
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
	typeof SOURCE_CONTROL_FILE_TYPE.workflow | typeof SOURCE_CONTROL_FILE_TYPE.credential
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

// Active data source based on tab
const activeDataSourceFiltered = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return sortedWorkflows.value;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return sortedCredentials.value;
	}
	return [];
});

const filtersNoResultText = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return i18n.baseText('workflows.noResults');
	}
	return i18n.baseText('credentials.noResults');
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
	];
});

// Other files (variables, tags, folders) that are always pulled
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

function close() {
	// Navigate back in history to maintain proper browser navigation
	// The global route watcher will handle closing the modal
	router.back();
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
	// Only load fresh data if we don't have any initial data
	if (!props.data.status || props.data.status.length === 0) {
		void loadSourceControlStatus();
	}
});
</script>

<template>
	<Modal
		v-if="!isLoading"
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
																icon="file-diff"
																type="secondary"
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
			<div v-if="otherFiles.length" class="mb-xs">
				<N8nText bold size="medium">Additional changes to be pulled:</N8nText>
				<N8nText size="small">
					<template v-if="groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.variables]?.length">
						Variables ({{ groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.variables]?.length || 0 }}),
					</template>
					<template v-if="groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.tags]?.length">
						Tags ({{ groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.tags]?.length || 0 }}),
					</template>
					<template v-if="groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.folders]?.length">
						Folders ({{ groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.folders]?.length || 0 }}),
					</template>
					<template v-if="groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.project]?.length">
						Projects ({{ groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.project]?.length || 0 }})
					</template>
				</N8nText>
			</div>
			<div :class="$style.footer">
				<N8nButton type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</N8nButton>
				<N8nButton type="primary" data-test-id="force-pull" @click="pullWorkfolder">
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
</style>
