<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, useCssModule } from 'vue';
import { OPERATOR_GROUPS } from './constants';
import type { FilterOperator } from './types';
import { getFilterOperator } from './utils';
import type { FilterOperatorType } from 'n8n-workflow';
import { Primitive } from 'reka-ui';

import { N8nIcon } from '@n8n/design-system';
import {
	N8nDropdownMenu,
	type DropdownMenuItemProps,
} from '@n8n/design-system/v2/components/DropdownMenu';

interface Props {
	selected: string;
	suggestedType?: FilterOperatorType;
	readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), { readOnly: false, suggestedType: 'any' });

const emit = defineEmits<{
	operatorChange: [value: string];
}>();

const i18n = useI18n();
const $style = useCssModule();

const groups = OPERATOR_GROUPS;

const selectedGroupIcon = computed(
	() => groups.find((group) => group.id === props.selected.split(':')[0])?.icon,
);

const selectedOperator = computed(() => getFilterOperator(props.selected));

const selectedType = computed(() => selectedOperator.value.type);

const getOperatorId = (operator: FilterOperator): string =>
	`${operator.type}:${operator.operation}`;

const menuItems = computed<Array<DropdownMenuItemProps<string>>>(() => {
	return groups.map((group) => {
		const isSuggested = group.id === props.suggestedType;
		const isSelected = group.id === selectedType.value;
		const classes = [];

		if (isSuggested) classes.push($style.suggested);
		if (isSelected) classes.push($style.selected);

		return {
			id: group.id,
			label: i18n.baseText(group.name),
			icon: group.icon ? { type: 'icon' as const, value: group.icon } : undefined,
			class: classes,
			children: group.children.map((operator) => {
				const operatorId = getOperatorId(operator);
				const isOperatorSelected = operatorId === props.selected;
				return {
					id: operatorId,
					label: i18n.baseText(operator.name),
					checked: isOperatorSelected,
					class: isOperatorSelected ? $style.selected : '',
				};
			}),
		};
	});
});

const onSelect = (operatorId: string): void => {
	// Only emit if it's an actual operator (contains colon), not a group
	if (operatorId.includes(':')) {
		emit('operatorChange', operatorId);
	}
};
</script>

<template>
	<div :class="$style.wrapper" data-test-id="filter-operator-select">
		<N8nDropdownMenu
			:items="menuItems"
			:disabled="readOnly"
			placement="bottom-start"
			:extra-popper-class="$style.dropdownContent"
			@select="onSelect"
		>
			<template #trigger>
				<Primitive as="button" type="button" :class="$style.trigger" :disabled="readOnly">
					<N8nIcon
						v-if="selectedGroupIcon"
						:class="$style.icon"
						:icon="selectedGroupIcon"
						color="text-light"
						size="small"
					/>
					<span :class="$style.label">{{ i18n.baseText(selectedOperator.name) }}</span>
					<N8nIcon :class="$style.chevron" icon="chevron-down" color="text-light" size="small" />
				</Primitive>
			</template>
		</N8nDropdownMenu>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 100%;
	height: 100%;
}

.trigger {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 100%;
	height: 100%;
	min-height: 30px;
	padding: 0 var(--spacing--2xs);
	border: var(--border-width) var(--border-style) var(--input--border-color, var(--border-color));
	border-top-left-radius: var(--input--radius--top-left, var(--input--radius, 0));
	border-bottom-left-radius: var(--input--radius--bottom-left, var(--input--radius, 0));
	border-top-right-radius: var(--input-triple--radius--top-right, var(--input--radius, 0));
	border-bottom-right-radius: var(--input-triple--radius--bottom-right, var(--input--radius, 0));
	background-color: var(--color--background--light-2);
	color: var(--color--text);
	font-size: var(--font-size--2xs);
	font-family: var(--font-family);
	line-height: var(--line-height--md);
	cursor: pointer;
	white-space: nowrap;
	text-align: left;

	&:hover:not(:disabled) {
		background-color: var(--color--background--light-1);
	}

	&:focus {
		outline: none;
		border-color: var(--color--secondary);
	}

	&:disabled {
		cursor: not-allowed;
		background-color: var(--color--background--light-3);
		color: var(--color--text--tint-1);
	}
}

.icon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.label {
	flex-grow: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	font-weight: var(--font-weight--regular);
}

.chevron {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
	margin-left: auto;
}

.dropdownContent {
	z-index: var(--ndv--z);
}

.suggested span {
	font-weight: var(--font-weight--bold);
}

.selected span {
	color: var(--color--primary);
	font-weight: var(--font-weight--bold);
}
</style>
