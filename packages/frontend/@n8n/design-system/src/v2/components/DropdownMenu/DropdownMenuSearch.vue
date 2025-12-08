<script setup lang="ts">
import { ref, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

defineOptions({ name: 'N8nDropdownMenuSearch' });

withDefaults(
	defineProps<{
		/** Current search value */
		modelValue?: string;
		/** Placeholder text for the search input */
		placeholder?: string;
		/** Whether to show the search icon */
		showIcon?: boolean;
	}>(),
	{
		modelValue: '',
		placeholder: 'Search...',
		showIcon: true,
	},
);

const emit = defineEmits<{
	/** Emitted when search input value changes */
	'update:modelValue': [value: string];
	/** Emitted when user presses Escape */
	escape: [];
	/** Emitted when user wants to focus the first menu item (Tab or ArrowDown at end) */
	focusFirstItem: [];
}>();

const $style = useCssModule();
const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	emit('update:modelValue', target.value);
};

const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		emit('escape');
	} else if (event.key === 'Tab' && !event.shiftKey) {
		// Move focus to the first menu item
		event.preventDefault();
		emit('focusFirstItem');
	} else if (event.key === 'ArrowDown') {
		// Move focus to first menu item only if cursor is at the end of input
		const input = event.target as HTMLInputElement;
		const isAtEnd = input.selectionStart === input.value.length;
		if (isAtEnd) {
			event.preventDefault();
			emit('focusFirstItem');
		}
	}
};

const focus = () => {
	inputRef.value?.focus();
};

defineExpose({ focus, inputRef });
</script>

<template>
	<div :class="$style['search-container']">
		<Icon
			v-if="showIcon"
			:class="$style['search-icon']"
			icon="search"
			size="large"
			color="text-light"
		/>
		<input
			ref="inputRef"
			type="text"
			:class="$style['search-input']"
			:placeholder="placeholder"
			:value="modelValue"
			@input="handleInput"
			@keydown.stop="handleKeydown"
		/>
	</div>
</template>

<style module>
.search-container {
	display: flex;
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
	margin-bottom: var(--spacing--4xs);
	gap: var(--spacing--3xs);
}

.search-icon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.search-input {
	flex: 1;
	min-width: 0;
	border: none;
	background: transparent;
	outline: none;
	font-family: inherit;
	font-size: var(--font-size--sm);
	color: var(--color--text--base);
	padding: var(--spacing--4xs) 0;

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}
</style>
