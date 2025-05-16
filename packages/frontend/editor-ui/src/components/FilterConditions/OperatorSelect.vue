<script setup lang="ts">
import { useI18n } from '@/composables/useI18n';
import { computed, ref } from 'vue';
import { OPERATOR_GROUPS } from './constants';
import type { FilterOperator } from './types';
import { getFilterOperator } from './utils';
import type { FilterOperatorType } from 'n8n-workflow';

interface Props {
	selected: string;
	suggestedType?: FilterOperatorType;
	readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), { readOnly: false, suggestedType: 'any' });

const selected = ref(props.selected);
const menuOpen = ref(false);
const shouldRenderItems = ref(false);
const submenu = ref('none');

const emit = defineEmits<{
	operatorChange: [value: string];
}>();

const i18n = useI18n();

const groups = OPERATOR_GROUPS;

const selectedGroupIcon = computed(
	() => groups.find((group) => group.id === selected.value.split(':')[0])?.icon,
);

const selectedOperator = computed(() => getFilterOperator(selected.value));

const selectedType = computed(() => selectedOperator.value.type);

const onOperatorChange = (operator: string): void => {
	selected.value = operator;
	emit('operatorChange', operator);
};

const getOperatorId = (operator: FilterOperator): string =>
	`${operator.type}:${operator.operation}`;

function onSelectVisibleChange(open: boolean) {
	menuOpen.value = open;
	if (!open) {
		submenu.value = 'none';
	}
}

function onGroupSelect(group: string) {
	if (menuOpen.value) {
		submenu.value = group;
	}
}
</script>

<template>
	<n8n-select
		:key="selectedGroupIcon"
		data-test-id="filter-operator-select"
		size="small"
		:model-value="selected"
		:disabled="readOnly"
		@update:model-value="onOperatorChange"
		@visible-change="onSelectVisibleChange"
		@mouseenter="shouldRenderItems = true"
	>
		<template v-if="selectedGroupIcon" #prefix>
			<n8n-icon :class="$style.icon" :icon="selectedGroupIcon" color="text-light" size="small" />
		</template>
		<div v-if="shouldRenderItems" :class="$style.groups">
			<div v-for="group of groups" :key="group.name">
				<n8n-popover
					:visible="submenu === group.id"
					placement="right-start"
					:show-arrow="false"
					:offset="2"
					:popper-style="{ padding: 'var(--spacing-3xs) 0' }"
					width="auto"
				>
					<template #reference>
						<div
							:class="[
								$style.group,
								{
									[$style.selected]: group.id === selectedType,
									[$style.suggested]: group.id === suggestedType,
								},
							]"
							@mouseenter="() => onGroupSelect(group.id)"
							@click="() => onGroupSelect(group.id)"
						>
							<div :class="$style.groupTitle">
								<n8n-icon v-if="group.icon" :icon="group.icon" :class="$style.icon" size="small" />
								<span>{{ i18n.baseText(group.name) }}</span>
							</div>
							<n8n-icon icon="chevron-right" color="text-light" size="xsmall" />
						</div>
					</template>
					<div>
						<n8n-option
							v-for="operator in group.children"
							:key="getOperatorId(operator)"
							:value="getOperatorId(operator)"
							:label="i18n.baseText(operator.name)"
						/>
					</div>
				</n8n-popover>
			</div>
		</div>
		<n8n-option
			v-else
			:key="selected"
			:value="selected"
			:label="i18n.baseText(selectedOperator.name)"
		/>
	</n8n-select>
</template>

<style lang="scss" module>
.icon {
	color: var(--color-text-light);
}

.groups {
	display: flex;
	flex-direction: column;
}

.group {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size-s);
	line-height: var(--font-line-height-regular);
	color: var(--color-text-dark);
	padding: var(--spacing-2xs) var(--spacing-s);
	cursor: pointer;

	&.suggested {
		font-weight: var(--font-weight-bold);
	}

	&:hover {
		background: var(--color-background-base);
	}
}

.groupTitle {
	display: flex;
	gap: var(--spacing-2xs);
	align-items: center;
}
</style>
