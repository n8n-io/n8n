<script lang="ts" setup>
import AnnotationTagsDropdown from '@/components/AnnotationTagsDropdown.ee.vue';
import { useDebounce } from '@/composables/useDebounce';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useTelemetry } from '@/composables/useTelemetry';
import { EnterpriseEditionFeature } from '@/constants';
import type {
	ExecutionFilterMetadata,
	ExecutionFilterType,
	IWorkflowDb,
	IWorkflowShortResponse,
} from '@/Interface';
import { i18n as locale } from '@n8n/i18n';
import { useSettingsStore } from '@/stores/settings.store';
import { isEmpty } from '@/utils/typesUtils';
import type { Placement } from '@floating-ui/core';
import { computed, onBeforeMount, reactive, ref, watch } from 'vue';
import { I18nT } from 'vue-i18n';

export type ExecutionFilterProps = {
	workflows?: Array<IWorkflowDb | IWorkflowShortResponse>;
	popoverPlacement?: Placement;
	teleported?: boolean;
};

const DATE_TIME_MASK = 'YYYY-MM-DD HH:mm';

const settingsStore = useSettingsStore();
const { debounce } = useDebounce();

const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();

const props = withDefaults(defineProps<ExecutionFilterProps>(), {
	workflows: () => [] as Array<IWorkflowDb | IWorkflowShortResponse>,
	popoverPlacement: 'bottom' as Placement,
	teleported: true,
});
const emit = defineEmits<{
	filterChanged: [value: ExecutionFilterType];
}>();
const debouncedEmit = debounce(emit, {
	debounceTime: 500,
});

const isCustomDataFilterTracked = ref(false);
const isAdvancedExecutionFilterEnabled = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AdvancedExecutionFilters],
);
const isAnnotationFiltersEnabled = computed(() => isAdvancedExecutionFilterEnabled.value);
const showTags = computed(() => false);

const getDefaultFilter = (): ExecutionFilterType => ({
	status: 'all',
	workflowId: 'all',
	tags: [],
	annotationTags: [],
	startDate: '',
	endDate: '',
	metadata: [{ key: '', value: '', exactMatch: false }],
	vote: 'all',
});
const filter = reactive(getDefaultFilter());

// Deep watcher to emit filterChanged events with debouncing for date fields only
watch(
	filter,
	(newFilter) => {
		// Use debounced emit if filter contains date changes to prevent rapid API calls
		if (newFilter.startDate || newFilter.endDate) {
			debouncedEmit('filterChanged', newFilter);
		} else {
			emit('filterChanged', newFilter);
		}
	},
	{ deep: true, immediate: false },
);

const statuses = computed(() => [
	{ id: 'all', name: locale.baseText('executionsList.anyStatus') },
	{ id: 'error', name: locale.baseText('executionsList.error') },
	{ id: 'canceled', name: locale.baseText('executionsList.canceled') },
	{ id: 'new', name: locale.baseText('executionsList.new') },
	{ id: 'running', name: locale.baseText('executionsList.running') },
	{ id: 'success', name: locale.baseText('executionsList.success') },
	{ id: 'waiting', name: locale.baseText('executionsList.waiting') },
]);

const voteFilterOptions = computed(() => [
	{ id: 'all', name: locale.baseText('executionsFilter.annotation.rating.all') },
	{ id: 'up', name: locale.baseText('executionsFilter.annotation.rating.good') },
	{ id: 'down', name: locale.baseText('executionsFilter.annotation.rating.bad') },
]);

const countSelectedFilterProps = computed(() => {
	const nonDefaultFilters = [
		filter.status !== 'all',
		filter.workflowId !== 'all' && props.workflows.length,
		!isEmpty(filter.tags),
		!isEmpty(filter.annotationTags),
		filter.vote !== 'all',
		!isEmpty(filter.metadata),
		!!filter.startDate,
		!!filter.endDate,
	].filter(Boolean);

	return nonDefaultFilters.length;
});

// vModel.metadata is a text input and needs a debounced emit to avoid too many requests
// We use the :value and @input combo instead of v-model with this event listener
const onFilterMetaChange = <K extends keyof ExecutionFilterMetadata>(
	index: number,
	prop: K,
	value: ExecutionFilterMetadata[K],
) => {
	if (!filter.metadata[index]) {
		filter.metadata[index] = {
			key: '',
			value: '',
			exactMatch: false,
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
const onTagsChange = () => {
	emit('filterChanged', filter);
};

const onAnnotationTagsChange = () => {
	emit('filterChanged', filter);
};

const onFilterReset = () => {
	Object.assign(filter, getDefaultFilter());
};

const goToUpgrade = () => {
	void pageRedirectionHelper.goToUpgrade('custom-data-filter', 'upgrade-custom-data-filter');
};

const onExactMatchChange = (e: string | number | boolean) => {
	if (typeof e === 'boolean') {
		onFilterMetaChange(0, 'exactMatch', e);
	}
};

onBeforeMount(() => {
	isCustomDataFilterTracked.value = false;
});
</script>
<template>
	<n8n-popover trigger="click" :placement="popoverPlacement" width="440">
		<template #reference>
			<n8n-button
				icon="funnel"
				type="tertiary"
				size="medium"
				square
				:active="!!countSelectedFilterProps"
				data-test-id="executions-filter-button"
				:class="$style.filterButton"
			>
				<template v-if="!!countSelectedFilterProps" #default>
					<n8n-badge
						theme="primary"
						class="mr-4xs"
						data-test-id="execution-filter-badge"
						:class="$style.filterBadge"
					>
						{{ countSelectedFilterProps }}
					</n8n-badge>
				</template>
			</n8n-button>
		</template>
		<div data-test-id="execution-filter-form">
			<div v-if="workflows && workflows.length > 0" :class="$style.group">
				<label for="execution-filter-workflows">{{ locale.baseText('workflows.heading') }}</label>
				<n8n-select
					id="execution-filter-workflows"
					v-model="filter.workflowId"
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
				<WorkflowTagsDropdown
					id="execution-filter-tags"
					v-model="filter.tags"
					:placeholder="locale.baseText('workflowOpen.filterWorkflows')"
					:create-enabled="false"
					data-test-id="executions-filter-tags-select"
					@update:model-value="onTagsChange"
				/>
			</div>
			<div :class="$style.group">
				<label for="execution-filter-status">{{ locale.baseText('executionsList.status') }}</label>
				<n8n-select
					id="execution-filter-status"
					v-model="filter.status"
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
						v-model="filter.startDate"
						type="datetime"
						:teleported="false"
						:format="DATE_TIME_MASK"
						:placeholder="locale.baseText('executionsFilter.startDate')"
						data-test-id="executions-filter-start-date-picker"
					/>
					<span :class="$style.divider">to</span>
					<el-date-picker
						id="execution-filter-end-date"
						v-model="filter.endDate"
						type="datetime"
						:teleported="false"
						:format="DATE_TIME_MASK"
						:placeholder="locale.baseText('executionsFilter.endDate')"
						data-test-id="executions-filter-end-date-picker"
					/>
				</div>
			</div>
			<div v-if="isAnnotationFiltersEnabled" :class="$style.group">
				<label for="execution-filter-annotation-tags">{{
					locale.baseText('executionsFilter.annotation.tags')
				}}</label>
				<AnnotationTagsDropdown
					id="execution-filter-annotation-tags"
					v-model="filter.annotationTags"
					:placeholder="locale.baseText('workflowOpen.filterWorkflows')"
					:create-enabled="false"
					data-test-id="executions-filter-annotation-tags-select"
					@update:model-value="onAnnotationTagsChange"
				/>
			</div>
			<div v-if="isAnnotationFiltersEnabled" :class="$style.group">
				<label for="execution-filter-annotation-vote">{{
					locale.baseText('executionsFilter.annotation.rating')
				}}</label>
				<n8n-select
					id="execution-filter-annotation-vote"
					v-model="filter.vote"
					:placeholder="locale.baseText('executionsFilter.annotation.selectVoteFilter')"
					filterable
					data-test-id="executions-filter-annotation-vote-select"
					:teleported="teleported"
				>
					<n8n-option
						v-for="(item, idx) in voteFilterOptions"
						:key="idx"
						:label="item.name"
						:value="item.id"
					/>
				</n8n-select>
			</div>
			<div :class="$style.group">
				<n8n-tooltip placement="right">
					<template #content>
						<I18nT tag="span" keypath="executionsFilter.customData.docsTooltip" scope="global" />
					</template>
					<span :class="[$style.label, $style.savedDataLabel]">
						<span>{{ locale.baseText('executionsFilter.savedData') }}</span>
						<n8n-icon :class="$style.tooltipIcon" icon="circle-help" size="medium" />
					</span>
				</n8n-tooltip>
				<div :class="$style.subGroup">
					<label for="execution-filter-saved-data-key">{{
						locale.baseText('executionsFilter.savedDataKey')
					}}</label>
					<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
						<template #content>
							<I18nT tag="span" keypath="executionsFilter.customData.inputTooltip" scope="global">
								<template #link>
									<a
										href="#"
										data-test-id="executions-filter-view-plans-link"
										@click.prevent="goToUpgrade"
										>{{ locale.baseText('executionsFilter.customData.inputTooltip.link') }}</a
									>
								</template>
							</I18nT>
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
					<div :class="$style.checkboxWrapper">
						<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
							<template #content>
								<I18nT tag="span" keypath="executionsFilter.customData.inputTooltip" scope="global">
									<template #link>
										<a href="#" @click.prevent="goToUpgrade">{{
											locale.baseText('executionsFilter.customData.inputTooltip.link')
										}}</a>
									</template>
								</I18nT>
							</template>
							<n8n-checkbox
								:label="locale.baseText('executionsFilter.savedDataExactMatch')"
								:model-value="filter.metadata[0]?.exactMatch"
								:disabled="!isAdvancedExecutionFilterEnabled"
								data-test-id="execution-filter-saved-data-exact-match-checkbox"
								@update:model-value="onExactMatchChange"
							/>
						</n8n-tooltip>
					</div>
					<label for="execution-filter-saved-data-value">{{
						locale.baseText('executionsFilter.savedDataValue')
					}}</label>
					<n8n-tooltip :disabled="isAdvancedExecutionFilterEnabled" placement="top">
						<template #content>
							<I18nT tag="span" keypath="executionsFilter.customData.inputTooltip" scope="global">
								<template #link>
									<a href="#" @click.prevent="goToUpgrade">{{
										locale.baseText('executionsFilter.customData.inputTooltip.link')
									}}</a>
								</template>
							</I18nT>
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
		color: var(--color-text-dark);
	}
}

.label.savedDataLabel {
	display: flex;
	align-items: center;
	span {
		margin-right: var(--spacing-3xs);
	}
}

.subGroup {
	padding: 0 0 var(--spacing-xs) var(--spacing-s);

	label,
	.label {
		font-size: var(--font-size-3xs);
		margin: var(--spacing-4xs) 0 var(--spacing-4xs);
	}

	.checkboxWrapper {
		margin-top: var(--spacing-s);
		margin-bottom: var(--spacing-2xs);

		label {
			margin: 0;
		}
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

.filterButton {
	position: relative;

	.filterBadge {
		position: absolute;
		top: 0;
		right: -4px;
		transform: translate(50%, -50%);
	}
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
