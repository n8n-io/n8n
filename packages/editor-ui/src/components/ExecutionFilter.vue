<script lang="ts" setup>
import { computed } from 'vue';
import { IWorkflowShortResponse } from '@/Interface';
import { i18n as locale } from '@/plugins/i18n';

export type ExecutionFilterProps = {
	workflows?: IWorkflowShortResponse[];
	filter: {
		status: string;
		workflowId: string;
	};
};

const props = defineProps<ExecutionFilterProps>();

const emit = defineEmits<{
	(event: 'filterChanged', value: object): void;
}>();

const statusFilterApplied = computed(() => {
	return (
		(props.filter.status !== 'ALL' && props.filter.status !== '') ||
		(!!props.workflows?.length &&
			props.filter.workflowId !== 'ALL' &&
			props.filter.workflowId !== '')
	);
});

const statuses = computed(() => [
	{ id: 'ALL', name: locale.baseText('executionsList.anyStatus') },
	{ id: 'error', name: locale.baseText('executionsList.error') },
	{ id: 'crashed', name: locale.baseText('executionsList.error') },
	{ id: 'new', name: locale.baseText('executionsList.new') },
	{ id: 'running', name: locale.baseText('executionsList.running') },
	{ id: 'success', name: locale.baseText('executionsList.success') },
	{ id: 'waiting', name: locale.baseText('executionsList.waiting') },
]);

const onFilterWorkflowIdChange = (value: string) => {
	emit('filterChanged', {
		...props.filter,
		workflowId: value,
	});
};

const onFilterStatusChange = (value: string) => {
	emit('filterChanged', {
		...props.filter,
		status: value,
	});
};

const onFilterReset = () => {
	emit('filterChanged', {
		status: 'ALL',
		workflowId: 'ALL',
	});
};
</script>
<template>
	<div :class="$style.executionFilter">
		<n8n-popover trigger="click">
			<template #reference>
				<n8n-button
					icon="filter"
					type="tertiary"
					size="medium"
					:active="statusFilterApplied"
					data-test-id="executions-filter-button"
				>
					<n8n-badge v-if="statusFilterApplied" theme="primary" class="mr-4xs">1</n8n-badge>
					{{ $locale.baseText('executionsList.filters') }}
				</n8n-button>
			</template>
			<div>
				<div v-if="workflows?.length">
					<label for="execution-filter-workflows">Workflows</label>
					<n8n-select
						id="execution-filter-workflows"
						:value="filter.workflowId"
						:placeholder="$locale.baseText('executionsFilter.selectWorkflow')"
						size="medium"
						filterable
						@change="onFilterWorkflowIdChange"
					>
						<div class="ph-no-capture">
							<n8n-option
								v-for="item in workflows"
								:key="item.id"
								:label="item.name"
								:value="item.id"
							/>
						</div>
					</n8n-select>
				</div>
				<div>
					<label for="execution-filter-status">Status</label>
					<n8n-select
						:value="filter.status"
						:placeholder="$locale.baseText('executionsFilter.selectStatus')"
						size="medium"
						filterable
						@change="onFilterStatusChange"
					>
						<n8n-option
							v-for="item in statuses"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</n8n-select>
				</div>
				<n8n-button
					v-if="statusFilterApplied"
					:class="$style.executionResetButton"
					@click="onFilterReset"
					size="large"
					text
					data-test-id="executions-filter-reset-button"
				>
					{{ $locale.baseText('executionsFilter.reset') }}
				</n8n-button>
			</div>
		</n8n-popover>
	</div>
</template>
<style lang="scss" module>
.executionFilter {
	display: inline-block;
}

label {
	display: inline-block;
	margin: var(--spacing-xs) 0 var(--spacing-3xs);
}

.executionResetButton {
	padding: 0;
	margin: var(--spacing-xs) 0 0;
}
</style>
