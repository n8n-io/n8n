<script lang="ts" setup>
import { computed, reactive, onBeforeMount } from 'vue';
import debounce from 'lodash/debounce';
import type { PopoverPlacement } from 'element-ui/types/popover';
import type {
	ExecutionFilterType,
	ExecutionFilterMetadata,
	IWorkflowShortResponse,
} from '@/Interface';
import { i18n as locale } from '@/plugins/i18n';
import TagsDropdown from '@/components/TagsDropdown.vue';
import { getObjectKeys, isEmpty } from '@/utils';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings';
import { useUsageStore } from '@/stores/usage';

export type ExecutionFilterProps = {
	workflows?: IWorkflowShortResponse[];
	popoverPlacement?: PopoverPlacement;
};

const DATE_TIME_MASK = 'yyyy-MM-dd HH:mm';
const CLOUD_UPGRADE_LINK = 'https://app.n8n.cloud/manage?edition=cloud';

const settingsStore = useSettingsStore();
const usageStore = useUsageStore();
const props = withDefaults(defineProps<ExecutionFilterProps>(), {
	popoverPlacement: 'bottom',
});
const emit = defineEmits<{
	(event: 'filterChanged', value: ExecutionFilterType): void;
}>();
const debouncedEmit = debounce(emit, 500);

const viewPlansLink = computed(() =>
	settingsStore.isCloudDeployment
		? CLOUD_UPGRADE_LINK
		: `${usageStore.viewPlansUrl}&source=custom-data-filter`,
);
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
	getObjectKeys(filter).reduce((acc, key) => {
		acc[key] = computed({
			get() {
				return filter[key];
			},
			set(value) {
				// TODO: find out what exactly is typechecker complaining about
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				filter[key] = value;
				emit('filterChanged', filter);
			},
		});
		return acc;
	}, {} as Record<keyof ExecutionFilterType, ReturnType<typeof computed>>),
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
	if (filter.workflowId !== 'all') {
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

onBeforeMount(() => {
	emit('filterChanged', filter);
});
</script>
<template>
	<div :class="$style.filter">
		<n8n-popover trigger="click" :placement="popoverPlacement">
			<template #reference>
				<n8n-button
					icon="filter"
					type="tertiary"
					size="medium"
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
					{{ $locale.baseText('executionsList.filters') }}
				</n8n-button>
			</template>
			<div data-test-id="execution-filter-form">
				<div v-if="workflows?.length" :class="$style.group">
					<label for="execution-filter-workflows">{{
						$locale.baseText('workflows.heading')
					}}</label>
					<n8n-select
						id="execution-filter-workflows"
						v-model="vModel.workflowId"
						:placeholder="$locale.baseText('executionsFilter.selectWorkflow')"
						size="medium"
						filterable
						data-test-id="executions-filter-workflows-select"
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
				<div v-if="showTags" :class="$style.group">
					<label for="execution-filter-tags">{{
						$locale.baseText('workflows.filters.tags')
					}}</label>
					<TagsDropdown
						id="execution-filter-tags"
						:placeholder="$locale.baseText('workflowOpen.filterWorkflows')"
						:currentTagIds="filter.tags"
						:createEnabled="false"
						@update="onTagsChange"
						data-test-id="executions-filter-tags-select"
					/>
				</div>
				<div :class="$style.group">
					<label for="execution-filter-status">{{
						$locale.baseText('executionsList.status')
					}}</label>
					<n8n-select
						id="execution-filter-status"
						v-model="vModel.status"
						:placeholder="$locale.baseText('executionsFilter.selectStatus')"
						size="medium"
						filterable
						data-test-id="executions-filter-status-select"
					>
						<n8n-option
							v-for="item in statuses"
							:key="item.id"
							:label="item.name"
							:value="item.id"
						/>
					</n8n-select>
				</div>
				<div :class="$style.group">
					<label for="execution-filter-start-date">{{
						$locale.baseText('executionsFilter.start')
					}}</label>
					<div :class="$style.dates">
						<el-date-picker
							id="execution-filter-start-date"
							type="datetime"
							v-model="vModel.startDate"
							:format="DATE_TIME_MASK"
							:placeholder="$locale.baseText('executionsFilter.startDate')"
							data-test-id="executions-filter-start-date-picker"
						/>
						<span :class="$style.divider">to</span>
						<el-date-picker
							id="execution-filter-end-date"
							type="datetime"
							v-model="vModel.endDate"
							:format="DATE_TIME_MASK"
							:placeholder="$locale.baseText('executionsFilter.endDate')"
							data-test-id="executions-filter-end-date-picker"
						/>
					</div>
				</div>
				<div :class="$style.group">
					<n8n-tooltip placement="right">
						<template #content>
							<i18n tag="span" path="executionsFilter.customData.docsTooltip">
								<template #link>
									<a
										target="_blank"
										href="https://docs.n8n.io/workflows/executions/custom-executions-data/"
									>
										{{ $locale.baseText('executionsFilter.customData.docsTooltip.link') }}
									</a>
								</template>
							</i18n>
						</template>
						<span :class="$style.label">
							{{ $locale.baseText('executionsFilter.savedData') }}
							<n8n-icon :class="$style.tooltipIcon" icon="question-circle" size="small" />
						</span>
					</n8n-tooltip>
					<div :class="$style.subGroup">
						<label for="execution-filter-saved-data-key">{{
							$locale.baseText('executionsFilter.savedDataKey')
						}}</label>
						<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
							<template #content>
								<i18n tag="span" path="executionsFilter.customData.inputTooltip">
									<template #link>
										<a
											target="_blank"
											:href="viewPlansLink"
											data-test-id="executions-filter-view-plans-link"
											>{{ $locale.baseText('executionsFilter.customData.inputTooltip.link') }}</a
										>
									</template>
								</i18n>
							</template>
							<n8n-input
								id="execution-filter-saved-data-key"
								name="execution-filter-saved-data-key"
								type="text"
								size="medium"
								:disabled="!isAdvancedExecutionFilterEnabled"
								:placeholder="$locale.baseText('executionsFilter.savedDataKeyPlaceholder')"
								:value="filter.metadata[0]?.key"
								@input="onFilterMetaChange(0, 'key', $event)"
								data-test-id="execution-filter-saved-data-key-input"
							/>
						</n8n-tooltip>
						<label for="execution-filter-saved-data-value">{{
							$locale.baseText('executionsFilter.savedDataValue')
						}}</label>
						<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
							<template #content>
								<i18n tag="span" path="executionsFilter.customData.inputTooltip">
									<template #link>
										<a target="_blank" :href="viewPlansLink">{{
											$locale.baseText('executionsFilter.customData.inputTooltip.link')
										}}</a>
									</template>
								</i18n>
							</template>
							<n8n-input
								id="execution-filter-saved-data-value"
								name="execution-filter-saved-data-value"
								type="text"
								size="medium"
								:disabled="!isAdvancedExecutionFilterEnabled"
								:placeholder="$locale.baseText('executionsFilter.savedDataValuePlaceholder')"
								:value="filter.metadata[0]?.value"
								@input="onFilterMetaChange(0, 'value', $event)"
								data-test-id="execution-filter-saved-data-value-input"
							/>
						</n8n-tooltip>
					</div>
				</div>
				<n8n-button
					v-if="!!countSelectedFilterProps"
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

:deep(.el-select-dropdown.el-popper[x-placement^='bottom']) {
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
