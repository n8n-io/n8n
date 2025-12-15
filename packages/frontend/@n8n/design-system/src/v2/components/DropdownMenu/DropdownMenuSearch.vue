<script setup lang="ts">
import { ref, useCssModule } from 'vue';

import Icon from '@n8n/design-system/components/N8nIcon/Icon.vue';

defineOptions({ name: 'N8nDropdownMenuSearch' });

withDefaults(
	defineProps<{
		modelValue?: string;
		placeholder?: string;
		showIcon?: boolean;
	}>(),
	{
		modelValue: '',
		placeholder: 'Search...',
		showIcon: true,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'key:escape': [];
	'key:navigate': [direction: 'up' | 'down'];
	'key:arrow-right': [];
	'key:arrow-left': [];
	'key:enter': [];
}>();

const $style = useCssModule();
const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: Event) => {
	const target = event.target as HTMLInputElement;
	emit('update:modelValue', target.value);
};

const handleKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		emit('key:escape');
	} else if (event.key === 'Tab' && !event.shiftKey) {
		event.preventDefault();
		emit('key:navigate', 'down');
	} else if (event.key === 'ArrowDown') {
		event.preventDefault();
		emit('key:navigate', 'down');
	} else if (event.key === 'ArrowUp') {
		event.preventDefault();
		emit('key:navigate', 'up');
	} else if (event.key === 'ArrowRight') {
		const input = event.target as HTMLInputElement;
		if (input.selectionStart === input.value.length) {
			emit('key:arrow-right');
		}
	} else if (event.key === 'ArrowLeft') {
		const input = event.target as HTMLInputElement;
		if (input.selectionStart === 0) {
			emit('key:arrow-left');
		}
	} else if (event.key === 'Enter') {
		event.preventDefault();
		emit('key:enter');
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
