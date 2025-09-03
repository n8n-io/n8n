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

withDefaults(
	defineProps<{
		items: Item[];
		placeholder?: string;
		modelValue?: Item | null;
	}>(),
	{
		placeholder: 'Select item...',
		modelValue: null,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: Item | null];
}>();

const open = ref(true);

function handleValueChange(value: Item | null) {
	emit('update:modelValue', value);
}
</script>

<template>
	<ComboboxRoot
		class="root"
		:model-value="modelValue"
		:open="open"
		@update:open="() => {}"
		@update:model-value="handleValueChange"
	>
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" :placeholder="placeholder" />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent">
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item" class="ComboboxItem">
						<ComboboxItemIndicator
							class="ComboboxItemIndicator"
							:data-state="modelValue?.id === item.id ? 'checked' : 'unchecked'"
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
