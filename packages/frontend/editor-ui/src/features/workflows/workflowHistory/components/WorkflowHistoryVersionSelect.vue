<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElOption, ElOptionGroup, ElSelect } from 'element-plus';
import WorkflowHistoryVersionDot from './WorkflowHistoryVersionDot.vue';
import WorkflowHistoryPublishedTooltip from './WorkflowHistoryPublishedTooltip.vue';
import type { WorkflowHistoryVersionOption } from '../useWorkflowHistoryVersionOptions';
import type { WorkflowHistoryVersionStatus } from '../types';
import { formatTimestamp } from '../utils';
const props = withDefaults(
	defineProps<{
		modelValue: string;
		options: WorkflowHistoryVersionOption[];
		dataTestId: string;
	}>(),
	{},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();
const popperContainer = ref<HTMLElement | null>(null);

const selectedStatus = computed<WorkflowHistoryVersionStatus>(() => {
	const selectedOption = props.options.find((option) => option.value === props.modelValue);
	return selectedOption?.status ?? 'default';
});

const groupedOptions = computed<
	Array<{ dateLabel: string; options: WorkflowHistoryVersionOption[] }>
>(() => {
	const groups = new Map<string, WorkflowHistoryVersionOption[]>();

	for (const option of props.options) {
		const key = option.createdAt ? formatTimestamp(option.createdAt).date : 'Unknown';
		const groupOptions = groups.get(key);
		if (groupOptions) {
			groupOptions.push(option);
		} else {
			groups.set(key, [option]);
		}
	}

	return Array.from(groups.entries()).map(([dateLabel, options]) => ({ dateLabel, options }));
});
</script>

<template>
	<div :class="$style.container">
		<div ref="popperContainer" />
		<ElSelect
			:model-value="props.modelValue"
			size="small"
			:class="$style.select"
			:popper-class="$style['workflow-history-version-select-dropdown']"
			:append-to="popperContainer"
			teleported
			:data-test-id="props.dataTestId"
			@update:model-value="emit('update:modelValue', $event)"
		>
			<template #prefix>
				<WorkflowHistoryVersionDot :status="selectedStatus" />
			</template>
			<ElOptionGroup
				v-for="group in groupedOptions"
				:key="group.dateLabel"
				:label="group.dateLabel"
			>
				<ElOption
					v-for="option in group.options"
					:key="option.value"
					:value="option.value"
					:label="option.label"
				>
					<WorkflowHistoryPublishedTooltip
						:label="option.label"
						:status="option.status"
						:publish-info="option.publishInfo"
						:offset="24"
						placement="right"
					>
						<span :class="$style.optionRow">
							<WorkflowHistoryVersionDot :status="option.status" />
							<span>{{ option.label }}</span>
						</span>
					</WorkflowHistoryPublishedTooltip>
				</ElOption>
			</ElOptionGroup>
		</ElSelect>
	</div>
</template>

<style module lang="scss">
.container {
	display: inline-block;
}

.select {
	width: 240px;
}

.select :global(.el-input--prefix .el-input__inner) {
	padding-left: 22px;
}

.workflow-history-version-select-dropdown :global(.el-select-dropdown) {
	min-width: 320px !important;
}

.workflow-history-version-select-dropdown :global(.el-select-group__wrap::after) {
	width: 100%;
	left: 0;
	bottom: 8px;
}

.workflow-history-version-select-dropdown :global(.el-select-group__wrap:not(:last-of-type)) {
	padding-bottom: 16px;
}

.optionRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

/* N8nTooltip wraps the trigger in a span; make it stretch full list-row width. */
.workflow-history-version-select-dropdown :global([data-grace-area-trigger]) {
	display: block;
	width: 100%;
}
</style>
