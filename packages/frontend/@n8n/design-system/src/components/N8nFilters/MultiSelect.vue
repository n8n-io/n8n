<script setup lang="ts">
import {
	ComboboxAnchor,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxItemIndicator,
	ComboboxRoot,
	ComboboxViewport,
} from 'reka-ui';
import { ref } from 'vue';

import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

interface Item {
	name: string;
	id: string;
	value: string;
}

const props = withDefaults(
	defineProps<{
		items: Item[];
		placeholder?: string;
		initialSelected?: Item[];
	}>(),
	{
		placeholder: 'Select items...',
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: Item[]];
}>();

const open = ref(true);

const selectedItems = ref<Item[]>(props.initialSelected || []);

function onChange(value: Item[]) {
	console.log('Selected items changed:', value);
	// Emit the updated value to the parent component
	// This will allow two-way binding with v-model
	// @ts-ignore
	emit('update:modelValue', value);
}
</script>

<template>
	<ComboboxRoot
		class="root"
		:open="open"
		@update:open="() => {}"
		v-model="selectedItems"
		multiple
		@update:model-value="onChange"
	>
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" :placeholder="placeholder" />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent">
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item" class="ComboboxItem">
						<ComboboxItemIndicator class="ComboboxItemIndicator">
							<N8nIcon color="foreground-dark" size="small" icon="check" />
						</ComboboxItemIndicator>
						<N8nText size="small">
							{{ item.name }}
						</N8nText>
					</ComboboxItem>
				</template>
			</ComboboxViewport>
		</ComboboxContent>
	</ComboboxRoot>
</template>

<style lang="scss" scoped>
@use 'Filters.scss';
</style>
