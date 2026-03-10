<script setup lang="ts">
import { ref, useCssModule } from 'vue';

defineOptions({ name: 'N8nDropdownMenuSearch' });

withDefaults(
	defineProps<{
		modelValue?: string;
		placeholder?: string;
	}>(),
	{
		modelValue: '',
		placeholder: 'Search...',
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

const slots = defineSlots<{
	/** Icon or content before the search input (default: search icon) */
	'search-prefix'?: () => void;
	/** Icon or content after the search input */
	'search-suffix'?: () => void;
}>();

const $style = useCssModule();
const inputRef = ref<HTMLInputElement | null>(null);

const handleInput = (event: Event) => {
	if (event.target instanceof HTMLInputElement) {
		emit('update:modelValue', event.target.value);
	}
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
		if (
			event.target instanceof HTMLInputElement &&
			event.target.selectionStart === event.target.value.length
		) {
			emit('key:arrow-right');
		}
	} else if (event.key === 'ArrowLeft') {
		if (event.target instanceof HTMLInputElement && event.target.selectionStart === 0) {
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
		<span v-if="slots['search-prefix']" :class="$style['search-prefix']">
			<slot name="search-prefix" />
		</span>
		<input
			ref="inputRef"
			type="text"
			:class="$style['search-input']"
			:placeholder="placeholder"
			:value="modelValue"
			@input="handleInput"
			@keydown.stop="handleKeydown"
		/>
		<span v-if="slots['search-suffix']" :class="$style['search-suffix']">
			<slot name="search-suffix" />
		</span>
	</div>
</template>

<style module>
.search-container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-bottom: var(--border);
}

.search-prefix {
	display: flex;
	align-items: center;
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.search-suffix {
	display: flex;
	align-items: center;
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
