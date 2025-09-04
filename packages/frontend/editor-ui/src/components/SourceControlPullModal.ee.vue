<script lang="ts" setup>
import { useLoadingService } from '@/composables/useLoadingService';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS } from '@/constants';
import { sourceControlEventBus } from '@/event-bus/source-control';
import { useProjectsStore } from '@/stores/projects.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import type { ProjectListItem } from '@/types/projects.types';
import {
	getPullPriorityByStatus,
	getStatusText,
	getStatusTheme,
	notifyUserAboutPullWorkFolderOutcome,
} from '@/utils/sourceControlUtils';
import { type SourceControlledFile, SOURCE_CONTROL_FILE_TYPE } from '@n8n/api-types';
import { N8nBadge, N8nButton, N8nHeading, N8nInfoTip, N8nLink, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import dateformat from 'dateformat';
import orderBy from 'lodash/orderBy';
import { computed, onBeforeMount, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from './Modal.vue';

type SourceControlledFileType = SourceControlledFile['type'];
type SourceControlledFileWithProject = SourceControlledFile & { project?: ProjectListItem };

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

const isWorkflowDiffsEnabled = computed(() => settingsStore.settings.enterprise.workflowDiffs);

// Reactive status state - starts with props data or empty, then loads fresh data
const status = ref<SourceControlledFile[]>(props.data.status || []);
const isLoading = ref(false);

const responseStatuses = {
	CONFLICT: 409,
};

// Load fresh source control status when modal opens
async function loadSourceControlStatus() {
	if (isLoading.value) return;

	isLoading.value = true;
	loadingService.startLoading();
	loadingService.setLoadingText(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));

	try {
		const freshStatus = await sourceControlStore.pullWorkfolder(false);
		await notifyUserAboutPullWorkFolderOutcome(freshStatus, toast);
		sourceControlEventBus.emit('pull');
		close();
	} catch (error) {
		// only show the modal when there are conflicts
		const errorResponse = error.response;

		if (errorResponse?.status === responseStatuses.CONFLICT) {
			status.value = errorResponse.data.data || [];
		} else {
			toast.showError(error, 'Error');
			close();
		}
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

const sortedWorkflows = computed(() =>
	orderBy(
		filteredWorkflows.value,
		[({ status }) => getPullPriorityByStatus(status), 'updatedAt'],
		['asc', 'desc'],
	),
);

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

	return others;
});

function close() {
	// Navigate back in history to maintain proper browser navigation
	// The global route watcher will handle closing the modal
	router.back();
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.checkingForChanges'));
	close();

	try {
		const pullStatus = await sourceControlStore.pullWorkfolder(true);

		await notifyUserAboutPullWorkFolderOutcome(pullStatus, toast);

		sourceControlEventBus.emit('pull');
	} catch (error) {
		toast.showError(error, 'Error');
	} finally {
		loadingService.stopLoading();
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

			<div :class="[$style.filtersRow]" class="mt-l">
				<N8nText tag="div" class="mb-xs">
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
					<N8nLink :to="i18n.baseText('settings.sourceControl.docs.using.pushPull.url')">
						{{ i18n.baseText('settings.sourceControl.modals.push.description.learnMore') }}
					</N8nLink>
				</N8nText>
			</div>
		</template>
		<template #content>
			<div style="display: flex; height: 100%">
				<div :class="$style.tabs">
					<template v-for="tab in tabs" :key="tab.value">
						<button
							type="button"
							:class="[$style.tab, { [$style.tabActive]: activeTab === tab.value }]"
							data-test-id="source-control-pull-modal-tab"
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
														:to="{ name: VIEWS.CREDENTIALS, params: { credentialId: file.id } }"
													>
														{{ file.name }}
													</RouterLink>
													<RouterLink
														v-else-if="file.type === SOURCE_CONTROL_FILE_TYPE.workflow"
														target="_blank"
														:to="{ name: VIEWS.WORKFLOW, params: { name: file.id } }"
													>
														{{ file.name }}
													</RouterLink>
													<span v-else>{{ file.name }}</span>
												</N8nText>
												<N8nText
													v-if="file.updatedAt"
													tag="p"
													class="mt-0"
													color="text-light"
													size="small"
												>
													{{ renderUpdatedAt(file) }}
												</N8nText>
											</div>
											<span :class="[$style.badges]">
												<N8nBadge :theme="getStatusTheme(file.status)" style="height: 25px">
													{{ getStatusText(file.status) }}
												</N8nBadge>
												<template v-if="isWorkflowDiffsEnabled">
													<N8nIconButton
														v-if="file.type === SOURCE_CONTROL_FILE_TYPE.workflow"
														icon="file-diff"
														type="secondary"
														@click="openDiffModal(file.id)"
													/>
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
						Folders ({{ groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.folders]?.length || 0 }})
					</template>
				</N8nText>
			</div>
			<div :class="$style.footer">
				<N8nButton type="tertiary" class="mr-2xs" @click="close">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.cancel') }}
				</N8nButton>
				<N8nButton type="primary" data-test-id="force-pull" @click="pullWorkfolder">
					{{ i18n.baseText('settings.sourceControl.modals.pull.buttons.save') }}
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
		padding-bottom: var(--spacing-xs);
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
	border-top: var(--border-base);
}

.scroller {
	max-height: 100%;
	scrollbar-color: var(--color-foreground-base) transparent;
	outline: var(--border-base);

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
	border-bottom: var(--border-base);
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
	border: var(--border-base);
	border-top-right-radius: 8px;
	border-bottom-right-radius: 8px;
}

.tableHeader {
	border-bottom: var(--border-base);
	display: flex;
	flex-direction: column;
}

.tabs {
	display: flex;
	flex-direction: column;
	gap: 4px;
	width: 165px;
	padding: var(--spacing-2xs);
	border: var(--border-base);
	border-right: 0;
	border-top-left-radius: 8px;
	border-bottom-left-radius: 8px;
}

.tab {
	color: var(--color-text-base);
	background-color: transparent;
	border: 1px solid transparent;
	padding: var(--spacing-2xs);
	cursor: pointer;
	border-radius: 4px;
	text-align: left;
	display: flex;
	flex-direction: column;
	gap: 2px;
	&:hover {
		border-color: var(--color-background-base);
	}
}

.tabActive {
	background-color: var(--color-background-base);
	color: var(--color-text-dark);
}
</style>
