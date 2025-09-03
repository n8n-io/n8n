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
		modelValue?: Item[];
	}>(),
	{
		placeholder: 'Select items...',
		modelValue: () => [],
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: Item[]];
}>();

const open = ref(true);

function handleValueChange(value: Item) {
	const currentValues = props.modelValue || [];
	const isSelected = currentValues.some((item) => item.id === value.id);

	if (isSelected) {
		const newValues = currentValues.filter((item) => item.id !== value.id);
		emit('update:modelValue', newValues);
	} else {
		emit('update:modelValue', [...currentValues, value]);
	}
}

const selectedValues = ref<Item[]>(props.modelValue || []);
</script>

<template>
	<ComboboxRoot class="root" v-model="selectedValues" multiple :open="open" @update:open="() => {}">
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" :placeholder="placeholder" />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent">
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item" class="ComboboxItem" @click="handleValueChange(item)">
						<ComboboxItemIndicator
							class="ComboboxItemIndicator"
							:data-state="
								(modelValue || []).some((selected) => selected.id === item.id)
									? 'checked'
									: 'unchecked'
							"
						>
							<N8nIcon size="small" icon="check" />
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
