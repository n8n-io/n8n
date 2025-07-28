<script lang="ts" setup>
import ProjectCardBadge from '@/components/Projects/ProjectCardBadge.vue';
import { useLoadingService } from '@/composables/useLoadingService';
import { useTelemetry } from '@/composables/useTelemetry';
import { useToast } from '@/composables/useToast';
import { SOURCE_CONTROL_PUSH_MODAL_KEY, VIEWS, WORKFLOW_DIFF_MODAL_KEY } from '@/constants';
import EnvFeatureFlag from '@/features/env-feature-flag/EnvFeatureFlag.vue';
import type { WorkflowResource } from '@/Interface';
import { useProjectsStore } from '@/stores/projects.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useUsersStore } from '@/stores/users.store';
import type { ProjectListItem, ProjectSharingData } from '@/types/projects.types';
import { ResourceType } from '@/utils/projects.utils';
import { getPushPriorityByStatus, getStatusText, getStatusTheme } from '@/utils/sourceControlUtils';
import type { SourceControlledFile } from '@n8n/api-types';
import {
	ROLE,
	SOURCE_CONTROL_FILE_LOCATION,
	SOURCE_CONTROL_FILE_STATUS,
	SOURCE_CONTROL_FILE_TYPE,
} from '@n8n/api-types';
import {
	N8nBadge,
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nNotice,
	N8nOption,
	N8nPopover,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import { refDebounced, useStorage } from '@vueuse/core';
import dateformat from 'dateformat';
import orderBy from 'lodash/orderBy';
import { computed, onBeforeMount, onMounted, reactive, ref, toRaw, watch } from 'vue';
import { useRoute } from 'vue-router';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import Modal from './Modal.vue';

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlledFile[] };
}>();

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const projectsStore = useProjectsStore();
const route = useRoute();
const telemetry = useTelemetry();
const usersStore = useUsersStore();

const projectAdminCalloutDismissed = useStorage(
	'SOURCE_CONTROL_PROJECT_ADMIN_CALLOUT_DISMISSED',
	false,
	localStorage,
);

onBeforeMount(() => {
	void projectsStore.getAvailableProjects();
});

const projectsForFilters = computed(() => {
	return projectsStore.availableProjects.filter(
		// global admins role is empty...
		(project) => !project.role || project.role === 'project:admin',
	);
});

const concatenateWithAnd = (messages: string[]) =>
	new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages);

type SourceControlledFileStatus = SourceControlledFile['status'];

type SourceControlledFileWithProject = SourceControlledFile & { project?: ProjectListItem };

type Changes = {
	tags: SourceControlledFileWithProject[];
	variables: SourceControlledFileWithProject[];
	credential: SourceControlledFileWithProject[];
	workflow: SourceControlledFileWithProject[];
	currentWorkflow?: SourceControlledFileWithProject;
	folders: SourceControlledFileWithProject[];
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

			return acc;
		},
		{
			tags: [],
			variables: [],
			credential: [],
			workflow: [],
			folders: [],
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

	return messages;
});
const workflowId = computed(
	() =>
		([VIEWS.WORKFLOW].includes(route.name as VIEWS) && route.params.name?.toString()) || undefined,
);

const changes = computed(() => classifyFilesByType(props.data.status, workflowId.value));

const selectedWorkflows = reactive<Set<string>>(new Set());

const maybeSelectCurrentWorkflow = (workflow?: SourceControlledFileWithProject) =>
	workflow && selectedWorkflows.add(workflow.id);

onMounted(() => maybeSelectCurrentWorkflow(changes.value.currentWorkflow));

const currentProject = computed(() => {
	if (!route.params.projectId) {
		return null;
	}

	const project = projectsStore.availableProjects.find(
		(project) => project.id === route.params.projectId?.toString(),
	);

	if (!project) {
		return null;
	}

	if (!project.role || project.role === 'project:admin') {
		return project;
	}

	return null;
});

const filters = ref<{ status?: SourceControlledFileStatus; project: ProjectSharingData | null }>({
	project: currentProject.value,
});
const filtersApplied = computed(
	() => Boolean(search.value) || Boolean(Object.values(filters.value).filter(Boolean).length),
);
const resetFilters = () => {
	filters.value = { project: null };
	search.value = '';
};

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

const filteredWorkflows = computed(() => {
	const searchQuery = debouncedSearch.value.toLocaleLowerCase();

	return changes.value.workflow.filter((workflow) => {
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
		[
			// keep the current workflow at the top of the list
			({ id }) => id === changes.value.currentWorkflow?.id,
			({ status }) => getPushPriorityByStatus(status),
			'updatedAt',
		],
		['desc', 'asc', 'desc'],
	),
);

const selectedCredentials = reactive<Set<string>>(new Set());

const filteredCredentials = computed(() => {
	const searchQuery = debouncedSearch.value.toLocaleLowerCase();

	return changes.value.credential.filter((credential) => {
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
		[({ status }) => getPushPriorityByStatus(status), 'updatedAt'],
		['asc', 'desc'],
	),
);

const commitMessage = ref('');
const isSubmitDisabled = computed(() => {
	if (!commitMessage.value.trim()) {
		return true;
	}

	const toBePushed =
		selectedCredentials.size +
		changes.value.tags.length +
		changes.value.variables.length +
		changes.value.folders.length +
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

const selectedCount = computed(() => selectedWorkflows.size + selectedCredentials.size);

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
	uiStore.closeModal(SOURCE_CONTROL_PUSH_MODAL_KEY);
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

	if (changes.value.folders.length) {
		messages.push(i18n.baseText('generic.folders_plural'));
	}

	if (changes.value.tags.length) {
		messages.push(i18n.baseText('generic.tag_plural'));
	}

	return [
		concatenateWithAnd(messages),
		i18n.baseText('settings.sourceControl.modals.push.success.description'),
	].join(' ');
};

async function commitAndPush() {
	const files = changes.value.tags
		.concat(changes.value.variables)
		.concat(changes.value.credential.filter((file) => selectedCredentials.has(file.id)))
		.concat(changes.value.folders)
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

const activeTab = ref<
	typeof SOURCE_CONTROL_FILE_TYPE.workflow | typeof SOURCE_CONTROL_FILE_TYPE.credential
>(SOURCE_CONTROL_FILE_TYPE.workflow);

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

	return false;
});

function toggleSelected(id: string) {
	if (activeSelection.value.has(id)) {
		activeSelection.value.delete(id);
	} else {
		activeSelection.value.add(id);
	}
}

const activeDataSource = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return changes.value.workflow;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return changes.value.credential;
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
	return [];
});

const activeEntityLocale = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return 'generic.workflows';
	}

	return 'generic.credentials';
});

const activeSelection = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return selectedWorkflows;
	}
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.credential) {
		return selectedCredentials;
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
	];
});

const filtersNoResultText = computed(() => {
	if (activeTab.value === SOURCE_CONTROL_FILE_TYPE.workflow) {
		return i18n.baseText('workflows.noResults');
	}
	return i18n.baseText('credentials.noResults');
});

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
		context: 'source_control_push',
	});
	uiStore.openModalWithData({
		name: WORKFLOW_DIFF_MODAL_KEY,
		data: { eventBus: workflowDiffEventBus, workflowId: id, direction: 'push' },
	});
}
</script>

<template>
	<Modal
		width="812px"
		:event-bus="data.eventBus"
		:name="SOURCE_CONTROL_PUSH_MODAL_KEY"
		:height="modalHeight"
		:custom-class="$style.sourceControlPush"
	>
		<template #header>
			<N8nHeading tag="h1" size="xlarge">
				{{ i18n.baseText('settings.sourceControl.modals.push.title') }}
			</N8nHeading>

			<div
				v-if="changes.workflow.length || changes.credential.length"
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
							data-test-id="source-control-push-modal-project-search"
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
							data-test-id="source-control-push-modal-tab"
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
								<N8nText> Title </N8nText>
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
										<N8nCheckbox
											:class="[$style.listItem]"
											data-test-id="source-control-push-modal-file-checkbox"
											:model-value="activeSelection.has(file.id)"
											@update:model-value="toggleSelected(file.id)"
										>
											<span>
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
													<span v-if="file.type === SOURCE_CONTROL_FILE_TYPE.folders">
														Deleted Folders:
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
													{{ file.name }}
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
											</span>
											<span :class="[$style.badges]">
												<N8nBadge
													v-if="changes.currentWorkflow && file.id === changes.currentWorkflow.id"
													class="mr-2xs"
												>
													Current workflow
												</N8nBadge>
												<template
													v-if="
														file.type === SOURCE_CONTROL_FILE_TYPE.workflow ||
														file.type === SOURCE_CONTROL_FILE_TYPE.credential
													"
												>
													<ProjectCardBadge
														v-if="file.project"
														data-test-id="source-control-push-modal-project-badge"
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
														icon="git-branch"
														type="secondary"
														@click="openDiffModal(file.id)"
													/>
												</EnvFeatureFlag>
											</span>
										</N8nCheckbox>
									</DynamicScrollerItem>
								</template>
							</DynamicScroller>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nNotice v-if="userNotices.length" :compact="false" class="mt-0">
				<N8nText bold size="medium">Changes to variables, tags and folders </N8nText>
				<br />
				<template v-for="{ title, content } in userNotices" :key="title">
					<N8nText bold size="small"> {{ title }}</N8nText>
					<N8nText size="small"> : {{ content }}. </N8nText>
				</template>
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
					data-test-id="source-control-push-modal-submit"
					type="primary"
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
	align-items: center;
	padding: 10px 16px;
	margin: 0;
	border-bottom: var(--border-base);

	.listItemName {
		line-clamp: 2;
		-webkit-line-clamp: 2;
		text-overflow: ellipsis;
		overflow: hidden;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		word-wrap: break-word; /* Important for long words! */
	}

	:global(.el-checkbox__label) {
		display: flex;
		width: 100%;
		justify-content: space-between;
		align-items: center;
		gap: 30px;
	}

	:global(.el-checkbox__inner) {
		transition: none;
	}
}

.badges {
	display: flex;
	gap: 10px;
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
		padding-bottom: var(--spacing-xs);
	}
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
