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
import N8nIcon from '../N8nIcon';
import { ref } from 'vue';
import N8nText from '../N8nText';

interface Item {
	name: string;
	id: string;
	value: string;
}

withDefaults(
	defineProps<{
		items: Array<Item>;
		placeholder?: string;
		multiple?: boolean;
	}>(),
	{
		placeholder: 'Select items...',
	},
);

defineEmits<{
	(e: 'update:modelValue', value: Array<Item>): void;
}>();

const open = ref(true);
const selectedItems = ref([]);
</script>

<template>
	<ComboboxRoot class="root" multiple v-model="selectedItems" :open="open" @update:open="() => {}">
		<ComboboxAnchor class="ComboboxAnchor">
			<ComboboxInput class="ComboboxInput" :placeholder="placeholder" />
		</ComboboxAnchor>
		<ComboboxContent class="ComboboxContent">
			<ComboboxViewport class="ComboboxViewport">
				<ComboboxEmpty class="ComboboxEmpty" />
				<template v-for="item in items" :key="item.id">
					<ComboboxItem :value="item" class="ComboboxItem">
						<ComboboxItemIndicator class="ComboboxItemIndicator">
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
