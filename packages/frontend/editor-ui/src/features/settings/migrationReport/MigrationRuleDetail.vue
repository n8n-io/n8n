<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';
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
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nLoading,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nText,
	N8nUserSelect,
} from '@n8n/design-system';
import type { IUser, TableHeader } from '@n8n/design-system';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { createEventBus } from '@n8n/utils/event-bus';
import { useAsyncState, useDebounceFn } from '@vueuse/core';
import orderBy from 'lodash/orderBy';
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { I18nT } from 'vue-i18n';
import FindingStateSelect from './components/FindingStateSelect.vue';
import ImpactTag from './components/ImpactTag.vue';

const i18n = useI18n();
const uiStore = useUIStore();
const rootStore = useRootStore();
const rbacStore = useRBACStore();
const toast = useToast();

useDocumentTitle().set(i18n.baseText('settings.migrationReport'));

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();

// The page needs only `breakingChanges:list`. Choosing an owner or a state needs
// `breakingChanges:migrate`, like Migrate.
const canAssignOwner = computed(() => rbacStore.hasScope('breakingChanges:migrate'));

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
			width: state.value.migratable ? 160 : 80,
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
		state.value.affectedWorkflows.filter(
			(workflow) => workflow.status === 'open' && !migratedWorkflowIds.value.has(workflow.id),
		).length,
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

// Filter state
const searchInput = ref('');
const searchQuery = ref(''); // Debounced value for filtering
const statusFilter = ref<'' | 'active' | 'deactivated'>('');

// Debounced search to avoid excessive filtering
const debouncedSearch = useDebounceFn((value: string) => {
	searchQuery.value = value;
}, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

const onSearchInput = (value: string) => {
	searchInput.value = value; // Update input immediately
	void debouncedSearch(value); // Debounce the filter update
};

const statusOptions = computed(() => [
	{ value: '', label: i18n.baseText('settings.migrationReport.detail.filter.status.all') },
	{
		value: 'active',
		label: i18n.baseText('settings.migrationReport.detail.filter.status.active'),
	},
	{
		value: 'deactivated',
		label: i18n.baseText('settings.migrationReport.detail.filter.status.deactivated'),
	},
]);

const filters = computed(() => ({
	search: searchInput.value, // Use immediate value for display
	status: statusFilter.value,
}));

const filterKeys = computed(() => ['status']);
const wasJustReset = ref(false);

const resetFilters = () => {
	statusFilter.value = '';
	wasJustReset.value = true;
};

const onUpdateFilters = (newFilters: Record<string, unknown>) => {
	// this check is to avoid updating the status filter right after a reset
	// because underlying component emits update even on reset
	if (wasJustReset.value) {
		wasJustReset.value = false;
		return;
	}
	statusFilter.value = (newFilters.status as '' | 'active' | 'deactivated') || '';
};

const filteredWorkflows = computed(() => {
	let workflows = state.value.affectedWorkflows;

	// Apply search filter
	if (searchQuery.value) {
		const query = searchQuery.value.toLowerCase();
		workflows = workflows.filter((workflow) => workflow.name.toLowerCase().includes(query));
	}

	// Apply status filter
	if (statusFilter.value !== '') {
		workflows = workflows.filter((workflow) => {
			if (statusFilter.value === 'active') {
				return workflow.active;
			} else if (statusFilter.value === 'deactivated') {
				return !workflow.active;
			}
			return true;
		});
	}

	return workflows;
});

const sortedWorkflows = computed(() => {
	if (!sortBy.value.length) return filteredWorkflows.value;

	const { id, desc } = sortBy.value[0];
	// The owner cell shows a label, so it sorts by that label and not by the owner object.
	return orderBy(
		filteredWorkflows.value,
		[id === 'owner' ? ownerLabel : id],
		[desc ? 'desc' : 'asc'],
	);
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

		<!-- Search and Filter Controls -->
		<div :class="$style.filterControls">
			<N8nInput
				:model-value="filters.search"
				:placeholder="i18n.baseText('settings.migrationReport.detail.search.placeholder')"
				size="small"
				clearable
				data-test-id="migration-rule-search"
				@update:model-value="onSearchInput"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>

			<ResourceFiltersDropdown
				:keys="filterKeys"
				:reset="resetFilters"
				:model-value="filters"
				:shareable="false"
				data-test-id="migration-rule-filters"
				@update:model-value="onUpdateFilters"
			>
				<template #default>
					<N8nInputLabel
						:label="i18n.baseText('settings.migrationReport.detail.filter.status.label')"
						:bold="false"
						size="small"
						color="text-base"
						class="mb-3xs"
					/>
					<N8nSelect
						v-model="statusFilter"
						size="small"
						data-test-id="migration-rule-status-filter"
					>
						<N8nOption
							v-for="option in statusOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</template>
			</ResourceFiltersDropdown>
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
					v-if="canAssignOwner"
					size="small"
					:class="$style.ownerSelect"
					:users="ownerOptionsFor(item)"
					hide-email-in-label
					:model-value="item.owner?.id ?? ''"
					:placeholder="i18n.baseText('settings.migrationReport.detail.table.unassigned')"
					remote
					:remote-method="searchMembers"
					:loading="isLoadingUsers"
					clearable
					data-test-id="migration-owner-select"
					@focus="onOwnerPickerFocus(item)"
					@update:model-value="(userId: string) => onOwnerChange(item, userId)"
				>
					<template #prefix>
						<N8nAvatar
							size="xsmall"
							:first-name="item.owner?.firstName"
							:last-name="item.owner?.lastName"
						/>
					</template>
				</N8nUserSelect>
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
						!canAssignOwner || savingWorkflowIds.has(item.id) || migratedWorkflowIds.has(item.id)
					"
					@update:model-value="onFindingStatusChange(item, $event)"
				/>
			</template>
			<template #[`item.actions`]="{ item }">
				<div :class="$style.actions">
					<template v-if="state.migratable">
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

/* A borderless picker, so the owner reads as a value and not as a form field. */
.ownerSelect {
	width: 100%;
}

/* The select reserves room for an icon. The avatar is wider, so the text starts after it. */
.ownerSelect :global(.el-select .el-input--prefix .el-input__inner) {
	padding-left: calc(var(--spacing--2xs) * 2 + var(--spacing--md));
}

/* The picker shows its border only on hover and focus, so the owner reads as a value. */
.ownerSelect:not(:hover, :focus-within) :global(.el-input__inner) {
	border-color: transparent;
	background-color: transparent;
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

.filterControls {
	display: flex;
	gap: var(--spacing--xs);
	margin-bottom: var(--spacing--md);
	align-items: center;
	justify-content: end;
}

.filterControls > :first-child {
	flex: 1;
	max-width: 400px;
}

.NoLineBreak {
	white-space: nowrap;
}

.UnderlinedText {
	text-decoration: underline;
}
</style>
