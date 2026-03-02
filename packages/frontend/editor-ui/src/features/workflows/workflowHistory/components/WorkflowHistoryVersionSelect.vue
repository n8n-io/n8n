<script setup lang="ts">
import { computed } from 'vue';
import { ElOptionGroup } from 'element-plus';
import { N8nOption, N8nSelect, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import WorkflowHistoryVersionDot from './WorkflowHistoryVersionDot.vue';
import type {
	VersionStatus,
	WorkflowHistoryVersionOption,
} from '../useWorkflowHistoryVersionOptions';
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
const i18n = useI18n();

const selectedStatus = computed<VersionStatus>(() => {
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

const getTooltipContent = (option: WorkflowHistoryVersionOption): string => {
	if (!option.publishInfo) {
		return option.label;
	}

	const { date, time } = formatTimestamp(option.publishInfo.publishedAt);
	const publishedAt = i18n.baseText('workflowHistory.item.createdAt', {
		interpolate: { date, time },
	});

	if (option.publishInfo.publishedBy) {
		return `${option.label}: ${i18n.baseText('workflowHistory.item.publishedBy')} ${option.publishInfo.publishedBy}, ${publishedAt}`;
	}

	return `${option.label}: ${i18n.baseText('workflowHistory.item.active')}, ${publishedAt}`;
};
</script>

<template>
	<N8nSelect
		:model-value="props.modelValue"
		size="small"
		style="width: 240px"
		popper-class="workflow-history-diff-version-dropdown"
		:data-test-id="props.dataTestId"
		@update:model-value="emit('update:modelValue', $event)"
	>
		<template #prefix>
			<WorkflowHistoryVersionDot :status="selectedStatus" />
		</template>
		<ElOptionGroup v-for="group in groupedOptions" :key="group.dateLabel" :label="group.dateLabel">
			<N8nTooltip
				v-for="option in group.options"
				:key="option.value"
				:content="getTooltipContent(option)"
				placement="right"
			>
				<template #content>
					<div>
						{{ getTooltipContent(option) }}
					</div>
				</template>
				<N8nOption :value="option.value" :label="option.label">
					<div style="display: flex; align-items: center; gap: var(--spacing--2xs)">
						<WorkflowHistoryVersionDot :status="option.status" />
						<N8nText size="small" color="text-dark">
							{{ option.label }}
						</N8nText>
					</div>
				</N8nOption>
			</N8nTooltip>
		</ElOptionGroup>
	</N8nSelect>
</template>

<style module lang="scss">
:global(.workflow-history-diff-version-dropdown) {
	min-width: 320px !important;
}
</style>
