<script setup lang="ts" generic="Value, Item extends { name: string; initialValue: Value }">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

defineSlots<{
	// This slot is used to display a selectable item
	addItem: (props: Item) => unknown;
	// This slot is used to display a selected item
	displayItem: (props: Item) => unknown;
}>();

type SelectableListProps = {
	inputs: Item[];
	disabled?: boolean;
};

const props = withDefaults(defineProps<SelectableListProps>(), {
	inputs: () => [],
	disabled: false,
});

// Record<inputs[k].name, initialValue>
// Note that only the keys will stay up to date to reflect selected keys
// Whereas the values will not automatically update if the related slot value is updated
const selectedItems = defineModel<Record<string, Value>>({ required: true });

const inputMap = computed(() => Object.fromEntries(props.inputs.map((x) => [x.name, x] as const)));

const visibleSelectables = computed(() => {
	return props.inputs
		.filter((selectable) => !selectedItems.value.hasOwnProperty(selectable.name))
		.sort(itemComparator);
});

const sortedSelectedItems = computed(() => {
	return Object.entries(selectedItems.value)
		.map(([name, initialValue]) => ({
			...inputMap.value[name],
			initialValue,
		}))
		.sort(itemComparator);
});

function addToSelectedItems(name: string) {
	selectedItems.value[name] = inputMap.value[name].initialValue;
}

function removeFromSelectedItems(name: string) {
	delete selectedItems.value[name];
}

function itemComparator(a: Item, b: Item) {
	return a.name.localeCompare(b.name);
}
</script>

<template>
	<div>
		<div :class="$style.selectableContainer">
			<span
				v-for="item in visibleSelectables"
				:key="item.name"
				:class="$style.selectableCell"
				:data-test-id="`selectable-list-selectable-${item.name}`"
				@click="!props.disabled && addToSelectedItems(item.name)"
			>
				<slot name="addItem" v-bind="item"
					>{{ t('selectableList.addDefault') }} {{ item.name }}</slot
				>
			</span>
		</div>
		<div
			v-for="item in sortedSelectedItems"
			:key="item.name"
			:class="$style.slotComboContainer"
			:data-test-id="`selectable-list-slot-${item.name}`"
		>
			<N8nIcon
				:class="$style.slotRemoveIcon"
				size="xsmall"
				:icon="disabled ? 'none' : 'trash'"
				:data-test-id="`selectable-list-remove-slot-${item.name}`"
				@click="!disabled && removeFromSelectedItems(item.name)"
			/>
			<div :class="$style.slotContainer">
				<slot name="displayItem" v-bind="item" />
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.slotComboContainer {
	display: flex;
	flex-direction: row;
	flex-grow: 1;
	gap: var(--spacing-2xs);
}

.slotContainer {
	flex-grow: 1;
}

.selectableContainer {
	width: 100%;
	flex-wrap: wrap;
	display: flex;
}
.selectableCell {
	display: flex;
	margin-right: var(--spacing-3xs);

	min-width: max-content;
	border-radius: var(--border-radius-base);
	font-size: small;
	background-color: var(--color-ndv-background);
	color: var(--text-color-dark);

	cursor: pointer;

	:hover {
		color: var(--color-primary);
	}
}

.slotRemoveIcon {
	color: var(--color-text-light);
	height: 10px;
	width: 10px;
	margin-top: 3px;

	:hover {
		cursor: pointer;
	}
}
</style>
