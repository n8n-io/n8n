<script lang="ts" setup>
import {
	N8nBadge,
	N8nButton,
	N8nOption,
	N8nPopover,
	N8nSegmentControl,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import {
	countActiveFilters,
	DEFAULT_WORKFLOW_FILTERS,
	UNASSIGNED_OWNER,
	type AgeFilter,
	type ExecutionsFilter,
	type PublishedFilter,
	type StateFilter,
	type WorkflowFilters,
} from '../workflowFilters';

defineProps<{
	/** The owners of the listed workflows. */
	owners: Array<{ id: string; label: string }>;
	currentUserId?: string;
	/** The number of workflows that each quick filter shows. */
	counts: { assignedToMe: number; open: number; wontFix: number; unassigned: number };
}>();

const filters = defineModel<WorkflowFilters>({ required: true });

const i18n = useI18n();
const open = ref(false);

const activeCount = computed(() => countActiveFilters(filters.value));

function setFilter<K extends keyof WorkflowFilters>(key: K, value: WorkflowFilters[K]) {
	filters.value = { ...filters.value, [key]: value };
}

// A quick filter sets one filter to a value. A second click resets that filter.
function toggleFilter<K extends 'owner' | 'state'>(key: K, value: WorkflowFilters[K]) {
	setFilter(key, filters.value[key] === value ? DEFAULT_WORKFLOW_FILTERS[key] : value);
}

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

const anyLabel = computed(() => i18n.baseText('settings.migrationReport.detail.filters.any'));

const ageOptions = computed<Array<{ value: AgeFilter; label: string }>>(() => [
	{ value: 'any', label: anyLabel.value },
	{
		value: 'under30Days',
		label: i18n.baseText('settings.migrationReport.detail.filters.age.under30Days'),
	},
	{
		value: 'under6Months',
		label: i18n.baseText('settings.migrationReport.detail.filters.age.under6Months'),
	},
	{
		value: 'over12Months',
		label: i18n.baseText('settings.migrationReport.detail.filters.age.over12Months'),
	},
]);

const executionsOptions = computed<Array<{ value: ExecutionsFilter; label: string }>>(() => [
	{ value: 'any', label: anyLabel.value },
	{
		value: 'none',
		label: i18n.baseText('settings.migrationReport.detail.filters.executions.none'),
	},
	{
		value: 'under100',
		label: i18n.baseText('settings.migrationReport.detail.filters.executions.under100'),
	},
	{
		value: 'over1000',
		label: i18n.baseText('settings.migrationReport.detail.filters.executions.over1000'),
	},
]);

const stateOptions = computed<Array<{ value: StateFilter; label: string }>>(() => [
	{ value: 'any', label: anyLabel.value },
	{ value: 'open', label: i18n.baseText('settings.migrationReport.detail.state.open') },
	{ value: 'wont_fix', label: i18n.baseText('settings.migrationReport.detail.state.wontFix') },
]);

const publishedOptions = computed<Array<{ value: PublishedFilter; label: string }>>(() => [
	{ value: 'any', label: anyLabel.value },
	{ value: 'published', label: i18n.baseText('settings.migrationReport.detail.table.published') },
	{
		value: 'notPublished',
		label: i18n.baseText('settings.migrationReport.detail.table.notPublished'),
	},
]);
</script>

<template>
	<!-- A short window cannot fit every filter, so the popover scrolls in the space below the trigger. -->
	<N8nPopover
		v-model:open="open"
		width="420px"
		max-height="var(--reka-popover-content-available-height)"
		align="end"
	>
		<!-- The trigger matches the filter button of the Overview lists. -->
		<template #trigger>
			<span :class="$style.trigger">
				<N8nTooltip :content="i18n.baseText('settings.migrationReport.detail.filters.button')">
					<N8nButton
						variant="outline"
						size="small"
						icon="funnel"
						:icon-only="activeCount === 0"
						:aria-label="i18n.baseText('settings.migrationReport.detail.filters.button')"
						data-test-id="migration-rule-filters"
					>
						<N8nBadge
							v-if="activeCount > 0"
							variant="primary"
							data-test-id="migration-rule-filters-count"
						>
							{{ activeCount }}
						</N8nBadge>
					</N8nButton>
				</N8nTooltip>
			</span>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="migration-rule-filters-content">
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.quickFilters') }}
					</N8nText>
					<div :class="$style.quickFilters">
						<N8nButton
							v-if="currentUserId"
							:variant="filters.owner === currentUserId ? 'solid' : 'outline'"
							size="small"
							icon="user"
							:aria-pressed="filters.owner === currentUserId"
							data-test-id="migration-rule-quick-filter-mine"
							@click="toggleFilter('owner', currentUserId)"
						>
							{{
								quickFilterLabel(
									'settings.migrationReport.detail.quickFilter.assignedToMe',
									counts.assignedToMe,
								)
							}}
						</N8nButton>
						<N8nButton
							:variant="filters.state === 'open' ? 'solid' : 'outline'"
							size="small"
							:aria-pressed="filters.state === 'open'"
							data-test-id="migration-rule-quick-filter-open"
							@click="toggleFilter('state', 'open')"
						>
							{{
								quickFilterLabel('settings.migrationReport.detail.quickFilter.open', counts.open)
							}}
						</N8nButton>
						<N8nButton
							:variant="filters.state === 'wont_fix' ? 'solid' : 'outline'"
							size="small"
							:aria-pressed="filters.state === 'wont_fix'"
							data-test-id="migration-rule-quick-filter-wont-fix"
							@click="toggleFilter('state', 'wont_fix')"
						>
							{{
								quickFilterLabel(
									'settings.migrationReport.detail.quickFilter.wontFix',
									counts.wontFix,
								)
							}}
						</N8nButton>
						<N8nButton
							:variant="filters.owner === UNASSIGNED_OWNER ? 'solid' : 'outline'"
							size="small"
							:aria-pressed="filters.owner === UNASSIGNED_OWNER"
							data-test-id="migration-rule-quick-filter-unassigned"
							@click="toggleFilter('owner', UNASSIGNED_OWNER)"
						>
							{{
								quickFilterLabel(
									'settings.migrationReport.detail.quickFilter.unassigned',
									counts.unassigned,
								)
							}}
						</N8nButton>
					</div>
				</div>
				<div :class="[$style.group, $style.allFilters]">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.state') }}
					</N8nText>
					<N8nSegmentControl
						size="small"
						:options="stateOptions"
						:model-value="filters.state"
						data-test-id="migration-rule-filter-state"
						@update:model-value="setFilter('state', $event)"
					/>
				</div>
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.lastRun') }}
					</N8nText>
					<N8nSegmentControl
						size="small"
						:options="ageOptions"
						:model-value="filters.lastRun"
						data-test-id="migration-rule-filter-last-run"
						@update:model-value="setFilter('lastRun', $event)"
					/>
				</div>
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.lastUpdated') }}
					</N8nText>
					<N8nSegmentControl
						size="small"
						:options="ageOptions"
						:model-value="filters.lastUpdated"
						data-test-id="migration-rule-filter-last-updated"
						@update:model-value="setFilter('lastUpdated', $event)"
					/>
				</div>
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.executions') }}
					</N8nText>
					<N8nSegmentControl
						size="small"
						:options="executionsOptions"
						:model-value="filters.executions"
						data-test-id="migration-rule-filter-executions"
						@update:model-value="setFilter('executions', $event)"
					/>
				</div>
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.status') }}
					</N8nText>
					<N8nSegmentControl
						size="small"
						:options="publishedOptions"
						:model-value="filters.published"
						data-test-id="migration-rule-filter-status"
						@update:model-value="setFilter('published', $event)"
					/>
				</div>
				<div :class="$style.group">
					<N8nText size="small" color="text-dark" bold>
						{{ i18n.baseText('settings.migrationReport.detail.filters.owner') }}
					</N8nText>
					<!-- A select and not a segment control: a rule can list many owners. -->
					<N8nSelect
						size="small"
						filterable
						:class="$style.ownerSelect"
						:model-value="filters.owner"
						data-test-id="migration-rule-filter-owner"
						@update:model-value="setFilter('owner', $event)"
					>
						<N8nOption value="any" :label="anyLabel" />
						<N8nOption
							:value="UNASSIGNED_OWNER"
							:label="i18n.baseText('settings.migrationReport.detail.table.unassigned')"
						/>
						<N8nOption
							v-for="owner in owners"
							:key="owner.id"
							:value="owner.id"
							:label="owner.label"
						/>
					</N8nSelect>
				</div>
				<div :class="$style.footer">
					<N8nButton
						variant="ghost"
						size="small"
						:disabled="activeCount === 0"
						data-test-id="migration-rule-filters-clear"
						@click="filters = { ...DEFAULT_WORKFLOW_FILTERS }"
					>
						{{ i18n.baseText('settings.migrationReport.detail.filters.clearAll') }}
					</N8nButton>
					<N8nButton size="small" @click="open = false">
						{{ i18n.baseText('settings.migrationReport.detail.filters.done') }}
					</N8nButton>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
}

.group {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--3xs);
}

.trigger {
	display: inline-flex;
}

.trigger[data-state='open'] button {
	background-color: var(--button--color--background-active);
}

.quickFilters {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

/* Separates the quick filters from the full filters. */
.allFilters {
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.ownerSelect {
	width: 100%;
}

.footer {
	display: flex;
	justify-content: space-between;
	padding-top: var(--spacing--xs);
	border-top: var(--border);
}
</style>
