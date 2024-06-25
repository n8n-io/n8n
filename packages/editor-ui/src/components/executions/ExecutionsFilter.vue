<script lang="ts" setup>
import { computed, reactive, onBeforeMount, ref } from 'vue';
import type {
	ExecutionFilterType,
	ExecutionFilterMetadata,
	IWorkflowShortResponse,
	IWorkflowDb,
} from '@/Interface';
import { i18n as locale } from '@/plugins/i18n';
import TagsDropdown from '@/components/TagsDropdown.vue';
import { getObjectKeys, isEmpty } from '@/utils/typesUtils';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import type { Placement } from '@floating-ui/core';
import { useDebounce } from '@/composables/useDebounce';

export type ExecutionFilterProps = {
	workflows?: Array<IWorkflowDb | IWorkflowShortResponse>;
	popoverPlacement?: Placement;
	teleported?: boolean;
};

const DATE_TIME_MASK = 'YYYY-MM-DD HH:mm';

const settingsStore = useSettingsStore();
const uiStore = useUIStore();
const { debounce } = useDebounce();

const telemetry = useTelemetry();

const props = withDefaults(defineProps<ExecutionFilterProps>(), {
	workflows: () => [] as Array<IWorkflowDb | IWorkflowShortResponse>,
	popoverPlacement: 'bottom' as Placement,
	teleported: true,
});
const emit = defineEmits<{
	(event: 'filterChanged', value: ExecutionFilterType): void;
}>();
const debouncedEmit = debounce(emit, {
	debounceTime: 500,
});

const isCustomDataFilterTracked = ref(false);
const isAdvancedExecutionFilterEnabled = computed(() =>
	settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.AdvancedExecutionFilters),
);
const showTags = computed(() => false);

const getDefaultFilter = (): ExecutionFilterType => ({
	status: 'all',
	workflowId: 'all',
	tags: [],
	startDate: '',
	endDate: '',
	metadata: [{ key: '', value: '' }],
});
const filter = reactive(getDefaultFilter());

// Automatically set up v-models based on filter properties
const vModel = reactive(
	getObjectKeys(filter).reduce(
		(acc, key) => {
			acc[key] = computed({
				get() {
					return filter[key];
				},
				set(value) {
					// TODO: find out what exactly is typechecker complaining about

					// @ts-ignore
					filter[key] = value;
					emit('filterChanged', filter);
				},
			});
			return acc;
		},
		{} as Record<keyof ExecutionFilterType, ReturnType<typeof computed>>,
	),
);

const statuses = computed(() => [
	{ id: 'all', name: locale.baseText('executionsList.anyStatus') },
	{ id: 'error', name: locale.baseText('executionsList.error') },
	{ id: 'canceled', name: locale.baseText('executionsList.canceled') },
	{ id: 'running', name: locale.baseText('executionsList.running') },
	{ id: 'success', name: locale.baseText('executionsList.success') },
	{ id: 'waiting', name: locale.baseText('executionsList.waiting') },
]);

const countSelectedFilterProps = computed(() => {
	let count = 0;
	if (filter.status !== 'all') {
		count++;
	}
	if (filter.workflowId !== 'all' && props.workflows.length) {
		count++;
	}
	if (!isEmpty(filter.tags)) {
		count++;
	}
	if (!isEmpty(filter.metadata)) {
		count++;
	}
	if (!!filter.startDate) {
		count++;
	}
	if (!!filter.endDate) {
		count++;
	}
	return count;
});

// vModel.metadata is a text input and needs a debounced emit to avoid too many requests
// We use the :value and @input combo instead of v-model with this event listener
const onFilterMetaChange = (index: number, prop: keyof ExecutionFilterMetadata, value: string) => {
	if (!filter.metadata[index]) {
		filter.metadata[index] = {
			key: '',
			value: '',
		};
	}
	filter.metadata[index][prop] = value;

	if (!isCustomDataFilterTracked.value) {
		telemetry.track('User filtered executions with custom data');
		isCustomDataFilterTracked.value = true;
	}

	debouncedEmit('filterChanged', filter);
};

// Can't use v-model on TagsDropdown component and thus vModel.tags is useless
// We just emit the updated filter
const onTagsChange = (tags: string[]) => {
	filter.tags = tags;
	emit('filterChanged', filter);
};

const onFilterReset = () => {
	Object.assign(filter, getDefaultFilter());
	emit('filterChanged', filter);
};

const goToUpgrade = () => {
	void uiStore.goToUpgrade('custom-data-filter', 'upgrade-custom-data-filter');
};

onBeforeMount(() => {
	isCustomDataFilterTracked.value = false;
});
</script>
<template>
	<n8n-popover trigger="click" :placement="popoverPlacement" width="440">
		<template #reference>
			<n8n-button
				icon="filter"
				type="tertiary"
				:active="!!countSelectedFilterProps"
				data-test-id="executions-filter-button"
			>
				<n8n-badge
					v-if="!!countSelectedFilterProps"
					theme="primary"
					class="mr-4xs"
					data-test-id="execution-filter-badge"
					>{{ countSelectedFilterProps }}</n8n-badge
				>
				{{ locale.baseText('executionsList.filters') }}
			</n8n-button>
		</template>
		<div data-test-id="execution-filter-form">
			<div v-if="workflows && workflows.length > 0" :class="$style.group">
				<label for="execution-filter-workflows">{{ locale.baseText('workflows.heading') }}</label>
				<n8n-select
					id="execution-filter-workflows"
					v-model="vModel.workflowId"
					:placeholder="locale.baseText('executionsFilter.selectWorkflow')"
					filterable
					data-test-id="executions-filter-workflows-select"
					:teleported="teleported"
				>
					<div>
						<n8n-option
							v-for="(item, idx) in props.workflows"
							:key="idx"
							:label="item.name"
							:value="item.id"
						/>
					</div>
				</n8n-select>
			</div>
			<div v-if="showTags" :class="$style.group">
				<label for="execution-filter-tags">{{ locale.baseText('workflows.filters.tags') }}</label>
				<TagsDropdown
					id="execution-filter-tags"
					:placeholder="locale.baseText('workflowOpen.filterWorkflows')"
					:model-value="filter.tags"
					:create-enabled="false"
					data-test-id="executions-filter-tags-select"
					@update:model-value="onTagsChange"
				/>
			</div>
			<div :class="$style.group">
				<label for="execution-filter-status">{{ locale.baseText('executionsList.status') }}</label>
				<n8n-select
					id="execution-filter-status"
					v-model="vModel.status"
					:placeholder="locale.baseText('executionsFilter.selectStatus')"
					filterable
					data-test-id="executions-filter-status-select"
					:teleported="teleported"
				>
					<n8n-option
						v-for="(item, idx) in statuses"
						:key="idx"
						:label="item.name"
						:value="item.id"
					/>
				</n8n-select>
			</div>
			<div :class="$style.group">
				<label for="execution-filter-start-date">{{
					locale.baseText('executionsFilter.start')
				}}</label>
				<div :class="$style.dates">
					<el-date-picker
						id="execution-filter-start-date"
						v-model="vModel.startDate"
						type="datetime"
						:teleported="false"
						:format="DATE_TIME_MASK"
						:placeholder="locale.baseText('executionsFilter.startDate')"
						data-test-id="executions-filter-start-date-picker"
					/>
					<span :class="$style.divider">to</span>
					<el-date-picker
						id="execution-filter-end-date"
						v-model="vModel.endDate"
						type="datetime"
						:teleported="false"
						:format="DATE_TIME_MASK"
						:placeholder="locale.baseText('executionsFilter.endDate')"
						data-test-id="executions-filter-end-date-picker"
					/>
				</div>
			</div>
			<div :class="$style.group">
				<n8n-tooltip placement="right">
					<template #content>
						<i18n-t tag="span" keypath="executionsFilter.customData.docsTooltip">
							<template #link>
								<a
									target="_blank"
									href="https://docs.n8n.io/workflows/executions/custom-executions-data/"
								>
									{{ locale.baseText('executionsFilter.customData.docsTooltip.link') }}
								</a>
							</template>
						</i18n-t>
					</template>
					<span :class="$style.label">
						{{ locale.baseText('executionsFilter.savedData') }}
						<n8n-icon :class="$style.tooltipIcon" icon="question-circle" size="small" />
					</span>
				</n8n-tooltip>
				<div :class="$style.subGroup">
					<label for="execution-filter-saved-data-key">{{
						locale.baseText('executionsFilter.savedDataKey')
					}}</label>
					<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
						<template #content>
							<i18n-t tag="span" keypath="executionsFilter.customData.inputTooltip">
								<template #link>
									<a
										href="#"
										data-test-id="executions-filter-view-plans-link"
										@click.prevent="goToUpgrade"
										>{{ locale.baseText('executionsFilter.customData.inputTooltip.link') }}</a
									>
								</template>
							</i18n-t>
						</template>
						<n8n-input
							id="execution-filter-saved-data-key"
							name="execution-filter-saved-data-key"
							type="text"
							:disabled="!isAdvancedExecutionFilterEnabled"
							:placeholder="locale.baseText('executionsFilter.savedDataKeyPlaceholder')"
							:model-value="filter.metadata[0]?.key"
							data-test-id="execution-filter-saved-data-key-input"
							@update:model-value="onFilterMetaChange(0, 'key', $event)"
						/>
					</n8n-tooltip>
					<label for="execution-filter-saved-data-value">{{
						locale.baseText('executionsFilter.savedDataValue')
					}}</label>
					<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
						<template #content>
							<i18n-t tag="span" keypath="executionsFilter.customData.inputTooltip">
								<template #link>
									<a href="#" @click.prevent="goToUpgrade">{{
										locale.baseText('executionsFilter.customData.inputTooltip.link')
									}}</a>
								</template>
							</i18n-t>
						</template>
						<n8n-input
							id="execution-filter-saved-data-value"
							name="execution-filter-saved-data-value"
							type="text"
							:disabled="!isAdvancedExecutionFilterEnabled"
							:placeholder="locale.baseText('executionsFilter.savedDataValuePlaceholder')"
							:model-value="filter.metadata[0]?.value"
							data-test-id="execution-filter-saved-data-value-input"
							@update:model-value="onFilterMetaChange(0, 'value', $event)"
						/>
					</n8n-tooltip>
				</div>
			</div>
			<n8n-button
				v-if="!!countSelectedFilterProps"
				:class="$style.resetBtn"
				size="large"
				text
				data-test-id="executions-filter-reset-button"
				@click="onFilterReset"
			>
				{{ locale.baseText('executionsFilter.reset') }}
			</n8n-button>
		</div>
	</n8n-popover>
</template>
<style lang="scss" module>
.group {
	label,
	.label {
		display: inline-block;
		font-size: var(--font-size-2xs);
		margin: var(--spacing-s) 0 var(--spacing-3xs);
	}
}

.subGroup {
	padding: 0 0 var(--spacing-xs) var(--spacing-s);

	label,
	.label {
		font-size: var(--font-size-3xs);
		margin: var(--spacing-4xs) 0 var(--spacing-4xs);
	}
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

:deep(.el-select-dropdown.el-popper[data-popper-placement^='bottom']) {
	> .popper__arrow {
		top: -6px;
		left: 50%;
		right: unset;
		margin-bottom: 0;
		margin-right: 3px;
		border-left-width: 6px;
		border-top-width: 0;
		border-bottom-color: var(--border-color-light);
		border-right-color: transparent;

		&::after {
			top: 1px;
			left: unset;
			bottom: unset;
			margin-left: -6px;
			border-left-width: 6px;
			border-top-width: 0;
			border-bottom-color: var(--color-foreground-xlight);
			border-right-color: transparent;
		}
	}
}
</style>
