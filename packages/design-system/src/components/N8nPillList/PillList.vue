<script
	setup
	lang="ts"
	generic="Value, Item extends { name: string; defaultValue: Value; tooltip?: string }"
>
import { computed } from 'vue';

defineSlots<{
	displayItem: (props: Item) => unknown;
}>();

type PillListProps = {
	inputs: Item[];
};

const props = withDefaults(defineProps<PillListProps>(), {
	inputs: () => [],
});

// Record<inputs[k].name, currentValue>
const selectedItems = defineModel<Record<string, Value>>({ required: true });
const inputMap = computed(() => Object.fromEntries(props.inputs.map((x) => [x.name, x] as const)));

const visiblePills = computed(() => {
	return props.inputs.filter((pill) => !selectedItems.value.hasOwnProperty(pill.name));
});

const sortedSelectedItems = computed(() => {
	return [...Object.keys(selectedItems.value).map((name) => inputMap.value[name])].sort((a, b) =>
		a.name[0] < b.name[0] ? -1 : 1,
	);
});

function addToSelectedItems(name: string) {
	selectedItems.value[name] = inputMap.value[name].defaultValue;
}

function removeFromSelectedItems(name: string) {
	delete selectedItems.value[name];
}
</script>

<template>
	<div>
		<div :class="$style.pillContainer">
			<span
				v-for="item in [...visiblePills].sort((a, b) => (a.name < b.name ? -1 : 1))"
				:key="item.name"
				:class="$style.pillCell"
				:data-test-id="`pill-list-pill-${item.name}`"
				@click="addToSelectedItems(item.name)"
			>
				+ Add a {{ item.name }}
			</span>
		</div>
		<div
			v-for="item in sortedSelectedItems"
			:key="item.name"
			:class="$style.slotComboContainer"
			:data-test-id="`pill-list-slot-${item.name}`"
		>
			<N8nIconButton
				type="tertiary"
				text
				:class="$style.slotRemoveIcon"
				size="mini"
				icon="trash"
				:data-test-id="`pill-list-remove-slot-${item.name}`"
				@click="removeFromSelectedItems(item.name)"
			/>
			<div :class="$style.slotContainer">
				<slot name="displayItem" v-bind="item"
					>Empty slot with v-bind: {{ JSON.stringify(item) }}</slot
				>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.slotComboContainer {
	display: flex;
	flex-direction: row;
	flex-grow: 1;
	margin-top: var(--spacing-2xs);
}

.slotContainer {
	flex-grow: 1;
}

.pillContainer {
	width: 100%;
	flex-wrap: wrap;
	display: flex;
}
.pillCell {
	display: flex;
	margin: var(--spacing-4xs) var(--spacing-3xs) 0 0;

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
</style>
