<script lang="ts" setup>
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';
import ProjectSharing from '@/components/Projects/ProjectSharing.vue';
import { useLoadingService } from '@/composables/useLoadingService';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { SOURCE_CONTROL_PULL_MODAL_KEY, VIEWS, WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import { sourceControlEventBus } from '@/event-bus/source-control';
import EnvFeatureFlag from '@/features/env-feature-flag/EnvFeatureFlag.vue';
import type { WorkflowResource } from '@/Interface';
import { useProjectsStore } from '@/stores/projects.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import { ResourceType } from '@/utils/projects.utils';
import {
	getPullPriorityByStatus,
	getStatusText,
	getStatusTheme,
	notifyUserAboutPullWorkFolderOutcome,
} from '@/utils/sourceControlUtils';
import {
	type SourceControlledFile,
	SOURCE_CONTROL_FILE_STATUS,
	SOURCE_CONTROL_FILE_TYPE,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInfoTip,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { refDebounced } from '@vueuse/core';
import dateformat from 'dateformat';
import orderBy from 'lodash/orderBy';
import { computed, onBeforeMount, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from './Modal.vue';

type SourceControlledFileType = SourceControlledFile['type'];
type SourceControlledFileStatus = SourceControlledFile['status'];
type SourceControlledFileWithProject = SourceControlledFile & { project?: ProjectListItem };

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlledFile[] };
}>();

const telemetry = useTelemetry();
const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const projectsStore = useProjectsStore();

onBeforeMount(() => {
	void projectsStore.getAvailableProjects();
});

// Tab state
const activeTab = ref<
	typeof SOURCE_CONTROL_FILE_TYPE.workflow | typeof SOURCE_CONTROL_FILE_TYPE.credential
>(SOURCE_CONTROL_FILE_TYPE.workflow);

// Filtering state
const search = ref('');
const debouncedSearch = refDebounced(search, 250);
const filters = ref<{ status?: SourceControlledFileStatus; project: ProjectSharingData | null }>({
	project: null,
});

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

const projectsForFilters = computed(() => {
	return projectsStore.availableProjects.filter(
		// global admins role is empty...
		(project) => !project.role || project.role === 'project:admin',
	);
});

const filterCount = computed(() =>
	Object.values(filters.value).reduce((acc, item) => (item ? acc + 1 : acc), 0),
);

const filtersApplied = computed(
	() => Boolean(search.value) || Boolean(Object.values(filters.value).filter(Boolean).length),
);

const resetFilters = () => {
	filters.value = { project: null };
	search.value = '';
};

// Group files by type with project information
const filesWithProjects = computed(() =>
	props.data.status.map((file) => {
		const project = projectsStore.availableProjects.find(({ id }) => id === file.owner?.projectId);
		return { ...file, project };
	}),
);

const groupedFilesByType = computed(() => {
	const grouped: Partial<Record<SourceControlledFileType, SourceControlledFileWithProject[]>> = {};

	filesWithProjects.value.forEach((file) => {
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
	const searchQuery = debouncedSearch.value.toLocaleLowerCase();

	return workflows.filter((workflow) => {
		if (!workflow.name.toLocaleLowerCase().includes(searchQuery)) {
			return false;
		}

		if (workflow.project && filters.value.project) {
			return workflow.project.id === filters.value.project.id;
		}

		return !(filters.value.status && filters.value.status !== workflow.status);
	});
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
	const searchQuery = debouncedSearch.value.toLocaleLowerCase();

	return credentials.filter((credential) => {
		if (!credential.name.toLocaleLowerCase().includes(searchQuery)) {
			return false;
		}

		if (credential.project && filters.value.project) {
			return credential.project.id === filters.value.project.id;
		}

		return !(filters.value.status && filters.value.status !== credential.status);
	});
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

const activeEntityLocale = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return 'generic.workflows';
	}
	return 'generic.credentials';
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
		others.push(...variables);
	}
	const tags = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.tags];
	if (tags) {
		others.push(...tags);
	}
	const folders = groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.folders];
	if (folders) {
		others.push(...folders);
	}

	return others;
});

function close() {
	uiStore.closeModal(SOURCE_CONTROL_PULL_MODAL_KEY);
}

async function pullWorkfolder() {
	loadingService.startLoading(i18n.baseText('settings.sourceControl.loading.pull'));
	close();

	try {
		const status = await sourceControlStore.pullWorkfolder(true);

		await notifyUserAboutPullWorkFolderOutcome(status, toast);

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

function castType(type: string): ResourceType {
	if (type === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return ResourceType.Workflow;
	}
	return ResourceType.Credential;
}

function castProject(project: ProjectListItem) {
	return { homeProject: project } as unknown as WorkflowResource;
}

const workflowDiffEventBus = createEventBus();

function openDiffModal(id: string) {
	telemetry.track('User clicks compare workflows', {
		workflow_id: id,
		context: 'source_control_pull',
	});
	uiStore.openModalWithData({
		name: WORKFLOW_DIFF_MODAL_KEY,
		data: { eventBus: workflowDiffEventBus, workflowId: id, direction: 'pull' },
	});
}

const modalHeight = computed(() =>
	groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.workflow]?.length ||
	groupedFilesByType.value[SOURCE_CONTROL_FILE_TYPE.credential]?.length
		? 'min(80vh, 850px)'
		: 'auto',
);
</script>

<template>
	<Modal
		width="812px"
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PULL_MODAL_KEY"
		:height="modalHeight"
		:custom-class="$style.sourceControlPull"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.modals.pull.title') }}
			</N8nHeading>

			<div v-if="tabs.some((tab) => tab.total > 0)" :class="[$style.filtersRow]" class="mt-l">
				<div :class="[$style.filters]">
					<N8nInput
						v-model="search"
						data-test-id="source-control-pull-search"
						placeholder="Filter by title"
						clearable
						style="width: 234px"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
					<N8nPopover trigger="click" width="304" style="align-self: normal">
						<template #reference>
							<N8nButton
								icon="funnel"
								type="tertiary"
								style="height: 100%"
								:active="Boolean(filterCount)"
								data-test-id="source-control-filter-dropdown"
							>
								<N8nBadge v-if="filterCount" theme="primary" class="mr-4xs">
									{{ filterCount }}
								</N8nBadge>
							</N8nButton>
						</template>
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
							data-test-id="source-control-pull-modal-project-search"
							:projects="projectsForFilters"
							:placeholder="i18n.baseText('forms.resourceFiltersDropdown.owner.placeholder')"
							:empty-options-text="i18n.baseText('projects.sharing.noMatchingProjects')"
						/>
						<div v-if="filterCount" class="mt-s">
							<N8nLink @click="resetFilters">
								{{ i18n.baseText('forms.resourceFiltersDropdown.reset') }}
							</N8nLink>
						</div>
					</N8nPopover>
				</div>
			</div>
		</template>
		<template #content>
			<div v-if="!tabs.some((tab) => tab.total > 0)">
				<N8nText tag="div" class="mb-xs">
					{{ i18n.baseText('settings.sourceControl.modals.pull.description') }}
					<br />
					<N8nLink :to="i18n.baseText('settings.sourceControl.docs.using.pushPull.url')">
						{{ i18n.baseText('settings.sourceControl.modals.push.description.learnMore') }}
					</N8nLink>
				</N8nText>
			</div>
			<div v-else style="display: flex; height: 100%">
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
							<N8nInfoTip
								v-if="filtersApplied"
								class="p-xs"
								:bold="false"
								:class="$style.filtersApplied"
							>
								{{
									i18n.baseText('settings.sourceControl.modals.push.filter', {
										interpolate: {
											count: `${activeDataSourceFiltered.length} / ${
												activeTab === SOURCE_CONTROL_FILE_TYPE.workflow
													? groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.workflow]?.length || 0
													: groupedFilesByType[SOURCE_CONTROL_FILE_TYPE.credential]?.length || 0
											}`,
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
												<N8nText
													v-if="file.status === SOURCE_CONTROL_FILE_STATUS.deleted"
													color="text-light"
												>
													<span v-if="file.type === SOURCE_CONTROL_FILE_TYPE.workflow">
														Deleted Workflow:
													</span>
													<span v-if="file.type === SOURCE_CONTROL_FILE_TYPE.credential">
														Deleted Credential:
													</span>
													<strong>{{ file.name || file.id }}</strong>
												</N8nText>
												<N8nText
													v-else
													tag="div"
													bold
													color="text-dark"
													:class="[$style.listItemName]"
												>
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
												<template
													v-if="
														file.type === SOURCE_CONTROL_FILE_TYPE.workflow ||
														file.type === SOURCE_CONTROL_FILE_TYPE.credential
													"
												>
													<ProjectCardBadge
														v-if="file.project"
														data-test-id="source-control-pull-modal-project-badge"
														:resource="castProject(file.project)"
														:resource-type="castType(file.type)"
														:resource-type-label="
															i18n.baseText(`generic.${file.type}`).toLowerCase()
														"
														:personal-project="projectsStore.personalProject"
														:show-badge-border="false"
													/>
												</template>
												<N8nBadge :theme="getStatusTheme(file.status)">
													{{ getStatusText(file.status) }}
												</N8nBadge>
												<EnvFeatureFlag name="SOURCE_CONTROL_WORKFLOW_DIFF">
													<N8nIconButton
														v-if="file.type === SOURCE_CONTROL_FILE_TYPE.workflow"
														icon="file-diff"
														type="secondary"
														@click="openDiffModal(file.id)"
													/>
												</EnvFeatureFlag>
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
