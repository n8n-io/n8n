<script lang="ts" setup>
import { computed } from 'vue';
import dateformat from 'dateformat';
import { IWorkflowShortResponse } from '@/Interface';
import { i18n as locale } from '@/plugins/i18n';
import TagsDropdown from '@/components/TagsDropdown.vue';

const dateTimeMask = 'yyyy-MM-dd HH:mm:ss';

export type ExecutionFilterProps = {
	workflows?: IWorkflowShortResponse[];
	filter: {
		status: string;
		workflowId: string;
		startDate: string;
		endDate: string;
		tags: string[];
	};
};

const props = defineProps<ExecutionFilterProps>();

const emit = defineEmits<{
	(event: 'filterChanged', value: object): void;
}>();

const statusFilterApplied = computed(() => {
	return (
		props.filter.status !== 'all' ||
		(!!props.workflows?.length && props.filter.workflowId !== 'all') ||
		!!props.filter.tags.length ||
		!!props.filter.startDate ||
		!!props.filter.endDate
	);
});

const statuses = computed(() => [
	{ id: 'all', name: locale.baseText('executionsList.anyStatus') },
	{ id: 'error', name: locale.baseText('executionsList.error') },
	{ id: 'running', name: locale.baseText('executionsList.running') },
	{ id: 'success', name: locale.baseText('executionsList.success') },
	{ id: 'waiting', name: locale.baseText('executionsList.waiting') },
]);

const startDate = computed(() =>
	props.filter.startDate ? dateformat(props.filter.startDate, dateTimeMask) : '',
);
const endDate = computed(() =>
	props.filter.endDate ? dateformat(props.filter.endDate, dateTimeMask) : '',
);

const onFilterPropChange = (prop: keyof ExecutionFilterProps['filter'], value: string) => {
	console.log('onFilterPropChange', prop, value);
	emit('filterChanged', {
		...props.filter,
		[prop]: value,
	});
};

const onFilterReset = () => {
	emit('filterChanged', {
		status: 'all',
		workflowId: 'all',
		startDate: '',
		endDate: '',
		tags: [],
	});
};
</script>
<template>
	<div :class="$style.filter">
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
					<label for="execution-filter-workflows">{{
						$locale.baseText('workflows.heading')
					}}</label>
					<n8n-select
						id="execution-filter-workflows"
						:value="filter.workflowId"
						:placeholder="$locale.baseText('executionsFilter.selectWorkflow')"
						size="medium"
						filterable
						@change="onFilterPropChange('workflowId', $event)"
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
					<label for="execution-filter-tags">{{
						$locale.baseText('workflows.filters.tags')
					}}</label>
					<TagsDropdown
						id="execution-filter-tags"
						:placeholder="$locale.baseText('workflowOpen.filterWorkflows')"
						:currentTagIds="filter.tags"
						:createEnabled="false"
						@update="onFilterPropChange('tags', $event)"
					/>
				</div>
				<div>
					<label for="execution-filter-status">{{
						$locale.baseText('executionsList.status')
					}}</label>
					<n8n-select
						id="execution-filter-status"
						:value="filter.status"
						:placeholder="$locale.baseText('executionsFilter.selectStatus')"
						size="medium"
						filterable
						@change="onFilterPropChange('status', $event)"
					>
						<n8n-option
							v-for="item in statuses"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</n8n-select>
				</div>
				<div>
					<label for="execution-filter-start-date">{{
						$locale.baseText('executionsFilter.start')
					}}</label>
					<div :class="$style.dates">
						<el-date-picker
							id="execution-filter-start-date"
							type="datetime"
							:format="dateTimeMask"
							:value="startDate"
							:placeholder="$locale.baseText('executionsFilter.startDate')"
							@change="onFilterPropChange('startDate', $event)"
						/>
						<span :class="$style.divider">to</span>
						<el-date-picker
							id="execution-filter-end-date"
							type="datetime"
							:format="dateTimeMask"
							:value="endDate"
							:placeholder="$locale.baseText('executionsFilter.endDate')"
							@change="onFilterPropChange('endDate', $event)"
						/>
					</div>
				</div>
				<div>
					<n8n-tooltip placement="top">
						<span :class="$style.label">
							{{ $locale.baseText('executionsFilter.savedData') }}
							<n8n-icon :class="$style.tooltipIcon" icon="question-circle" size="small" />
						</span>
						<template #content> xxxx </template>
					</n8n-tooltip>
					<div :class="$style.group">
						<div>
							<label for="execution-filter-saved-data-key">{{
								$locale.baseText('executionsFilter.savedDataKey')
							}}</label>
							<n8n-input
								id="execution-filter-saved-data-key"
								name="execution-filter-saved-data-key"
								type="text"
								size="medium"
								:placeholder="$locale.baseText('executionsFilter.savedDataKeyPlaceholder')"
								@change="onFilterPropChange('savedDataKey', $event)"
							/>
						</div>
						<div>
							<label for="execution-filter-saved-data-value">{{
								$locale.baseText('executionsFilter.savedDataValue')
							}}</label>
							<n8n-input
								id="execution-filter-saved-data-value"
								name="execution-filter-saved-data-value"
								type="text"
								size="medium"
								:placeholder="$locale.baseText('executionsFilter.savedDataValuePlaceholder')"
								@change="onFilterPropChange('savedDataValue', $event)"
							/>
						</div>
					</div>
				</div>
				<n8n-button
					v-if="statusFilterApplied"
					:class="$style.resetBtn"
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
.filter {
	display: inline-block;
}

.group {
	padding: 0 0 var(--spacing-xs) var(--spacing-s);
}

.dates {
	display: flex;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	white-space: nowrap;
	align-items: center;
}

.divider {
	padding: 0 var(--spacing-m);
	line-height: 100%;
}

.label,
label {
	display: inline-block;
	font-size: var(--font-size-2xs);
	margin: var(--spacing-xs) 0 var(--spacing-3xs);
}

.resetBtn {
	padding: 0;
	margin: var(--spacing-xs) 0 0;
}

.tooltipIcon {
	color: var(--color-text-light);
}
</style>

<style lang="scss" scoped>
:deep(.el-date-editor) {
	input {
		height: 36px;
		border: 0;
		padding-right: 0;
	}

	.el-input__prefix {
		color: var(--color-foreground-dark);
	}

	&:last-of-type {
		input {
			padding-left: 0;
		}

		.el-input__prefix {
			display: none;
		}
	}
}
</style>
