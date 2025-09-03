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
/* reset */
button,
input {
	all: unset;
}

.ComboboxAnchor {
	display: inline-flex;
	align-items: center;
	justify-content: between;
	line-height: 1;
	font-size: var(--font-size-xs);
	padding: var(--spacing-2xs) var(--spacing-xs);
	width: 200px;
	border-bottom: var(--border-base);
	background-color: var(--color-foreground-xlight);
	border-radius: var(--border-radius-base) var(--border-radius-base) 0 0;
}

.ComboboxContent {
	z-index: 10;
	padding: var(--spacing-4xs);
	max-width: 200px;
	background-color: var(--color-foreground-xlight);
	border-radius: 0 0 var(--border-radius-base) var(--border-radius-base);
}

.ComboboxEmpty {
	padding-top: 0.5rem;
	padding-bottom: 0.5rem;
	text-align: center;
	font-size: 0.75rem;
	line-height: 1rem;
	font-weight: 500;
}

.ComboboxItem {
	display: flex;
	align-items: center;
	padding: var(--spacing-2xs);
	padding-left: var(--spacing-xl);
	border-radius: var(--border-radius-base);
	position: relative;
}

.ComboboxItem[data-disabled] {
	pointer-events: none;
}

.ComboboxItem[data-highlighted] {
	background-color: var(--color-foreground-light);
}

.ComboboxItemIndicator {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	position: absolute;
	left: var(--spacing-2xs);
	outline: 1px solid gray;
}
</style>
