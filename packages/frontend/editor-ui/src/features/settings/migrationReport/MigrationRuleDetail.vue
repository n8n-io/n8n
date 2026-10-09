<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME, MIGRATE_WORKFLOW_MODAL_KEY, TIME, VIEWS } from '@/app/constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import type {
	BreakingChangeRuleDetailResult,
	BreakingChangeRuleDetailWorkflow,
	BreakingChangeWorkflowOwner,
	MigrationFindingTriageStatus,
} from '@n8n/api-types';
import { useUIStore } from '@/app/stores/ui.store';
import { getUsers } from '@n8n/rest-api-client/api/users';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nDataTableServer,
	N8nDropdownMenu,
	N8nIcon,
	N8nInput,
	N8nLink,
	N8nLoading,
	N8nSettingsLayout,
	N8nText,
	N8nUserSelect,
} from '@n8n/design-system';
import type { DropdownMenuItemProps, IUser, TableHeader } from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { useAsyncState, useDebounceFn } from '@vueuse/core';
import orderBy from 'lodash/orderBy';
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { I18nT } from 'vue-i18n';
import FindingStateSelect from './components/FindingStateSelect.vue';
import ImpactTag from './components/ImpactTag.vue';
import WorkflowFiltersPopover from './components/WorkflowFiltersPopover.vue';
import {
	DEFAULT_WORKFLOW_FILTERS,
	UNASSIGNED_OWNER,
	matchesWorkflowFilters,
	type WorkflowFilters,
} from './workflowFilters';

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();
const rbacStore = useRBACStore();
const usersStore = useUsersStore();
const toast = useToast();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();

// The page needs only `breakingChanges:list`. A migration, a state change or
// an owner choice needs `breakingChanges:migrate`.
const canMigrate = computed(() => rbacStore.hasScope('breakingChanges:migrate'));

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

// The picker searches the members of the focused row's project. One result list
// serves every row, since only one picker is open at a time.
const isLoadingUsers = ref(false);
const activeProjectId = ref<string | undefined>();
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

/** The members found for the row's project, plus the row's owner so the picker never shows a bare id. */
function ownerOptionsFor(workflow: AffectedWorkflow): IUser[] {
	const options = workflow.homeProjectId === activeProjectId.value ? [...memberOptions.value] : [];
	for (const owner of [workflow.owner, incomingOwners.value.get(workflow.id)]) {
		// The picker needs an email on every option; an owner without one is left out.
		if (owner?.email && !options.some((option) => option.id === owner.id)) {
			options.push(userOption(owner));
		}
	}
	return options;
}

// A focus or a keystroke can start a new search before the last one answered;
// only the latest answer may fill the list.
let memberRequestSequence = 0;

async function loadMembers(projectId: string | undefined, query = '') {
	const sequence = ++memberRequestSequence;
	isLoadingUsers.value = true;
	try {
		const { items } = await getUsers(rootStore.restApiContext, {
			skip: 0,
			take: 50,
			filter: {
				...(projectId ? { projectId } : {}),
				...(query.trim() ? { fullText: query.trim() } : {}),
			},
		});
		if (sequence !== memberRequestSequence) return;
		memberOptions.value = items.map(userOption);
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
	if (activeProjectId.value === workflow.homeProjectId && memberOptions.value.length > 0) return;
	activeProjectId.value = workflow.homeProjectId;
	memberOptions.value = [];
	void loadMembers(workflow.homeProjectId);
}

const searchMembers = useDebounceFn(
	async (query: string) => await loadMembers(activeProjectId.value, query),
	getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH),
);

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

// Migrate needs the same scope as a state change.
const showMigrate = computed(() => state.value.migratable && canMigrate.value);

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
			value: ownerLabel,
			width: 220,
		},
		{
			title: i18n.baseText('settings.migrationReport.detail.table.state'),
			key: 'status',
			width: 140,
		},
		{
			title: '',
			key: 'actions',
			value: () => '',
			width: showMigrate.value ? 160 : 80,
			disableSort: true,
		},
	];

	return headers;
});

// A workflow without a run in this period is probably not used any more.
const STALE_WORKFLOW_AFTER = 60 * TIME.DAY;

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
migrateModalBus.on('migrated', ({ workflowId }: { workflowId: string }) => {
	migratedWorkflowIds.value = new Set(migratedWorkflowIds.value).add(workflowId);
});

function openMigrateModal(workflow: AffectedWorkflow) {
	uiStore.openModalWithData({
		name: MIGRATE_WORKFLOW_MODAL_KEY,
		data: {
			ruleId: props.migrationRuleId,
			workflow,
			recommendations: state.value.recommendations,
			eventBus: migrateModalBus,
		},
	});
}

// Won't fix counts as resolved, so the badge counts only the open findings. A
// migration fixes the finding on save, so a migrated row is not open either.
const openCount = computed(
	() =>
		state.value.affectedWorkflows.filter((workflow) => findingState(workflow) === 'open').length,
);

// Rows with a state change in flight. One change at a time keeps the revert correct.
const savingWorkflowIds = ref<Set<string>>(new Set());

// The state is a shallow ref, so replace the list to make the table update.
function setFindingStatus(workflowId: string, status: MigrationFindingTriageStatus) {
	state.value = {
		...state.value,
		affectedWorkflows: state.value.affectedWorkflows.map((workflow) =>
			workflow.id === workflowId ? { ...workflow, status } : workflow,
		),
	};
}

async function onFindingStatusChange(
	workflow: AffectedWorkflow,
	status: MigrationFindingTriageStatus,
) {
	const previousStatus = workflow.status;
	if (status === previousStatus || savingWorkflowIds.value.has(workflow.id)) return;

	setFindingStatus(workflow.id, status);
	savingWorkflowIds.value = new Set(savingWorkflowIds.value).add(workflow.id);
	try {
		await breakingChangesApi.updateFindingStatus(
			rootStore.restApiContext,
			props.migrationRuleId,
			workflow.id,
			status,
		);
	} catch (error) {
		setFindingStatus(workflow.id, previousStatus);
		toast.showError(error, i18n.baseText('settings.migrationReport.detail.state.error.title'));
	} finally {
		const saving = new Set(savingWorkflowIds.value);
		saving.delete(workflow.id);
		savingWorkflowIds.value = saving;
	}
}

function workflowUrl(workflow: AffectedWorkflow): string {
	return router.resolve({ name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } }).href;
}

const sortBy = ref([{ id: 'numberOfExecutions', desc: true }]);

type SortField = 'numberOfExecutions' | 'lastExecutedAt' | 'lastUpdatedAt' | 'name';

const sortFieldLabels = computed<Record<string, string>>(() => ({
	numberOfExecutions: i18n.baseText('settings.migrationReport.detail.sort.executions'),
	lastExecutedAt: i18n.baseText('settings.migrationReport.detail.sort.lastRun'),
	lastUpdatedAt: i18n.baseText('settings.migrationReport.detail.sort.lastUpdated'),
	name: i18n.baseText('settings.migrationReport.detail.table.name'),
	owner: i18n.baseText('settings.migrationReport.detail.table.owner'),
}));

const sortMenuItems = computed<Array<DropdownMenuItemProps<SortField>>>(() =>
	(['numberOfExecutions', 'lastExecutedAt', 'lastUpdatedAt', 'name'] as const).map((id) => ({
		id,
		label: sortFieldLabels.value[id],
		checked: sortBy.value[0]?.id === id,
	})),
);

const sortLabel = computed(() => {
	const current = sortBy.value[0];
	if (!current) return i18n.baseText('settings.migrationReport.detail.sort.none');
	return i18n.baseText('settings.migrationReport.detail.sort.label', {
		interpolate: {
			field: sortFieldLabels.value[current.id] ?? current.id,
			direction: current.desc ? '↓' : '↑',
		},
	});
});

// Picking the current field again flips the direction. A new field starts in the
// direction that shows the most relevant rows first.
function onSortSelect(id: SortField) {
	const current = sortBy.value[0];
	const desc = current?.id === id ? !current.desc : id !== 'name';
	sortBy.value = [{ id, desc }];
}

// Filter state
const searchInput = ref('');
const searchQuery = ref(''); // Debounced value for filtering
const workflowFilters = ref<WorkflowFilters>({ ...DEFAULT_WORKFLOW_FILTERS });
const stateFilter = ref<MigrationFindingTriageStatus | undefined>();

// Debounced search to avoid excessive filtering
const debouncedSearch = useDebounceFn((value: string) => {
	searchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const onSearchInput = (value: string) => {
	searchInput.value = value; // Update input immediately
	void debouncedSearch(value); // Debounce the filter update
};

// A migrated row shows as resolved, so it does not count as open.
function findingState(workflow: AffectedWorkflow): MigrationFindingTriageStatus | 'migrated' {
	return migratedWorkflowIds.value.has(workflow.id) ? 'migrated' : workflow.status;
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

function quickFilterLabel(
	key:
		| 'settings.migrationReport.detail.quickFilter.assignedToMe'
		| 'settings.migrationReport.detail.quickFilter.open'
		| 'settings.migrationReport.detail.quickFilter.wontFix'
		| 'settings.migrationReport.detail.quickFilter.unassigned',
	count: number,
): string {
	return i18n.baseText(key, { interpolate: { count: String(count) } });
}

function toggleStateFilter(status: MigrationFindingTriageStatus) {
	stateFilter.value = stateFilter.value === status ? undefined : status;
}

function toggleOwnerFilter(owner: string) {
	workflowFilters.value = {
		...workflowFilters.value,
		owner: workflowFilters.value.owner === owner ? 'any' : owner,
	};
}

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

const filteredWorkflows = computed(() => {
	const query = searchQuery.value.toLowerCase();
	const now = Date.now();
	return state.value.affectedWorkflows.filter(
		(workflow) =>
			(!query || workflow.name.toLowerCase().includes(query)) &&
			(!stateFilter.value || findingState(workflow) === stateFilter.value) &&
			matchesWorkflowFilters(workflow, workflowFilters.value, now),
	);
});

// The owner cell shows a label, so it sorts by that label and not by the owner object.
// Dates come from JSON as strings, and a workflow that never ran has no date.
// A timestamp sorts them right, with a missing date as the oldest.
const sortValues: Record<string, (workflow: AffectedWorkflow) => string | number> = {
	owner: ownerLabel,
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
		<header :class="$style.pageHeader">
			<template v-if="isLoading">
				<div class="mb-2xs">
					<N8nLoading variant="h1" />
				</div>
				<div>
					<N8nLoading variant="p" :rows="2" />
				</div>
			</template>
			<template v-else>
				<N8nText
					tag="h2"
					size="xlarge"
					color="text-dark"
					class="mb-2xs"
					style="display: flex; align-items: center; gap: 4px"
				>
					{{ state.ruleTitle }}
					<ImpactTag :impact="state.ruleImpact" />
					<N8nBadge>
						{{
							i18n.baseText('settings.migrationReport.detail.affectedTag', {
								interpolate: { count: String(openCount) },
							})
						}}
					</N8nBadge>
				</N8nText>
				<N8nText tag="p" color="text-base">
					{{ state.ruleDescription }}{{ state.ruleDescription.endsWith('.') ? '' : '.' }}
					<N8nLink
						v-if="state.ruleDocumentationUrl"
						theme="text"
						:href="state.ruleDocumentationUrl"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.NoLineBreak"
					>
						<span :class="$style.UnderlinedText">{{
							i18n.baseText('settings.migrationReport.documentation')
						}}</span>
						↗
					</N8nLink>
				</N8nText>
			</template>
		</header>

		<div :class="$style.toolbar">
			<div :class="$style.quickFilters">
				<N8nButton
					v-if="currentUserId"
					:variant="workflowFilters.owner === currentUserId ? 'solid' : 'subtle'"
					size="small"
					icon="user"
					:aria-pressed="workflowFilters.owner === currentUserId"
					data-test-id="migration-rule-quick-filter-mine"
					@click="toggleOwnerFilter(currentUserId)"
				>
					{{
						quickFilterLabel(
							'settings.migrationReport.detail.quickFilter.assignedToMe',
							assignedToMeCount,
						)
					}}
				</N8nButton>
				<N8nButton
					:variant="stateFilter === 'open' ? 'solid' : 'subtle'"
					size="small"
					:aria-pressed="stateFilter === 'open'"
					data-test-id="migration-rule-quick-filter-open"
					@click="toggleStateFilter('open')"
				>
					{{ quickFilterLabel('settings.migrationReport.detail.quickFilter.open', openCount) }}
				</N8nButton>
				<N8nButton
					:variant="stateFilter === 'wont_fix' ? 'solid' : 'subtle'"
					size="small"
					:aria-pressed="stateFilter === 'wont_fix'"
					data-test-id="migration-rule-quick-filter-wont-fix"
					@click="toggleStateFilter('wont_fix')"
				>
					{{
						quickFilterLabel('settings.migrationReport.detail.quickFilter.wontFix', wontFixCount)
					}}
				</N8nButton>
				<N8nButton
					:variant="workflowFilters.owner === UNASSIGNED_OWNER ? 'solid' : 'subtle'"
					size="small"
					:aria-pressed="workflowFilters.owner === UNASSIGNED_OWNER"
					data-test-id="migration-rule-quick-filter-unassigned"
					@click="toggleOwnerFilter(UNASSIGNED_OWNER)"
				>
					{{
						quickFilterLabel(
							'settings.migrationReport.detail.quickFilter.unassigned',
							unassignedCount,
						)
					}}
				</N8nButton>
			</div>
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
		</div>

		<div :class="$style.sortAndFilters">
			<N8nDropdownMenu
				:items="sortMenuItems"
				placement="bottom-start"
				data-test-id="migration-rule-sort"
				@select="onSortSelect"
			>
				<template #trigger>
					<N8nButton variant="subtle" size="small" data-test-id="migration-rule-sort-trigger">
						{{ sortLabel }}
					</N8nButton>
				</template>
			</N8nDropdownMenu>
			<WorkflowFiltersPopover v-model="workflowFilters" :owners="ownerFilterOptions" />
		</div>

		<N8nDataTableServer
			:key="String(state.migratable)"
			v-model:sort-by="sortBy"
			:items-per-page="sortedWorkflows.length + 1"
			:items="sortedWorkflows"
			:items-length="sortedWorkflows.length"
			:headers="tableHeaders"
			:loading="isLoading"
		>
			<template #[`item.name`]="{ item }">
				<div :class="$style.cellStack">
					<N8nText color="text-dark" :class="$style.truncate" :title="item.name">
						{{ item.name }}
					</N8nText>
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
					v-if="canMigrate"
					size="small"
					:users="ownerOptionsFor(item)"
					hide-email-in-label
					show-avatar
					borderless
					:model-value="item.owner?.id ?? ''"
					:placeholder="i18n.baseText('settings.migrationReport.detail.table.unassigned')"
					remote
					:remote-method="searchMembers"
					:loading="isLoadingUsers"
					clearable
					data-test-id="migration-owner-select"
					@focus="onOwnerPickerFocus(item)"
					@update:model-value="(userId: string) => onOwnerChange(item, userId)"
				/>
				<div v-else :class="$style.ownerLabel">
					<N8nAvatar
						size="xsmall"
						:first-name="item.owner?.firstName"
						:last-name="item.owner?.lastName"
					/>
					<span :class="$style.truncate">{{ ownerLabel(item) }}</span>
				</div>
			</template>
			<template #[`item.status`]="{ item }">
				<FindingStateSelect
					:model-value="item.status"
					:disabled="
						!canMigrate || savingWorkflowIds.has(item.id) || migratedWorkflowIds.has(item.id)
					"
					@update:model-value="onFindingStatusChange(item, $event)"
				/>
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions">
					<template v-if="showMigrate">
						<N8nText v-if="migratedWorkflowIds.has(item.id)" color="text-light" size="small">
							{{ i18n.baseText('settings.migrationReport.detail.migrate.migrated') }}
						</N8nText>
						<N8nButton
							v-else
							size="small"
							:label="i18n.baseText('settings.migrationReport.detail.migrate.button')"
							data-test-id="migrate-workflow-button"
							@click="openMigrateModal(item)"
						/>
					</template>
					<N8nLink
						theme="text"
						:to="workflowUrl(item)"
						new-window
						:class="$style.NoLineBreak"
						data-test-id="migration-workflow-open-link"
					>
						{{ i18n.baseText('settings.migrationReport.detail.table.open') }} ↗
					</N8nLink>
				</div>
			</template>
		</N8nDataTableServer>
	</N8nSettingsLayout>
</template>

<style module>
/* Mirrors N8nSettingsPageHeader's self-capping so the header column stays centered
   while the table below spans the full-width layout. */
.pageHeader {
	width: 100%;
	max-width: var(--settings-content--max-width, 45rem);
	margin-inline: auto;
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

.nodeNames {
	font-family: var(--font-family--monospace);
}

.ownerLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.actions {
	display: flex;
	align-items: center;
	justify-content: end;
	gap: var(--spacing--sm);
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--xs);
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--xs);
}

.quickFilters,
.sortAndFilters {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	align-items: center;
}

.sortAndFilters {
	margin-bottom: var(--spacing--md);
}

.search {
	flex: 0 1 20rem;
}

.NoLineBreak {
	white-space: nowrap;
}

.UnderlinedText {
	text-decoration: underline;
}
</style>
