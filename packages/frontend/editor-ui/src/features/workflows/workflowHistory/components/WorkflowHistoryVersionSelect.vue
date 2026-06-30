<script setup lang="ts">
import { computed, ref, unref } from 'vue';
import { ElOption, ElOptionGroup } from 'element-plus';
import { N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import WorkflowVersionStatusIndicator from './WorkflowVersionStatusIndicator.vue';
import WorkflowHistoryPublishedTooltip from './WorkflowHistoryPublishedTooltip.vue';
import WorkflowHistoryUpgradeFooter from './WorkflowHistoryUpgradeFooter.vue';
import type { WorkflowHistoryVersionOption } from '../useWorkflowHistoryVersionOptions';
import { formatTimestamp } from '../utils';
import { useWorkflowHistoryStore } from '../workflowHistory.store';
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
	upgrade: [];
}>();
const popperContainer = ref<HTMLElement | null>(null);
const filter = ref('');
const i18n = useI18n();
const workflowHistoryStore = useWorkflowHistoryStore();

const optionsByValue = computed(() => {
	return new Map(props.options.map((option) => [option.value, option]));
});

const selectedOption = computed(() => {
	return optionsByValue.value.get(props.modelValue);
});

const selectedOptionWrapperProps = computed(() => {
	const publishInfo = selectedOption.value?.publishInfo;
	if (!publishInfo) {
		return null;
	}

	return {
		label: selectedOption.value.label,
		status: selectedOption.value.status,
		publishInfo,
	};
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

type GroupedOption = { dateLabel: string; options: WorkflowHistoryVersionOption[] };

const selectedOptionHasPublishInfo = computed(() => {
	return Boolean(selectedOption.value?.publishInfo);
});

const filterGroupOptions = (group: GroupedOption, normalizedFilter: string): GroupedOption => {
	const filteredOptions = group.options.filter((option) =>
		option.label.toLowerCase().includes(normalizedFilter),
	);
	if (filteredOptions.length === group.options.length) {
		return group;
	}

	return {
		...group,
		options: filteredOptions,
	};
};

const filteredGroupedOptions = computed<GroupedOption[]>(() => {
	if (!filter.value) {
		return groupedOptions.value;
	}

	const normalizedFilter = filter.value.toLowerCase().trim();
	const filteredGroups: GroupedOption[] = [];
	for (const group of groupedOptions.value) {
		const filteredGroup = filterGroupOptions(group, normalizedFilter);
		const filteredGroupHasOptions = filteredGroup.options.length > 0;
		if (filteredGroupHasOptions) {
			filteredGroups.push(filteredGroup);
		}
	}
	return filteredGroups;
});

function onFilter(query = '') {
	filter.value = query;
}

function onVisibleChange(isVisible: boolean) {
	if (!isVisible) {
		filter.value = '';
	}
}

const pruneTimeDisplay = computed(() => {
	const timeInHours = unref(workflowHistoryStore.evaluatedPruneTime) ?? 0;

	if (timeInHours < 24) {
		const key = timeInHours === 1 ? 'workflowHistory.limitHour' : 'workflowHistory.limitHours';
		return i18n.baseText(key, {
			interpolate: { hours: String(timeInHours) },
		});
	}

	const days = Math.round(timeInHours / 24);
	const key = days === 1 ? 'workflowHistory.limitDay' : 'workflowHistory.limitDays';
	return i18n.baseText(key, { interpolate: { days: String(days) } });
});

const shouldShowUpgradeFooter = computed(() => Boolean(unref(workflowHistoryStore.shouldUpgrade)));
</script>

<template>
	<div :class="$style.container">
		<div ref="popperContainer" />
		<component
			:is="selectedOptionHasPublishInfo ? WorkflowHistoryPublishedTooltip : 'span'"
			v-bind="selectedOptionWrapperProps ?? {}"
		>
			<N8nSelect
				:model-value="props.modelValue"
				size="small"
				filterable
				:filter-method="onFilter"
				:class="$style.select"
				:popper-class="$style['workflow-history-version-select-dropdown']"
				:append-to="popperContainer"
				teleported
				:data-test-id="props.dataTestId"
				@update:model-value="emit('update:modelValue', $event)"
				@visible-change="onVisibleChange"
			>
				<template #prefix>
					<WorkflowVersionStatusIndicator :status="selectedOption?.status" />
				</template>
				<ElOptionGroup
					v-for="group in filteredGroupedOptions"
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
							v-if="option.publishInfo"
							:label="option.label"
							:status="option.status"
							:publish-info="option.publishInfo"
							:offset="24"
							placement="right"
						>
							<span :class="$style.optionRow">
								<WorkflowVersionStatusIndicator :status="option.status" />
								<span>{{ option.label }}</span>
							</span>
						</WorkflowHistoryPublishedTooltip>
						<span v-else :class="$style.optionRow">
							<WorkflowVersionStatusIndicator :status="option.status" />
							<span>{{ option.label }}</span>
						</span>
					</ElOption>
				</ElOptionGroup>
				<template v-if="shouldShowUpgradeFooter" #footer>
					<WorkflowHistoryUpgradeFooter
						:prune-time-display="pruneTimeDisplay"
						:with-top-border="true"
						@upgrade="emit('upgrade')"
					/>
				</template>
			</N8nSelect>
		</component>
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
	bottom: var(--spacing--2xs);
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
