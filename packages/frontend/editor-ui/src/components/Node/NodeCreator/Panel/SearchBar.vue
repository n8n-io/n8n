<script setup lang="ts">
import { onMounted, reactive, toRefs, onBeforeUnmount } from 'vue';
import { useExternalHooks } from '@/composables/useExternalHooks';

export interface Props {
	placeholder?: string;
	modelValue?: string;
}

withDefaults(defineProps<Props>(), {
	placeholder: '',
	modelValue: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const state = reactive({
	inputRef: null as HTMLInputElement | null,
});

const externalHooks = useExternalHooks();

function focus() {
	state.inputRef?.focus();
}

function onInput(event: Event) {
	const input = event.target as HTMLInputElement;
	emit('update:modelValue', input.value.trim());
}

function clear() {
	emit('update:modelValue', '');
}

onMounted(() => {
	void externalHooks.run('nodeCreatorSearchBar.mount', { inputRef: state.inputRef });
	setTimeout(focus, 0);
});

onBeforeUnmount(() => {
	state.inputRef?.remove();
});

const { inputRef } = toRefs(state);
defineExpose({
	focus,
});
</script>

<template>
	<div :class="$style.searchContainer" data-test-id="search-bar">
		<div :class="{ [$style.prefix]: true, [$style.active]: modelValue.length > 0 }">
			<n8n-icon icon="search" size="small" />
		</div>
		<div :class="$style.text">
			<input
				ref="inputRef"
				:placeholder="placeholder"
				:value="modelValue"
				:class="$style.input"
				autofocus
				data-test-id="node-creator-search-bar"
				tabindex="0"
				@input="onInput"
			/>
		</div>
		<div v-if="modelValue.length > 0" :class="[$style.suffix, $style.clickable]" @click="clear">
			<n8n-icon size="small" icon="circle-x" />
		</div>
	</div>
</template>

<style lang="scss" module>
.searchContainer {
	display: flex;
	height: 40px;
	padding: 0 var(--spacing-xs);
	align-items: center;
	margin: var(--search-margin, var(--spacing-s));
	filter: drop-shadow(0 2px 5px rgba(46, 46, 50, 0.04));

	border: 1px solid $node-creator-border-color;
	background-color: $node-creator-search-background-color;
	color: $node-creator-search-placeholder-color;
	border-radius: 4px;

	&:focus-within {
		border-color: var(--color-secondary);
	}
}

.prefix {
	text-align: center;
	font-size: var(--font-size-m);
	margin-right: var(--spacing-xs);

	&.active {
		color: $color-primary !important;
	}
}

.text {
	flex-grow: 1;

	input {
		width: 100%;
		border: none;
		outline: none;
		font-size: var(--font-size-s);
		appearance: none;
		background-color: var(--color-background-xlight);
		color: var(--color-text-dark);

		&::placeholder,
		&::-webkit-input-placeholder {
			color: $node-creator-search-placeholder-color;
		}
	}
}

.suffix {
	min-width: 20px;
	text-align: right;
	display: inline-block;
}

.clear {
	background-color: transparent;
	padding: 0;
	border: none;
	cursor: pointer;

	svg path {
		fill: $node-creator-search-clear-background-color;
	}

	&:hover svg path {
		fill: $node-creator-search-clear-background-color-hover;
	}
}

.clickable {
	cursor: pointer;
}
</style>
