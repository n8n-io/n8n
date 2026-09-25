<script setup lang="ts">
import { ref, useCssModule } from 'vue';

defineOptions({ name: 'N8nDropdownMenuSearch' });

withDefaults(
	defineProps<{
		modelValue?: string;
		placeholder?: string;
		ariaActiveDescendant?: string;
	}>(),
	{
		modelValue: '',
		placeholder: 'Search...',
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	keydown: [event: KeyboardEvent];
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
	emit('keydown', event);
};

const focus = (options?: FocusOptions) => {
	inputRef.value?.focus(options);
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
			:aria-activedescendant="ariaActiveDescendant"
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
	padding: 0 var(--spacing--3xs);
	height: var(--height--sm);

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}
</style>
