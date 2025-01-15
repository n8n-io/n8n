<script
	setup
	lang="ts"
	generic="Value, Item extends { name: string; tooltip: string; defaultValue: Value }"
>
import { computed } from 'vue';

defineSlots<{
	displayItem: (props: Item) => unknown;
}>();

type TagListProps = {
	inputs: Item[];
};

const props = withDefaults(defineProps<TagListProps>(), {
	inputs: () => [],
});

const selectedItems = defineModel<Record<string, Value>>({ required: true });
const inputMap = computed(() => Object.fromEntries(props.inputs.map((x) => [x.name, x] as const)));

const visibleTags = computed(() => {
	return props.inputs.filter((tag) => !selectedItems.value.hasOwnProperty(tag.name));
});

const sortedSelectedItems = computed(() => {
	return Object.keys(selectedItems.value)
		.map((name) => ({ name, item: inputMap.value[name] }))
		.toSorted((a, b) => (a[0] < b[0] ? -1 : 1));
});

function addToSelectedItems(name: string) {
	selectedItems.value[name] = inputMap.value[name].defaultValue;
}

function removeItem(name: string) {
	delete selectedItems.value[name];
}
</script>

<template>
	<div>
		<div :class="$style.tagContainer">
			<span
				v-for="item in visibleTags.toSorted((a, b) => (a.name < b.name ? -1 : 1))"
				:key="item.name"
				:class="$style.tagCell"
				@click="addToSelectedItems(item.name)"
			>
				+ Add a {{ item.name }}
			</span>
		</div>
		<div v-for="item in sortedSelectedItems" :key="item.name" :class="$style.slotComboContainer">
			<N8nIconButton
				type="tertiary"
				text
				:class="$style.slotRemoveIcon"
				size="mini"
				icon="trash"
				:data-test-id="`tag-listremove-field-button-${item.name}`"
				@click="removeItem(item.name)"
			/>
			<div :class="$style.slotContainer">
				<slot name="displayItem" v-bind="item.item">{ Empty TagList slot}</slot>
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

.slotRemoveIcon {
	// flex-shrink: 1;
}

.grid {
	display: grid;
	grid-row-gap: var(--spacing-s);
	grid-column-gap: var(--spacing-2xs);
}

.gridMulti {
	composes: grid;
	grid-template-columns: repeat(2, 1fr);
}

.tagContainer {
	width: 100%;
	flex-wrap: wrap;
	display: flex;
}
.tagCell {
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
