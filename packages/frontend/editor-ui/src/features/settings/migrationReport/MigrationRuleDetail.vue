<script lang="ts" setup>
import TimeAgo from '@/app/components/TimeAgo.vue';
import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';
import { VIEWS } from '@/app/constants';
import type { BreakingChangeWorkflowRuleResult } from '@n8n/api-types';
import {
	N8nDataTableServer,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nLink,
	N8nOption,
	N8nSelect,
	N8nTag,
	N8nText,
} from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAsyncState, useDebounceFn } from '@vueuse/core';
import orderBy from 'lodash/orderBy';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import SeverityTag from './components/SeverityTag.vue';

const i18n = useI18n();

const props = defineProps<{ migrationRuleId: string }>();

const router = useRouter();

const { state, isLoading } = useAsyncState(
	async () => {
		const response = await breakingChangesApi.getReportForRule(
			useRootStore().restApiContext,
			props.migrationRuleId,
		);

		return response;
	},
	{
		ruleId: '',
		ruleTitle: '',
		ruleDescription: '',
		ruleSeverity: 'low',
		affectedWorkflows: [],
		recommendations: [],
	},
);

type AffectedWorkflow = BreakingChangeWorkflowRuleResult['affectedWorkflows'][number];

const tableHeaders = ref<Array<TableHeader<AffectedWorkflow>>>([
	{
		title: i18n.baseText('settings.migrationReport.detail.table.name'),
		key: 'name',
		width: 200,
	},
	{
		title: i18n.baseText('settings.migrationReport.detail.table.issue'),
		key: 'active',
		value: (row: AffectedWorkflow) =>
			row.active
				? i18n.baseText('settings.migrationReport.detail.table.active')
				: i18n.baseText('settings.migrationReport.detail.table.deactivated'),
		width: 40,
	},
	{
		title: i18n.baseText('settings.migrationReport.detail.table.nodeAffected'),
		key: 'issues',
	},
	{
		title: i18n.baseText('settings.migrationReport.detail.table.numberOfExecutions'),
		key: 'numberOfExecutions',
		width: 40,
	},
	{
		title: i18n.baseText('settings.migrationReport.detail.table.lastExecuted'),
		key: 'lastExecutedAt',
		width: 40,
	},
	{
		title: i18n.baseText('settings.migrationReport.detail.table.lastUpdated'),
		key: 'lastUpdatedAt',
		width: 40,
	},
]);

function handleRowClick(_event: MouseEvent, { item }: { item: AffectedWorkflow }) {
	window.open(
		router.resolve({
			name: VIEWS.WORKFLOW,
			params: { name: item.id },
		}).href,
		'_blank',
	);
}

const sortBy = ref([{ id: 'numberOfExecutions', desc: true }]);

// Filter state
const searchInput = ref('');
const searchQuery = ref(''); // Debounced value for filtering
const statusFilter = ref<'' | 'active' | 'deactivated'>('');

// Debounced search to avoid excessive filtering
const debouncedSearch = useDebounceFn((value: string) => {
	searchQuery.value = value;
}, 300);

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

	return orderBy(
		filteredWorkflows.value,
		[sortBy.value[0].id],
		[sortBy.value[0].desc ? 'desc' : 'asc'],
	);
});
</script>

<template>
	<div>
		<N8nText
			tag="h2"
			size="xlarge"
			color="text-dark"
			class="mb-2xs"
			style="display: flex; align-items: center; gap: 4px"
		>
			{{ state.ruleTitle }}
			<SeverityTag :severity="state.ruleSeverity" />
			<N8nTag
				:text="
					i18n.baseText('settings.migrationReport.detail.affectedTag', {
						interpolate: { count: String(state.affectedWorkflows.length) },
					})
				"
				:clickable="false"
			/>
		</N8nText>
		<N8nText tag="p" color="text-base" class="mb-2xl">
			{{ state.ruleDescription }}
			<N8nLink
				v-if="state.ruleDocumentationUrl"
				theme="text"
				underline
				:href="state.ruleDocumentationUrl"
				target="_blank"
				rel="noopener noreferrer"
			>
				<u :class="$style.NoLineBreak">
					{{ i18n.baseText('settings.migrationReport.documentation') }}
					<N8nIcon icon="external-link" />
				</u>
			</N8nLink>
		</N8nText>

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
			v-model:sort-by="sortBy"
			:items-per-page="sortedWorkflows.length + 1"
			:items="sortedWorkflows"
			:items-length="sortedWorkflows.length"
			:headers="tableHeaders"
			:row-props="{ class: $style.clickableRow }"
			:loading="isLoading"
			@click:row="handleRowClick"
		>
			<template #[`item.issues`]="{ item }">
				<div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
					<template v-for="(issue, index) in item.issues" :key="issue.nodeId">
						<N8nLink
							theme="text"
							:to="`/workflow/${item.id}/${issue.nodeId}`"
							new-window
							@click.capture.stop
						>
							{{ issue.nodeName }}
						</N8nLink>
						<template v-if="index < item.issues.length - 1">, </template>
					</template>
				</div>
			</template>
			<template #[`item.lastExecutedAt`]="{ item }">
				<TimeAgo v-if="item.lastExecutedAt" :date="item.lastExecutedAt.toString()" />
				<span v-else>{{ i18n.baseText('settings.migrationReport.detail.table.never') }}</span>
			</template>
			<template #[`item.lastUpdatedAt`]="{ item }">
				<TimeAgo :date="item.lastUpdatedAt.toString()" />
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style module>
.clickableRow {
	cursor: pointer;
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
</style>
