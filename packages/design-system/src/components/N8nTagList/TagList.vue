<script setup lang="ts" generic="Item extends { name: string }">
import { computed } from 'vue';

import N8nTagsSelector from '../N8nTagsSelector';

defineSlots<{
	// selector?: (props: Pick<Item, 'name'>) => unknown;
	displayItem: (props: Item) => unknown;
}>();

type TagListProps = {
	inputs?: Item[];
	columnView?: boolean;
	verticalSpacing?: '' | 'xs' | 's' | 'm' | 'l' | 'xl';
};

const props = withDefaults(defineProps<TagListProps>(), {
	inputs: () => [],
	columnView: false,
	verticalSpacing: '',
});

const emit = defineEmits<{
	itemDeclared: [name: string];
	itemUndeclared: [name: string];
}>();

const selectedItems = defineModel<string[]>({ required: true });
const selectableItems = computed(() =>
	props.inputs.filter((item) => !selectedItems.value.includes(item.name)),
);
const inputMap = computed(() => Object.fromEntries(props.inputs.map((x) => [x.name, x])));

function removeItem(name: string) {
	const index = selectedItems.value.indexOf(name);
	if (index !== -1) {
		selectedItems.value.splice(index, 1);
	}
}
</script>

<template>
	<div>
		<N8nTagsSelector v-model="selectedItems" :inputs="props.inputs.map((x) => x.name)" />
		<div v-for="name in selectedItems" :class="$style.slotComboContainer" :key="name">
			<N8nIconButton
				type="tertiary"
				text
				:class="$style.slotRemoveIcon"
				size="mini"
				icon="trash"
				:data-test-id="`tag-listremove-field-button-${name}`"
				@click="removeItem(name)"
			/>
			<div :class="$style.slotContainer">
				<slot name="displayItem" v-bind="inputMap[name]">{ Empty TagList slot}</slot>
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
</style>
