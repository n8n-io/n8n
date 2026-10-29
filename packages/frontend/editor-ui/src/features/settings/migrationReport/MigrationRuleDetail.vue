<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME, MIGRATE_WORKFLOW_MODAL_KEY, TIME, VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type {
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
	BreakingChangeWorkflowOwner,
	MigrationFindingListedStatus,
	MigrationFindingTriageStatus,
	MigrationNotifyResult,
	MigrationNotifySkipReason,
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
	N8nText,
	N8nTooltip,
	N8nUserSelect,
} from '@n8n/design-system';
import type { IUser, TableHeader } from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { useAsyncState, useDebounceFn } from '@vueuse/core';
import orderBy from 'lodash/orderBy';
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { I18nT } from 'vue-i18n';
import FindingStateSelect from './components/FindingStateSelect.vue';
import ImpactTag from './components/ImpactTag.vue';
import WorkflowFiltersPopover from './components/WorkflowFiltersPopover.vue';
import {
	DEFAULT_WORKFLOW_FILTERS,
	matchesWorkflowFilters,
	PERSONAL_PROJECTS,
	type WorkflowFilters,
} from './workflowFilters';

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();
const rbacStore = useRBACStore();
const settingsStore = useSettingsStore();
const usersStore = useUsersStore();
const toast = useToast();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();

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

// The picker lists the users who can open the focused row's workflow. One list
// serves every row, since only one picker is open at a time.
const isLoadingUsers = ref(false);
const activeWorkflowId = ref<string | undefined>();
const memberOptions = ref<IUser[]>([]);

function userOption(user: {
	id: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
}): IUser {
	const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
	return {
		id: user.id,
		firstName: user.firstName,
		lastName: user.lastName,
		email: user.email,
		fullName: fullName || undefined,
	};
}

// An owner that just came back from the server, registered as an option one
// tick before the row takes it as its value, so the picker can resolve the label.
const incomingOwners = ref(new Map<string, BreakingChangeWorkflowOwner>());

/** The candidates for the row's workflow, plus the row's owner so the picker never shows a bare id. */
function ownerOptionsFor(workflow: AffectedWorkflow): IUser[] {
	const options = workflow.id === activeWorkflowId.value ? [...memberOptions.value] : [];
	for (const owner of [workflow.owner, incomingOwners.value.get(workflow.id)]) {
		// The picker needs an email on every option; an owner without one is left out.
		if (owner?.email && !options.some((option) => option.id === owner.id)) {
			options.push(userOption(owner));
		}
	}
	return options;
}

// A focus on another row can start a new load before the last one answered;
// only the latest answer may fill the list.
let memberRequestSequence = 0;

async function loadMembers(workflowId: string) {
	const sequence = ++memberRequestSequence;
	isLoadingUsers.value = true;
	try {
		const candidates = await breakingChangesApi.getWorkflowOwnerCandidates(
			rootStore.restApiContext,
			workflowId,
		);
		if (sequence !== memberRequestSequence) return;
		// The picker needs an email on every option.
		memberOptions.value = candidates.filter((user) => user.email).map(userOption);
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.migrationReport.detail.owner.search.error.title'),
		);
	} finally {
		if (sequence === memberRequestSequence) isLoadingUsers.value = false;
	}
}

function onOwnerPickerFocus(workflow: AffectedWorkflow) {
	if (activeWorkflowId.value === workflow.id && memberOptions.value.length > 0) return;
	activeWorkflowId.value = workflow.id;
	memberOptions.value = [];
	void loadMembers(workflow.id);
}

// A quick second change can answer before the first; only the latest answer may land.
const ownerRequestSequence = new Map<string, number>();

async function onOwnerChange(workflow: AffectedWorkflow, userId: string) {
	const sequence = (ownerRequestSequence.get(workflow.id) ?? 0) + 1;
	ownerRequestSequence.set(workflow.id, sequence);
	try {
		const { owner } = userId
			? await breakingChangesApi.assignWorkflowOwner(rootStore.restApiContext, workflow.id, userId)
			: await breakingChangesApi.unassignWorkflowOwner(rootStore.restApiContext, workflow.id);
		if (ownerRequestSequence.get(workflow.id) !== sequence) return;
		if (owner) {
			incomingOwners.value = new Map(incomingOwners.value).set(workflow.id, owner);
			await nextTick();
		}
		// The async state is shallow, so the list is replaced rather than mutated.
		state.value = {
			...state.value,
			affectedWorkflows: state.value.affectedWorkflows.map((row) =>
				row.id === workflow.id ? { ...row, owner: owner ?? undefined } : row,
			),
		};
		const remaining = new Map(incomingOwners.value);
		remaining.delete(workflow.id);
		incomingOwners.value = remaining;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.owner.error.title'));
	}
}

function ownerLabel(workflow: AffectedWorkflow): string {
	const owner = workflow.owner;
	const fullName = [owner?.firstName, owner?.lastName].filter(Boolean).join(' ');
	return (
		fullName || owner?.email || i18n.baseText('settings.migrationReport.detail.table.unassigned')
	);
}

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
			title: i18n.baseText('settings.migrationReport.detail.table.project'),
			key: 'homeProjectName',
			value: projectLabel,
			width: 160,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.nodesAffected'),
			key: 'issues',
			width: 160,
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
			value: ownerLabel,
			width: 220,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.state'),
			key: 'status',
			width: 140,
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

// A workflow without a run in this period is probably not used any more.
const STALE_WORKFLOW_AFTER = 90 * TIME.DAY;

function isStale(workflow: AffectedWorkflow): boolean {
	if (!workflow.lastExecutedAt) return false;
	return Date.now() - new Date(workflow.lastExecutedAt).getTime() > STALE_WORKFLOW_AFTER;
}

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
const openCount = computed(
	() => state.value.affectedWorkflows.filter((workflow) => isUnresolved(workflow)).length,
);

// Rows with a state change in flight. One change at a time keeps the revert correct.
const savingWorkflowIds = ref<Set<string>>(new Set());

// Rows with a notification in flight. Its response sets the status, so a state
// change must wait for it.
const notifyingWorkflowIds = ref<Set<string>>(new Set());

function isBusy(workflow: AffectedWorkflow): boolean {
	return notifyingWorkflowIds.value.has(workflow.id) || savingWorkflowIds.value.has(workflow.id);
}

// The state is a shallow ref, so replace the list to make the table update.
function setFindingStatuses(statuses: Map<string, MigrationFindingListedStatus>) {
	state.value = {
		...state.value,
		affectedWorkflows: state.value.affectedWorkflows.map((workflow) => {
			const status = statuses.get(workflow.id);
			if (!status) return workflow;
			// Reopening drops the notified mark, as the server does.
			return status === 'open'
				? { ...workflow, status, notifiedAt: undefined }
				: { ...workflow, status };
		}),
	};
}

// Puts the rows back as they were before a failed change, notified date included.
function restoreWorkflows(rows: AffectedWorkflow[]) {
	const byId = new Map(rows.map((row) => [row.id, row]));
	state.value = {
		...state.value,
		affectedWorkflows: state.value.affectedWorkflows.map((row) => byId.get(row.id) ?? row),
	};
}

function setSaving(workflowIds: string[], saving: boolean) {
	const next = new Set(savingWorkflowIds.value);
	for (const workflowId of workflowIds) {
		if (saving) next.add(workflowId);
		else next.delete(workflowId);
	}
	savingWorkflowIds.value = next;
}

async function onFindingStatusChange(
	workflow: AffectedWorkflow,
	status: MigrationFindingTriageStatus,
) {
	if (status === workflow.status || isBusy(workflow)) return;

	setFindingStatuses(new Map([[workflow.id, status]]));
	setSaving([workflow.id], true);
	try {
		await breakingChangesApi.updateFindingStatus(
			rootStore.restApiContext,
			props.migrationRuleId,
			workflow.id,
			status,
		);
	} catch (error) {
		restoreWorkflows([workflow]);
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.state.error.title'));
	} finally {
		setSaving([workflow.id], false);
	}
}

const selectedWorkflowIds = ref<string[]>([]);

const selectedWorkflows = computed(() => {
	const selected = new Set(selectedWorkflowIds.value);
	return state.value.affectedWorkflows.filter((workflow) => selected.has(workflow.id));
});

// A migrated row has no state to change, so it cannot be selected.
function isSelectable(workflow: AffectedWorkflow): boolean {
	return !migratedWorkflowIds.value.has(workflow.id);
}

/**
 * The selected rows that a bulk change to `status` would change. A notified
 * row counts as changeable to open, like in the row's own select: reopening
 * drops the notified mark.
 */
function bulkTargets(status: MigrationFindingTriageStatus): AffectedWorkflow[] {
	return selectedWorkflows.value.filter(
		(workflow) => findingState(workflow) !== status && isSelectable(workflow) && !isBusy(workflow),
	);
}

/** Changes the state of all `workflows` in one request. Returns false when the request fails. */
async function changeFindingStatuses(
	workflows: AffectedWorkflow[],
	status: MigrationFindingTriageStatus,
): Promise<boolean> {
	const workflowIds = workflows.map((workflow) => workflow.id);
	setFindingStatuses(new Map(workflowIds.map((workflowId) => [workflowId, status])));
	setSaving(workflowIds, true);
	try {
		await breakingChangesApi.updateFindingStatuses(
			rootStore.restApiContext,
			props.migrationRuleId,
			workflowIds,
			status,
		);
		return true;
	} catch (error) {
		restoreWorkflows(workflows);
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.state.error.title'));
		return false;
	} finally {
		setSaving(workflowIds, false);
	}
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

// The callout offers to dismiss open findings on workflows that did not run for
// 12 months. The filters use the same rule, so "Review" can show them.
const UNUSED_WORKFLOW_FILTERS: WorkflowFilters = {
	...DEFAULT_WORKFLOW_FILTERS,
	state: 'open',
	lastRun: 'over12Months',
};

const unusedOpenWorkflows = computed(() => {
	const now = Date.now();
	return state.value.affectedWorkflows.filter(
		(workflow) =>
			!isBusy(workflow) &&
			matchesWorkflowFilters(workflow, UNUSED_WORKFLOW_FILTERS, now, findingState(workflow)),
	);
});

// An email goes to the owner, so a row without one has nobody to notify.
function canNotifyRow(workflow: AffectedWorkflow): boolean {
	return canNotify.value && !!workflow.owner?.email && isUnresolved(workflow);
}

const skipReasonKeys: Record<
	MigrationNotifySkipReason,
	| 'settings.migrationReport.detail.notify.skipped.noOwner'
	| 'settings.migrationReport.detail.notify.skipped.noFinding'
	| 'settings.migrationReport.detail.notify.skipped.sendFailed'
> = {
	no_owner: 'settings.migrationReport.detail.notify.skipped.noOwner',
	no_finding: 'settings.migrationReport.detail.notify.skipped.noFinding',
	send_failed: 'settings.migrationReport.detail.notify.skipped.sendFailed',
};

/**
 * Emails the owners of `workflows` in one request and marks the notified rows.
 * Returns undefined when the request fails.
 */
async function notifyOwners(
	workflows: AffectedWorkflow[],
): Promise<MigrationNotifyResult | undefined> {
	const workflowIds = workflows.map((workflow) => workflow.id);
	setNotifying(workflowIds, true);
	try {
		const result = await breakingChangesApi.notifyFindingOwners(
			rootStore.restApiContext,
			props.migrationRuleId,
			workflowIds,
		);
		const notified = new Set(result.notifiedWorkflowIds);
		const notifiedAt = new Date();
		state.value = {
			...state.value,
			affectedWorkflows: state.value.affectedWorkflows.map((row) =>
				notified.has(row.id) ? { ...row, status: 'notified', notifiedAt } : row,
			),
		};
		return result;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.notify.error.title'));
		return undefined;
	} finally {
		setNotifying(workflowIds, false);
	}
}

function setNotifying(workflowIds: string[], notifying: boolean) {
	const next = new Set(notifyingWorkflowIds.value);
	for (const workflowId of workflowIds) {
		if (notifying) next.add(workflowId);
		else next.delete(workflowId);
	}
	notifyingWorkflowIds.value = next;
}

/** Emails the owner of one workflow. A second call on a notified row is a reminder. */
async function onNotify(workflow: AffectedWorkflow) {
	if (isBusy(workflow)) return;
	const result = await notifyOwners([workflow]);
	if (!result) return;

	const skipped = result.skipped.find((entry) => entry.workflowId === workflow.id);
	if (skipped) {
		toast.showMessage({
			type: 'error',
			title: i18n.baseText('settings.migrationReport.detail.notify.error.title'),
			message: i18n.baseText(skipReasonKeys[skipped.reason]),
		});
		return;
	}
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('settings.migrationReport.detail.notify.success.title'),
		message: i18n.baseText('settings.migrationReport.detail.notify.success.message', {
			interpolate: { owner: ownerLabel(workflow), name: workflow.name },
		}),
	});
}

const bulkNotifyTargets = computed(() =>
	selectedWorkflows.value.filter((workflow) => canNotifyRow(workflow) && !isBusy(workflow)),
);

// The backend sends one email per owner, listing all of their selected workflows.
const bulkNotifyOwnerCount = computed(
	() => new Set(bulkNotifyTargets.value.map((workflow) => workflow.owner?.id)).size,
);

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
	const workflows = bulkNotifyTargets.value;
	if (workflows.length === 0) return;
	const result = await notifyOwners(workflows);
	if (!result) return;

	const notifiedCount = result.notifiedWorkflowIds.length;
	if (result.skipped.length > 0) {
		const reasons = new Set(result.skipped.map((entry) => entry.reason));
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText('settings.migrationReport.detail.bulk.notify.partial.title', {
				interpolate: { notified: String(notifiedCount), total: String(workflows.length) },
			}),
			message: [...reasons].map((reason) => i18n.baseText(skipReasonKeys[reason])).join('. '),
		});
	} else {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('settings.migrationReport.detail.bulk.notify.success.title', {
				adjustToNumber: notifiedCount,
				interpolate: { count: String(notifiedCount) },
			}),
		});
	}
	// Keep the rows that the user selected while the request was in flight.
	const notified = new Set(result.notifiedWorkflowIds);
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

async function markUnusedWorkflowsAsWontFix() {
	const workflows = unusedOpenWorkflows.value;
	if (workflows.length === 0) return;
	await changeFindingStatuses(workflows, 'wont_fix');
}

function workflowUrl(workflow: AffectedWorkflow): string {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }).href;
}

const sortBy = ref([{ id: 'numberOfExecutions', desc: true }]);

// The sort options of the Sort select. Each option sets one column and direction.
const sortOptions = computed(() => [
	{
		value: 'mostRuns',
		id: 'numberOfExecutions',
		desc: true,
		label: i18n.baseText('settings.migrationReport.detail.sort.mostRuns'),
	},
	{
		value: 'fewestRuns',
		id: 'numberOfExecutions',
		desc: false,
		label: i18n.baseText('settings.migrationReport.detail.sort.fewestRuns'),
	},
	{
		value: 'lastRun',
		id: 'lastExecutedAt',
		desc: true,
		label: i18n.baseText('settings.migrationReport.detail.sort.lastRun'),
	},
	{
		value: 'lastUpdated',
		id: 'lastUpdatedAt',
		desc: true,
		label: i18n.baseText('settings.migrationReport.detail.sort.lastUpdated'),
	},
	{
		value: 'nameAsc',
		id: 'name',
		desc: false,
		label: i18n.baseText('settings.migrationReport.detail.sort.nameAsc'),
	},
	{
		value: 'nameDesc',
		id: 'name',
		desc: true,
		label: i18n.baseText('settings.migrationReport.detail.sort.nameDesc'),
	},
]);

// A column header can also sort the table. A sort that no option describes
// leaves the select empty, and the header shows the sort.
const sortOption = computed(() => {
	const current = sortBy.value[0];
	if (!current) return undefined;
	return sortOptions.value.find(
		(option) => option.id === current.id && option.desc === current.desc,
	)?.value;
});

function onSortChange(value: string) {
	const option = sortOptions.value.find((candidate) => candidate.value === value);
	if (option) sortBy.value = [{ id: option.id, desc: option.desc }];
}

// Filter state
const searchInput = ref('');
const searchQuery = ref(''); // Debounced value for filtering
const workflowFilters = ref<WorkflowFilters>({ ...DEFAULT_WORKFLOW_FILTERS });

// Debounced search to avoid excessive filtering
const debouncedSearch = useDebounceFn((value: string) => {
	searchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const onSearchInput = (value: string) => {
	searchInput.value = value; // Update input immediately
	void debouncedSearch(value); // Debounce the filter update
};

// A migrated row shows as resolved, so it does not count as open.
function findingState(workflow: AffectedWorkflow): MigrationFindingListedStatus | 'migrated' {
	return migratedWorkflowIds.value.has(workflow.id) ? 'migrated' : workflow.status;
}

// A notified finding still needs a fix, so it counts as open.
function isUnresolved(workflow: AffectedWorkflow): boolean {
	const findingStatus = findingState(workflow);
	return findingStatus === 'open' || findingStatus === 'notified';
}

const wontFixCount = computed(
	() =>
		state.value.affectedWorkflows.filter((workflow) => findingState(workflow) === 'wont_fix')
			.length,
);

const unassignedCount = computed(
	() => state.value.affectedWorkflows.filter((workflow) => !workflow.owner).length,
);

const currentUserId = computed(() => usersStore.currentUserId ?? undefined);

const assignedToMeCount = computed(
	() =>
		state.value.affectedWorkflows.filter((workflow) => workflow.owner?.id === currentUserId.value)
			.length,
);

const quickFilterCounts = computed(() => ({
	assignedToMe: assignedToMeCount.value,
	open: openCount.value,
	wontFix: wontFixCount.value,
	unassigned: unassignedCount.value,
}));

// The owners of the listed workflows, for the owner filter.
const ownerFilterOptions = computed(() => {
	const owners = new Map<string, string>();
	for (const workflow of state.value.affectedWorkflows) {
		if (workflow.owner) owners.set(workflow.owner.id, ownerLabel(workflow));
	}
	return orderBy(
		[...owners].map(([id, label]) => ({ id, label })),
		[(owner) => owner.label.toLowerCase()],
	);
});

// Personal projects show as one "Personal" label, the Owner column names the person.
function projectLabel(workflow: AffectedWorkflow): string {
	if (workflow.homeProjectType === 'personal') {
		return i18n.baseText('settings.migrationReport.detail.filters.project.personal');
	}
	return workflow.homeProjectName ?? '—';
}

// The projects of the listed workflows, for the project filter. Personal projects share one option.
const projectFilterOptions = computed(() => {
	const projects = new Map<string, string>();
	let hasPersonal = false;
	for (const workflow of state.value.affectedWorkflows) {
		if (workflow.homeProjectType === 'personal') hasPersonal = true;
		else if (workflow.homeProjectType === 'team' && workflow.homeProjectId) {
			projects.set(workflow.homeProjectId, workflow.homeProjectName ?? workflow.homeProjectId);
		}
	}
	const teamOptions = orderBy(
		[...projects].map(([id, label]) => ({ id, label })),
		[(project) => project.label.toLowerCase()],
	);
	if (!hasPersonal) return teamOptions;
	const personalLabel = i18n.baseText('settings.migrationReport.detail.filters.project.personal');
	return [{ id: PERSONAL_PROJECTS, label: personalLabel }, ...teamOptions];
});

const filteredWorkflows = computed(() => {
	const query = searchQuery.value.toLowerCase();
	const now = Date.now();
	return state.value.affectedWorkflows.filter(
		(workflow) =>
			(!query || workflow.name.toLowerCase().includes(query)) &&
			matchesWorkflowFilters(workflow, workflowFilters.value, now, findingState(workflow)),
	);
});

// A bulk action must not change rows the user cannot see, so a search or a
// filter drops the hidden rows from the selection.
watch(filteredWorkflows, (workflows) => {
	const visible = new Set(workflows.map((workflow) => workflow.id));
	const kept = selectedWorkflowIds.value.filter((workflowId) => visible.has(workflowId));
	if (kept.length !== selectedWorkflowIds.value.length) selectedWorkflowIds.value = kept;
});

// The owner and project cells show a label, so they sort by that label.
// Dates come from JSON as strings, and a workflow that never ran has no date.
// A timestamp sorts them right, with a missing date as the oldest.
const sortValues: Record<string, (workflow: AffectedWorkflow) => string | number> = {
	owner: ownerLabel,
	homeProjectName: (workflow) => projectLabel(workflow).toLowerCase(),
	lastExecutedAt: (workflow) =>
		workflow.lastExecutedAt ? new Date(workflow.lastExecutedAt).getTime() : 0,
	lastUpdatedAt: (workflow) => new Date(workflow.lastUpdatedAt).getTime(),
	name: (workflow) => workflow.name.toLowerCase(),
};

const sortedWorkflows = computed(() => {
	if (!sortBy.value.length) return filteredWorkflows.value;

	const { id, desc } = sortBy.value[0];
	return orderBy(filteredWorkflows.value, [sortValues[id] ?? id], [desc ? 'desc' : 'asc']);
});
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
			show-select
			:item-selectable="isSelectable"
			:items-per-page="sortedWorkflows.length + 1"
			:items="sortedWorkflows"
			:items-length="sortedWorkflows.length"
			:headers="tableHeaders"
			:loading="isLoading"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.cellStack">
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
					<N8nText size="small" color="text-light">
						{{
							item.active
								? i18n.baseText('settings.migrationReport.detail.table.published')
								: i18n.baseText('settings.migrationReport.detail.table.notPublished')
						}}
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
			<template #[`item.homeProjectName`]="{ item }">
				<div :class="$style.cellStack">
					<N8nText
						color="text-dark"
						:class="$style.truncate"
						:title="projectLabel(item)"
						data-test-id="migration-workflow-project"
					>
						{{ projectLabel(item) }}
					</N8nText>
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
						v-if="canNotifyRow(item)"
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
					<N8nButton
						variant="outline"
						:label="i18n.baseText('settings.migrationReport.detail.bulk.wontFix')"
						:disabled="bulkTargets('wont_fix').length === 0"
						data-test-id="migration-bulk-wont-fix-button"
						@click="onBulkStatusChange('wont_fix')"
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
