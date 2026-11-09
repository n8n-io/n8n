<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME, MIGRATE_WORKFLOW_MODAL_KEY, VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type {
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import {
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nIcon,
	N8nInfoTip,
	N8nInput,
	N8nLink,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nSelectedItemsInfo,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nStatusDot,
	N8nText,
	N8nTooltip,
	N8nUserSelect,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { useAsyncState, useDebounceFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { I18nT } from 'vue-i18n';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import FindingStateSelect from './components/FindingStateSelect.vue';
import HowToFixPanel from './components/HowToFixPanel.vue';
import ImpactTag from './components/ImpactTag.vue';
import WorkflowFiltersPopover from './components/WorkflowFiltersPopover.vue';
import SplitButton from './components/SplitButton.vue';
import ArchiveWorkflowsModal from './ArchiveWorkflowsModal.vue';
import { useArchiveFlow } from './composables/useArchiveFlow';
import { useFindingTriage } from './composables/useFindingTriage';
import { useOwnerNotify } from './composables/useOwnerNotify';
import { useOwnerPicker } from './composables/useOwnerPicker';
import {
	archiveTargets,
	canNotifyRow,
	findUnusedOpenWorkflows,
	notifyOwnerCount,
	notifyTargets,
	statusChangeTargets,
} from './bulkTargets';
import {
	findingState,
	isBusy,
	isSelectable,
	isStale,
	type MigrationContext,
	type RowContext,
} from './findingState';
import {
	countQuickFilters,
	DEFAULT_WORKFLOW_FILTERS,
	filterWorkflows,
	UNUSED_WORKFLOW_FILTERS,
	type WorkflowFilters,
} from './workflowFilters';
import {
	buildOwnerFilterOptions,
	buildProjectFilterOptions,
	ownerLabel,
	projectLabel,
} from './workflowLabels';
import { SORT_OPTIONS, sortOptionFor, sortWorkflows } from './workflowSort';

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();
const rbacStore = useRBACStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();
const route = useRoute();

// The server lists only the workflows the user can edit, and editing a workflow
// allows triaging and migrating it. So every row is editable. A notification
// emails other users, so it needs `breakingChanges:migrate` and SMTP.
const canNotify = computed(
	() => rbacStore.hasScope('breakingChanges:migrate') && settingsStore.isSmtpSetup,
);

const { state, isLoading } = useAsyncState<BreakingChangeRuleDetailResult>(
	async () => {
		const response = await breakingChangesApi.getReportForRule(
			rootStore.restApiContext,
			props.migrationRuleId,
		);

		return response;
	},
	{
		ruleId: '',
		ruleTitle: '',
		ruleDescription: '',
		ruleImpact: 'capabilityRemoved',
		affectedWorkflows: [],
		recommendations: [],
		migratable: false,
	},
);

type AffectedWorkflow = BreakingChangeRuleDetailWorkflow;

// The async state is shallow, so the list is replaced rather than mutated.
function updateRows(update: (rows: AffectedWorkflow[]) => AffectedWorkflow[]) {
	state.value = { ...state.value, affectedWorkflows: update(state.value.affectedWorkflows) };
}

const unassignedLabel = computed(() =>
	i18n.baseText('settings.migrationReport.detail.table.unassigned'),
);
const personalLabel = computed(() =>
	i18n.baseText('settings.migrationReport.detail.filters.project.personal'),
);

const { isLoadingUsers, ownerOptionsFor, onOwnerPickerFocus, onOwnerChange } =
	useOwnerPicker(updateRows);

const showMigrate = computed(() => state.value.migratable);

/** Rule descriptions arrive with or without a trailing period; the header copy always ends in one. */
const ruleDescription = computed(() => {
	const description = state.value.ruleDescription;
	if (!description) return '';
	return description.endsWith('.') ? description : `${description}.`;
});

const tableHeaders = computed<Array<TableHeader<AffectedWorkflow>>>(() => {
	const headers: Array<TableHeader<AffectedWorkflow>> = [
		{
			title: i18n.baseText('settings.migrationReport.detail.table.name'),
			key: 'name',
			width: 240,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.nodesAffected'),
			key: 'issues',
			width: 200,
			disableSort: true,
		},
		{
			// The cell shows the last run under the run count. It sorts by the run count.
			title: i18n.baseText('settings.migrationReport.detail.table.usage'),
			key: 'numberOfExecutions',
			width: 160,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.owner'),
			key: 'owner',
			value: (workflow) => ownerLabel(workflow, unassignedLabel.value),
			width: 220,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.state'),
			key: 'status',
			width: 150,
		},
	];

	// The actions column holds the Migrate and Notify buttons.
	if (showMigrate.value || canNotify.value) {
		headers.push({
			title: '',
			key: 'actions',
			value: () => '',
			width: (showMigrate.value ? 160 : 0) + (canNotify.value ? 110 : 0),
			disableSort: true,
		});
	}

	return headers;
});

function runCountLabel(workflow: AffectedWorkflow): string {
	return i18n.baseText('settings.migrationReport.detail.table.runs', {
		adjustToNumber: workflow.numberOfExecutions,
		interpolate: { count: workflow.numberOfExecutions.toLocaleString(rootStore.defaultLocale) },
	});
}

// Workflows successfully migrated this session (the row shows a "Migrated" state).
const migratedWorkflowIds = ref<Set<string>>(new Set());

// The modal runs the migration (confirm → progress → result) and emits back when a
// workflow was migrated so the row can reflect it.
const migrateModalBus = createEventBus();
// A migrated row cannot be selected, so it also leaves the selection.
migrateModalBus.on('migrated', ({ workflowId }: { workflowId: string }) => {
	migratedWorkflowIds.value = new Set(migratedWorkflowIds.value).add(workflowId);
	selectedWorkflowIds.value = selectedWorkflowIds.value.filter(
		(selectedId) => selectedId !== workflowId,
	);
});

function openMigrateModal(workflows: AffectedWorkflow[]) {
	uiStore.openModalWithData({
		name: MIGRATE_WORKFLOW_MODAL_KEY,
		data: {
			ruleId: props.migrationRuleId,
			workflows,
			recommendations: state.value.recommendations,
			eventBus: migrateModalBus,
		},
	});
}

// Won't fix counts as resolved, so the badge counts only the unresolved findings. A
// migration fixes the finding on save, so a migrated row is not unresolved either.
const openCount = computed(() => quickFilterCounts.value.open);

const { savingWorkflowIds, onFindingStatusChange, changeFindingStatuses } = useFindingTriage({
	ruleId: () => props.migrationRuleId,
	updateRows,
	isBusy: (workflow) => isBusy(workflow, rowContext.value),
	onRowWontFix: (workflow) => promptToArchive(workflow),
});

const { notifyingWorkflowIds, onNotify, notifyMany } = useOwnerNotify({
	ruleId: () => props.migrationRuleId,
	updateRows,
	isBusy: (workflow) => isBusy(workflow, rowContext.value),
});

// Filtering and the quick counts read only this, so the saving and notifying marks coming and
// going do not recompute them. The row changes of a save or a notification still do.
const migrationContext = computed<MigrationContext>(() => ({
	migratedIds: migratedWorkflowIds.value,
}));

const rowContext = computed<RowContext>(() => ({
	...migrationContext.value,
	savingIds: savingWorkflowIds.value,
	notifyingIds: notifyingWorkflowIds.value,
}));

const selectedWorkflowIds = ref<string[]>([]);

const selectedWorkflows = computed(() => {
	const selected = new Set(selectedWorkflowIds.value);
	return state.value.affectedWorkflows.filter((workflow) => selected.has(workflow.id));
});

function bulkTargets(status: MigrationFindingTriageStatus): AffectedWorkflow[] {
	return statusChangeTargets(selectedWorkflows.value, status, rowContext.value);
}

async function onBulkStatusChange(status: MigrationFindingTriageStatus) {
	const workflows = bulkTargets(status);
	if (workflows.length === 0) return;

	if (!(await changeFindingStatuses(workflows, status))) return;
	// Keep the rows that the user selected while the request was in flight.
	const changed = new Set(workflows.map((workflow) => workflow.id));
	selectedWorkflowIds.value = selectedWorkflowIds.value.filter(
		(workflowId) => !changed.has(workflowId),
	);
}

const unusedOpenWorkflows = computed(() =>
	findUnusedOpenWorkflows(state.value.affectedWorkflows, rowContext.value),
);

const bulkNotifyTargets = computed(() =>
	notifyTargets(selectedWorkflows.value, rowContext.value, canNotify.value),
);

const bulkNotifyOwnerCount = computed(() => notifyOwnerCount(bulkNotifyTargets.value));

const bulkNotifyLabel = computed(() =>
	bulkNotifyOwnerCount.value > 0
		? i18n.baseText('settings.migrationReport.detail.bulk.notifyOwnerCount', {
				adjustToNumber: bulkNotifyOwnerCount.value,
				interpolate: { count: String(bulkNotifyOwnerCount.value) },
			})
		: i18n.baseText('settings.migrationReport.detail.bulk.notifyOwners'),
);

const isBulkNotifying = computed(() =>
	selectedWorkflows.value.some((workflow) => notifyingWorkflowIds.value.has(workflow.id)),
);

const selectedWithoutOwnerCount = computed(
	() => selectedWorkflows.value.filter((workflow) => !workflow.owner?.email).length,
);

async function onBulkNotify() {
	const notified = new Set(await notifyMany(bulkNotifyTargets.value));
	// Keep the rows that the user selected while the request was in flight.
	selectedWorkflowIds.value = selectedWorkflowIds.value.filter(
		(workflowId) => !notified.has(workflowId),
	);
}

// Show only the rows that the callout counts.
function reviewUnusedWorkflows() {
	searchInput.value = '';
	searchQuery.value = '';
	workflowFilters.value = { ...UNUSED_WORKFLOW_FILTERS };
}

const {
	archiveDialog,
	promptToArchive,
	startBulkArchive,
	onArchiveDialogConfirm,
	closeArchiveDialog,
} = useArchiveFlow({
	ruleImpact: () => state.value.ruleImpact,
	updateRows,
	stateOf: (workflow) => findingState(workflow, rowContext.value),
	markWontFix: async (workflows) => await changeFindingStatuses(workflows, 'wont_fix'),
	onBulkArchiveStart: (workflowIds) => {
		const started = new Set(workflowIds);
		selectedWorkflowIds.value = selectedWorkflowIds.value.filter(
			(workflowId) => !started.has(workflowId),
		);
	},
});

const bulkArchiveTargets = computed(() =>
	archiveTargets(selectedWorkflows.value, rowContext.value),
);

const bulkWontFixActions = computed(() => [
	{
		label: i18n.baseText('settings.migrationReport.detail.bulk.wontFixAndArchive'),
		value: 'wontFixAndArchive',
		disabled: bulkArchiveTargets.value.length === 0,
	},
]);

function onBulkWontFixAndArchive() {
	startBulkArchive(bulkArchiveTargets.value);
}

async function markUnusedWorkflowsAsWontFix() {
	const workflows = unusedOpenWorkflows.value;
	if (workflows.length === 0) return;
	await changeFindingStatuses(workflows, 'wont_fix');
}

function workflowUrl(workflow: AffectedWorkflow): string {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }).href;
}

const sortBy = ref([{ id: 'numberOfExecutions', desc: true }]);

const sortOptions = computed(() =>
	SORT_OPTIONS.map((option) => ({ ...option, label: i18n.baseText(option.labelKey) })),
);

const sortOption = computed(() => sortOptionFor(sortBy.value));

function onSortChange(value: string) {
	const option = SORT_OPTIONS.find((candidate) => candidate.value === value);
	if (option) sortBy.value = [{ id: option.id, desc: option.desc }];
}

// Filter state
const searchInput = ref('');
const searchQuery = ref(''); // Debounced value for filtering
// The notification email links here with `?owner=me` to show the recipient's workflows.
const workflowFilters = ref<WorkflowFilters>({
	...DEFAULT_WORKFLOW_FILTERS,
	...(route.query.owner === 'me' && usersStore.currentUserId
		? { owner: usersStore.currentUserId }
		: {}),
});

// Debounced search to avoid excessive filtering
const debouncedSearch = useDebounceFn((value: string) => {
	searchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const onSearchInput = (value: string) => {
	searchInput.value = value; // Update input immediately
	void debouncedSearch(value); // Debounce the filter update
};

const currentUserId = computed(() => usersStore.currentUserId ?? undefined);

const quickFilterCounts = computed(() =>
	countQuickFilters(state.value.affectedWorkflows, migrationContext.value, currentUserId.value),
);

const ownerFilterOptions = computed(() =>
	buildOwnerFilterOptions(state.value.affectedWorkflows, unassignedLabel.value),
);

const projectFilterOptions = computed(() =>
	buildProjectFilterOptions(state.value.affectedWorkflows, personalLabel.value),
);

const filteredWorkflows = computed(() =>
	filterWorkflows(
		state.value.affectedWorkflows,
		searchQuery.value,
		workflowFilters.value,
		migrationContext.value,
	),
);

// A bulk action must not change rows the user cannot see, so a search or a
// filter drops the hidden rows from the selection.
watch(filteredWorkflows, (workflows) => {
	const visible = new Set(workflows.map((workflow) => workflow.id));
	const kept = selectedWorkflowIds.value.filter((workflowId) => visible.has(workflowId));
	if (kept.length !== selectedWorkflowIds.value.length) selectedWorkflowIds.value = kept;
});

const sortedWorkflows = computed(() =>
	sortWorkflows(filteredWorkflows.value, sortBy.value, unassignedLabel.value),
);

const page = ref(0);
const itemsPerPage = ref(25);

const pagedWorkflows = computed(() =>
	sortedWorkflows.value.slice(
		page.value * itemsPerPage.value,
		(page.value + 1) * itemsPerPage.value,
	),
);

watch([searchQuery, workflowFilters, sortBy], () => {
	page.value = 0;
});

// Resolving rows can empty the last page, so the page moves back to the last one with rows.
watch(
	() => sortedWorkflows.value.length,
	(length) => {
		const lastPage = Math.max(0, Math.ceil(length / itemsPerPage.value) - 1);
		if (page.value > lastPage) page.value = lastPage;
	},
);
</script>

<template>
	<N8nSettingsLayout
		full-width
		show-back
		:back-label="i18n.baseText('generic.back')"
		@back="router.push({ name: VIEWS.MIGRATION_REPORT })"
	>
		<header v-if="isLoading" :class="$style.pageHeader">
			<div class="mb-2xs">
				<N8nLoading variant="h1" />
			</div>
			<div>
				<N8nLoading variant="p" :rows="2" />
			</div>
		</header>
		<N8nSettingsPageHeader
			v-else
			:title="state.ruleTitle"
			:description="ruleDescription"
			:show-docs-link="Boolean(state.ruleDocumentationUrl)"
			:docs-url="state.ruleDocumentationUrl"
			:docs-label="i18n.baseText('settings.migrationReport.documentation')"
			docs-leading-text=""
		>
			<template #titleTrailing>
				<ImpactTag :impact="state.ruleImpact" />
				<N8nBadge>
					{{
						i18n.baseText('settings.migrationReport.detail.affectedTag', {
							interpolate: { count: String(openCount) },
						})
					}}
				</N8nBadge>
			</template>
		</N8nSettingsPageHeader>

		<HowToFixPanel
			v-if="!isLoading"
			:class="$style.howToFix"
			:recommendations="state.recommendations"
			:documentation-url="state.ruleDocumentationUrl"
			:migratable="state.migratable"
		/>

		<div
			v-if="!isLoading && unusedOpenWorkflows.length > 0"
			:class="$style.unusedCallout"
			data-test-id="migration-rule-unused-callout"
		>
			<N8nText color="text-dark">
				{{
					i18n.baseText('settings.migrationReport.detail.unusedCallout.message', {
						adjustToNumber: unusedOpenWorkflows.length,
						interpolate: { count: String(unusedOpenWorkflows.length) },
					})
				}}
			</N8nText>
			<div :class="$style.unusedCalloutActions">
				<N8nButton
					variant="ghost"
					size="small"
					data-test-id="migration-rule-unused-review"
					@click="reviewUnusedWorkflows"
				>
					{{ i18n.baseText('settings.migrationReport.detail.unusedCallout.review') }}
				</N8nButton>
				<N8nButton
					size="small"
					data-test-id="migration-rule-unused-mark-all"
					@click="markUnusedWorkflowsAsWontFix"
				>
					{{
						i18n.baseText('settings.migrationReport.detail.unusedCallout.markAll', {
							interpolate: { count: String(unusedOpenWorkflows.length) },
						})
					}}
				</N8nButton>
			</div>
		</div>

		<div :class="$style.toolbar">
			<N8nInput
				:model-value="searchInput"
				:placeholder="i18n.baseText('settings.migrationReport.detail.search.placeholder')"
				size="small"
				clearable
				:class="$style.search"
				data-test-id="migration-rule-search"
				@update:model-value="onSearchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nSelect
				:model-value="sortOption"
				size="small"
				:placeholder="i18n.baseText('settings.migrationReport.detail.sort.none')"
				:class="$style.sort"
				data-test-id="migration-rule-sort"
				@update:model-value="onSortChange"
			>
				<N8nOption
					v-for="option in sortOptions"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					data-test-id="migration-rule-sort-item"
				/>
			</N8nSelect>
			<WorkflowFiltersPopover
				v-model="workflowFilters"
				:owners="ownerFilterOptions"
				:projects="projectFilterOptions"
				:current-user-id="currentUserId"
				:counts="quickFilterCounts"
			/>
		</div>

		<N8nDataTableServer
			:key="String(state.migratable)"
			v-model:sort-by="sortBy"
			v-model:selection="selectedWorkflowIds"
			v-model:page="page"
			v-model:items-per-page="itemsPerPage"
			show-select
			:item-selectable="(item: AffectedWorkflow) => isSelectable(item, rowContext)"
			:items="pagedWorkflows"
			:items-length="sortedWorkflows.length"
			:headers="tableHeaders"
			:loading="isLoading"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.cellStack">
					<div :class="$style.nameRow">
						<N8nTooltip
							v-if="item.active"
							:content="i18n.baseText('settings.migrationReport.detail.table.published')"
						>
							<span
								:class="$style.publishedDot"
								role="img"
								:aria-label="i18n.baseText('settings.migrationReport.detail.table.published')"
								data-test-id="migration-workflow-published"
							>
								<N8nStatusDot variant="success" />
							</span>
						</N8nTooltip>
						<N8nLink
							theme="text"
							:to="workflowUrl(item)"
							new-window
							:title="item.name"
							:class="[$style.truncate, $style.workflowName]"
							data-test-id="migration-workflow-name-link"
						>
							{{ item.name }}
						</N8nLink>
					</div>
					<N8nText size="small" color="text-light" :class="$style.nameDetails">
						<span
							:class="$style.project"
							:title="projectLabel(item, personalLabel)"
							data-test-id="migration-workflow-project"
						>
							<ProjectIcon
								:icon="{
									type: 'icon',
									value: item.homeProjectType === 'personal' ? 'user' : 'layers',
								}"
								border-less
								size="mini"
							/>
							<span :class="$style.truncate">{{ projectLabel(item, personalLabel) }}</span>
						</span>
						<span :class="$style.updated">
							·
							<I18nT
								keypath="settings.migrationReport.detail.table.updated"
								tag="span"
								scope="global"
							>
								<template #time>
									<TimeAgo :date="item.lastUpdatedAt.toString()" />
								</template>
							</I18nT>
						</span>
					</N8nText>
				</div>
			</template>
			<template #[`item.issues`]="{ item }">
				<div :class="[$style.truncate, $style.nodeNames]">
					<template v-for="(issue, index) in item.issues" :key="issue.nodeId">
						<N8nLink theme="text" :to="`/workflow/${item.id}/${issue.nodeId}`" new-window>
							{{ issue.nodeName }}
						</N8nLink>
						<template v-if="index < item.issues.length - 1">, </template>
					</template>
				</div>
			</template>
			<template #[`item.numberOfExecutions`]="{ item }">
				<div :class="$style.cellStack">
					<N8nText color="text-dark">{{ runCountLabel(item) }}</N8nText>
					<N8nText
						size="small"
						:color="isStale(item) ? 'danger' : 'text-light'"
						data-test-id="migration-workflow-last-run"
					>
						<I18nT
							v-if="item.lastExecutedAt"
							keypath="settings.migrationReport.detail.table.lastRun"
							tag="span"
							scope="global"
						>
							<template #time>
								<TimeAgo :date="item.lastExecutedAt.toString()" />
							</template>
						</I18nT>
						<template v-else>
							{{ i18n.baseText('settings.migrationReport.detail.table.neverRun') }}
						</template>
					</N8nText>
				</div>
			</template>
			<template #[`item.owner`]="{ item }">
				<N8nUserSelect
					size="small"
					:users="ownerOptionsFor(item)"
					hide-email-in-label
					show-avatar
					borderless
					:model-value="item.owner?.id ?? ''"
					:placeholder="i18n.baseText('settings.migrationReport.detail.table.unassigned')"
					:loading="isLoadingUsers"
					clearable
					data-test-id="migration-owner-select"
					@focus="onOwnerPickerFocus(item)"
					@update:model-value="(userId: string) => onOwnerChange(item, userId)"
				/>
			</template>
			<template #[`item.status`]="{ item }">
				<FindingStateSelect
					:model-value="item.status"
					:disabled="
						savingWorkflowIds.has(item.id) ||
						notifyingWorkflowIds.has(item.id) ||
						migratedWorkflowIds.has(item.id)
					"
					@update:model-value="onFindingStatusChange(item, $event)"
				/>
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions">
					<N8nButton
						v-if="canNotifyRow(item, rowContext, canNotify)"
						variant="outline"
						size="small"
						:loading="notifyingWorkflowIds.has(item.id)"
						:label="
							i18n.baseText(
								item.notifiedAt
									? 'settings.migrationReport.detail.notify.remind'
									: 'settings.migrationReport.detail.notify.button',
							)
						"
						data-test-id="migration-notify-owner-button"
						@click="onNotify(item)"
					/>
					<N8nInfoTip
						v-if="item.notifiedAt"
						type="tooltip"
						theme="info"
						:bold="false"
						data-test-id="migration-workflow-notified-at"
					>
						<I18nT
							keypath="settings.migrationReport.detail.table.notifiedAt"
							tag="span"
							scope="global"
						>
							<template #time>
								<TimeAgo :date="item.notifiedAt.toString()" />
							</template>
						</I18nT>
					</N8nInfoTip>
					<template v-if="showMigrate">
						<N8nText v-if="migratedWorkflowIds.has(item.id)" color="text-light" size="small">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.migrated') }}
						</N8nText>
						<N8nButton
							v-else
							size="small"
							:label="i18n.baseText('settings.migrationReport.detail.migrate.button')"
							data-test-id="migrate-workflow-button"
							@click="openMigrateModal([item])"
						/>
					</template>
				</div>
			</template>
		</N8nDataTableServer>

		<div v-if="selectedWorkflowIds.length > 0" :class="$style.selectionBar">
			<N8nSelectedItemsInfo
				:selected-count="selectedWorkflowIds.length"
				@clear-selection="selectedWorkflowIds = []"
			>
				<template #actions>
					<N8nButton
						v-if="showMigrate"
						variant="outline"
						:label="i18n.baseText('settings.migrationReport.detail.bulk.migrate')"
						data-test-id="migration-bulk-migrate-button"
						@click="openMigrateModal(selectedWorkflows)"
					/>
					<template v-if="canNotify">
						<N8nTooltip
							:content="i18n.baseText('settings.migrationReport.detail.bulk.notify.tooltip')"
							:disabled="bulkNotifyOwnerCount === 0"
						>
							<N8nButton
								variant="outline"
								:label="bulkNotifyLabel"
								:disabled="bulkNotifyTargets.length === 0"
								:loading="isBulkNotifying"
								data-test-id="migration-bulk-notify-button"
								@click="onBulkNotify"
							/>
						</N8nTooltip>
						<N8nText
							v-if="selectedWithoutOwnerCount > 0"
							size="small"
							color="text-light"
							data-test-id="migration-bulk-notify-no-owner"
						>
							{{
								i18n.baseText('settings.migrationReport.detail.bulk.notify.noOwner', {
									interpolate: { count: String(selectedWithoutOwnerCount) },
								})
							}}
						</N8nText>
					</template>
					<SplitButton
						:label="i18n.baseText('settings.migrationReport.detail.bulk.wontFix')"
						:disabled="bulkTargets('wont_fix').length === 0"
						:actions="bulkWontFixActions"
						:toggle-label="i18n.baseText('settings.migrationReport.detail.bulk.wontFixMore')"
						data-test-id="migration-bulk-wont-fix-button"
						@click="onBulkStatusChange('wont_fix')"
						@action="onBulkWontFixAndArchive"
					/>
					<N8nButton
						variant="outline"
						:label="i18n.baseText('settings.migrationReport.detail.bulk.reopen')"
						:disabled="bulkTargets('open').length === 0"
						data-test-id="migration-bulk-reopen-button"
						@click="onBulkStatusChange('open')"
					/>
				</template>
			</N8nSelectedItemsInfo>
		</div>
		<ArchiveWorkflowsModal
			v-if="archiveDialog"
			:mode="archiveDialog.mode"
			:workflows="archiveDialog.workflows"
			@confirm="onArchiveDialogConfirm"
			@close="closeArchiveDialog"
		/>
	</N8nSettingsLayout>
</template>

<style module>
/* Loading placeholder for the header: mirrors N8nSettingsPageHeader's self-capping so the
   skeleton column stays centered while the table below spans the full-width layout. */
.pageHeader {
	width: 100%;
	max-width: var(--settings-content--max-width, 45rem);
	margin-inline: auto;
}

.howToFix {
	margin-bottom: var(--spacing--md);
}

.unusedCallout {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm) var(--spacing--md);
	margin-bottom: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--lg);
	background-color: var(--color--background--light-3);
}

.unusedCalloutActions {
	display: flex;
	flex-shrink: 0;
	gap: var(--spacing--2xs);
}

.cellStack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.truncate {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

/* The ellipsis takes the anchor color, so match it to the link text. */
.workflowName {
	color: var(--color--text);
}

/* A dot before the name shows the published state, so the second line has room for the project. */
.nameRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.publishedDot {
	display: inline-flex;
	flex-shrink: 0;
}

.nameDetails {
	display: flex;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

/* A long project name truncates, so the updated time stays in view. */
.project {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.updated {
	flex-shrink: 0;
}

.nodeNames {
	font-family: var(--font-family--monospace);
}

.actions {
	display: flex;
	align-items: center;
	justify-content: end;
	gap: var(--spacing--sm);
}

/* Sticks to the bottom of the viewport, so the floating selection bar stays in
   view while a long table scrolls. The height holds the bar and its bottom
   offset, so the bar does not cover the rows of a short table. */
.selectionBar {
	position: sticky;
	bottom: 0;
	height: calc(var(--spacing--3xl) + var(--spacing--2xl));
}

/* Matches the search, sort and filter row of the Overview lists. */
.toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	align-items: center;
	justify-content: flex-end;
	margin-bottom: var(--spacing--md);
}

.search {
	flex: 0 1 20rem;
}

.sort {
	width: 196px;
}
</style>
