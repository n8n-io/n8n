<script lang="ts" setup>
import {
	N8nButton,
	N8nOption,
	N8nPopover,
	N8nSegmentControl,
	N8nSelect,
	N8nText,
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
	type WorkflowFilters,
} from '../workflowFilters';

defineProps<{
	/** The owners of the listed workflows. */
	owners: Array<{ id: string; label: string }>;
}>();

const filters = defineModel<WorkflowFilters>({ required: true });

const i18n = useI18n();
const open = ref(false);

const activeCount = computed(() => countActiveFilters(filters.value));

function setFilter<K extends keyof WorkflowFilters>(key: K, value: WorkflowFilters[K]) {
	filters.value = { ...filters.value, [key]: value };
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
	<N8nPopover v-model:open="open" width="420px" align="start">
		<template #trigger>
			<N8nButton variant="subtle" size="small" data-test-id="migration-rule-filters">
				{{
					activeCount
						? i18n.baseText('settings.migrationReport.detail.filters.buttonWithCount', {
								interpolate: { count: String(activeCount) },
							})
						: i18n.baseText('settings.migrationReport.detail.filters.button')
				}}
			</N8nButton>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="migration-rule-filters-content">
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
