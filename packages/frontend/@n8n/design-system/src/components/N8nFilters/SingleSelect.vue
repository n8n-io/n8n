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
		initialItem?: Item;
	}>(),
	{
		placeholder: 'Select item...',
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: Item | null];
}>();

const open = ref(true);

const selectedItem = ref<Item | null>(props.initialItem || null);

function onChange(value: Item | null) {
	emit('update:modelValue', value);
}
</script>

<template>
	<ComboboxRoot
		class="root"
		v-model="selectedItem"
		:open="open"
		@update:open="() => {}"
		@update:model-value="onChange"
	>
		<ComboboxAnchor class="filterDropdownAnchor">
			<ComboboxInput :placeholder="placeholder" />
		</ComboboxAnchor>
		<ComboboxContent class="filterDropdownContent">
			<ComboboxViewport>
				<ComboboxEmpty class="filterDropdownEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item" class="filterDropdownItem select">
						<ComboboxItemIndicator as-child class="filterDropdownItemIndicator">
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
