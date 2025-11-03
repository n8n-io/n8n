<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { OPERATOR_GROUPS } from './constants';
import type { FilterOperator } from './types';
import { getFilterOperator } from './utils';
import type { FilterOperatorType } from 'n8n-workflow';

import { N8nIcon, N8nOption, N8nPopover, N8nSelect } from '@n8n/design-system';
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
	<N8nSelect
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
			<N8nIcon :class="$style.icon" :icon="selectedGroupIcon" color="text-light" size="small" />
		</template>
		<div v-if="shouldRenderItems" :class="$style.groups">
			<div v-for="group of groups" :key="group.name">
				<N8nPopover
					:visible="submenu === group.id"
					placement="right-start"
					:show-arrow="false"
					:offset="2"
					:popper-style="{ padding: 'var(--spacing--3xs) 0' }"
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
								<N8nIcon v-if="group.icon" :icon="group.icon" :class="$style.icon" size="small" />
								<span>{{ i18n.baseText(group.name) }}</span>
							</div>
							<N8nIcon icon="chevron-right" color="text-light" size="xsmall" />
						</div>
					</template>
					<div>
						<N8nOption
							v-for="operator in group.children"
							:key="getOperatorId(operator)"
							:value="getOperatorId(operator)"
							:label="i18n.baseText(operator.name)"
						/>
					</div>
				</N8nPopover>
			</div>
		</div>
		<N8nOption
			v-else
			:key="selected"
			:value="selected"
			:label="i18n.baseText(selectedOperator.name)"
		/>
	</N8nSelect>
</template>

<style lang="scss" module>
.icon {
	color: var(--color--text--tint-1);
}

.groups {
	display: flex;
	flex-direction: column;
}

.group {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	justify-content: space-between;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
	color: var(--color--text--shade-1);
	padding: var(--spacing--2xs) var(--spacing--sm);
	cursor: pointer;

	&.suggested {
		font-weight: var(--font-weight--bold);
	}

	&:hover {
		background: var(--color--background);
	}
}

.groupTitle {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
}
</style>
