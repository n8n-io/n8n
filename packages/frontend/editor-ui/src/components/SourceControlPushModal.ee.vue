<script lang="ts" setup>
import Modal from './Modal.vue';
import { SOURCE_CONTROL_PUSH_MODAL_KEY, VIEWS } from '@/constants';
import { computed, onMounted, ref, toRaw, watch } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@/composables/useI18n';
import { useLoadingService } from '@/composables/useLoadingService';
import { useToast } from '@/composables/useToast';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useUIStore } from '@/stores/ui.store';
import { useRoute } from 'vue-router';
import dateformat from 'dateformat';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import { refDebounced } from '@vueuse/core';
import {
	N8nHeading,
	N8nText,
	N8nLink,
	N8nCheckbox,
	N8nInput,
	N8nIcon,
	N8nButton,
	N8nBadge,
	N8nNotice,
	N8nPopover,
	N8nSelect,
	N8nOption,
	N8nInputLabel,
	N8nInfoTip,
} from '@n8n/design-system';
import {
	type SourceControlledFile,
	SOURCE_CONTROL_FILE_STATUS,
	SOURCE_CONTROL_FILE_TYPE,
	SOURCE_CONTROL_FILE_LOCATION,
} from '@n8n/api-types';
import { orderBy, groupBy } from 'lodash-es';
import { getStatusText, getStatusTheme, getPushPriorityByStatus } from '@/utils/sourceControlUtils';
import { useTelemetry } from '@/composables/useTelemetry';

const props = defineProps<{
	data: { eventBus: EventBus; status: SourceControlledFile[] };
}>();

const loadingService = useLoadingService();
const uiStore = useUIStore();
const toast = useToast();
const i18n = useI18n();
const sourceControlStore = useSourceControlStore();
const route = useRoute();
const telemetry = useTelemetry();

const concatenateWithAnd = (messages: string[]) =>
	new Intl.ListFormat(i18n.locale, { style: 'long', type: 'conjunction' }).format(messages);

type SourceControlledFileStatus = SourceControlledFile['status'];

type Changes = {
	tags: SourceControlledFile[];
	variables: SourceControlledFile[];
	credentials: SourceControlledFile[];
	workflows: SourceControlledFile[];
	currentWorkflow?: SourceControlledFile;
};

const classifyFilesByType = (files: SourceControlledFile[], currentWorkflowId?: string): Changes =>
	files.reduce<Changes>(
		(acc, file) => {
			// do not show remote workflows that are not yet created locally during push
			if (
				file.location === SOURCE_CONTROL_FILE_LOCATION.remote &&
				file.type === SOURCE_CONTROL_FILE_TYPE.workflow &&
				file.status === SOURCE_CONTROL_FILE_STATUS.created
			) {
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.variables) {
				acc.variables.push(file);
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.tags) {
				acc.tags.push(file);
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow && currentWorkflowId === file.id) {
				acc.currentWorkflow = file;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.workflow) {
				acc.workflows.push(file);
				return acc;
			}

			if (file.type === SOURCE_CONTROL_FILE_TYPE.credential) {
				acc.credentials.push(file);
				return acc;
			}

			return acc;
		},
		{ tags: [], variables: [], credentials: [], workflows: [], currentWorkflow: undefined },
	);

const userNotices = computed(() => {
	const messages: Array<{ title: string; content: string }> = [];

	if (changes.value.credentials.length) {
		const { created, deleted, modified } = groupBy(changes.value.credentials, 'status');

		messages.push({
			title: 'Credentials',
			content: concatenateWithAnd([
				...(created?.length ? [`${created.length} added`] : []),
				...(deleted?.length ? [`${deleted.length} deleted`] : []),
				...(modified?.length ? [`${modified.length} changed`] : []),
			]),
		});
	}

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

	return messages;
});
const workflowId = computed(
	() =>
		([VIEWS.WORKFLOW].includes(route.name as VIEWS) && route.params.name?.toString()) || undefined,
);

const changes = computed(() => classifyFilesByType(props.data.status, workflowId.value));

const selectedChanges = ref<Set<string>>(new Set());
const toggleSelected = (id: string) => {
	if (selectedChanges.value.has(id)) {
		selectedChanges.value.delete(id);
	} else {
		selectedChanges.value.add(id);
	}
};

const maybeSelectCurrentWorkflow = (workflow?: SourceControlledFile) =>
	workflow && selectedChanges.value.add(workflow.id);
onMounted(() => maybeSelectCurrentWorkflow(changes.value.currentWorkflow));

const filters = ref<{ status?: SourceControlledFileStatus }>({});
const filtersApplied = computed(() => Boolean(Object.keys(filters.value).length));
const resetFilters = () => {
	filters.value = {};
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

	return changes.value.workflows.filter((workflow) => {
		if (!workflow.name.toLocaleLowerCase().includes(searchQuery)) {
			return false;
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

const commitMessage = ref('');
const isSubmitDisabled = computed(() => {
	if (!commitMessage.value.trim()) {
		return true;
	}

	const toBePushed =
		changes.value.credentials.length +
		changes.value.tags.length +
		changes.value.variables.length +
		selectedChanges.value.size;

	return toBePushed <= 0;
});

const sortedWorkflowsSet = computed(() => new Set(sortedWorkflows.value.map(({ id }) => id)));

const selectAll = computed(() => {
	if (!selectedChanges.value.size) {
		return false;
	}

	const notSelectedVisibleItems = toRaw(sortedWorkflowsSet.value).difference(selectedChanges.value);

	return !Boolean(notSelectedVisibleItems.size);
});

const selectAllIndeterminate = computed(() => {
	if (!selectedChanges.value.size) {
		return false;
	}

	const selectedVisibleItems = toRaw(selectedChanges.value).intersection(sortedWorkflowsSet.value);

	if (selectedVisibleItems.size === 0) {
		return false;
	}

	return !selectAll.value;
});

function onToggleSelectAll() {
	const selected = toRaw(selectedChanges.value);
	if (selectAll.value) {
		selectedChanges.value = selected.difference(sortedWorkflowsSet.value);
	} else {
		selectedChanges.value = selected.union(sortedWorkflowsSet.value);
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

	if (selectedChanges.value.size) {
		messages.push(
			i18n.baseText('generic.workflow', {
				adjustToNumber: selectedChanges.value.size,
				interpolate: { count: selectedChanges.value.size },
			}),
		);
	}

	if (changes.value.credentials.length) {
		messages.push(
			i18n.baseText('generic.credential', {
				adjustToNumber: changes.value.credentials.length,
				interpolate: { count: changes.value.credentials.length },
			}),
		);
	}

	if (changes.value.variables.length) {
		messages.push(i18n.baseText('generic.variable_plural'));
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
		.concat(changes.value.credentials)
		.concat(changes.value.workflows.filter((file) => selectedChanges.value.has(file.id)));
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

const modalHeight = computed(() => (changes.value.workflows.length ? 'min(80vh, 850px)' : 'auto'));

watch(
	() => filters.value.status,
	(status) => {
		telemetry.track('User filtered by status in commit modal', { status });
	},
);
watch(refDebounced(search, 500), (term) => {
	telemetry.track('User searched workflows in commit modal', { search: term });
});
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

			<div v-if="changes.workflows.length" :class="[$style.filtersRow]" class="mt-l">
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
								icon="filter"
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
							>
							</N8nOption>
						</N8nSelect>
					</N8nPopover>
				</div>

				<div>
					<N8nText bold color="text-base" size="small">
						{{ selectedChanges.size }} of {{ changes.workflows.length }}
					</N8nText>
					<N8nText color="text-base" size="small"> workflows selected</N8nText>
				</div>
			</div>
		</template>
		<template #content>
			<div :class="[$style.table]" v-if="changes.workflows.length">
				<div :class="[$style.tableHeader]">
					<N8nCheckbox
						:class="$style.selectAll"
						:indeterminate="selectAllIndeterminate"
						:model-value="selectAll"
						data-test-id="source-control-push-modal-toggle-all"
						@update:model-value="onToggleSelectAll"
					>
						<N8nText> Title </N8nText>
					</N8nCheckbox>
				</div>
				<div style="flex: 1; overflow: hidden">
					<N8nInfoTip v-if="filtersApplied && !sortedWorkflows.length" :bold="false">
						{{ i18n.baseText('workflows.filters.active') }}
						<N8nLink size="small" data-test-id="source-control-filters-reset" @click="resetFilters">
							{{ i18n.baseText('workflows.filters.active.reset') }}
						</N8nLink>
					</N8nInfoTip>
					<DynamicScroller
						v-if="sortedWorkflows.length"
						:class="[$style.scroller]"
						:items="sortedWorkflows"
						:min-item-size="58"
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
									:model-value="selectedChanges.has(file.id)"
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
											<strong>{{ file.name || file.id }}</strong>
										</N8nText>
										<N8nText v-else tag="div" bold color="text-dark" :class="[$style.listItemName]">
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
										<N8nBadge :theme="getStatusTheme(file.status)">
											{{ getStatusText(file.status) }}
										</N8nBadge>
									</span>
								</N8nCheckbox>
							</DynamicScrollerItem>
						</template>
					</DynamicScroller>
				</div>
			</div>
		</template>

		<template #footer>
			<N8nNotice v-if="userNotices.length" :compact="false" class="mt-0">
				<N8nText bold size="medium">Changes to credentials, variables and tags </N8nText>
				<br />
				<template v-for="{ title, content } in userNotices" :key="title">
					<N8nText bold size="small">{{ title }}</N8nText>
					<N8nText size="small">: {{ content }}. </N8nText>
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
					@keydown.enter="onCommitKeyDownEnter"
				/>
				<N8nButton
					data-test-id="source-control-push-modal-submit"
					type="primary"
					:disabled="isSubmitDisabled"
					size="large"
					@click="commitAndPush"
				>
					{{ i18n.baseText('settings.sourceControl.modals.push.buttons.save') }}
					{{ selectedChanges.size ? `(${selectedChanges.size})` : undefined }}
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
	border-radius: 8px;
}

.tableHeader {
	border-bottom: var(--border-base);
	padding: 10px 16px;
}
</style>
