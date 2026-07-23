<script setup lang="ts">
import { onMounted, reactive, ref, toRefs, onBeforeUnmount, watch } from 'vue';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useDebounce } from '@/app/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';

import { N8nIcon } from '@n8n/design-system';
export interface Props {
	placeholder?: string;
	modelValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
	placeholder: '',
	modelValue: '',
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const state = reactive({
	inputRef: null as HTMLInputElement | null,
});

// Local copy so the field and clear button react instantly, while the search
// itself only runs once the user stops typing.
const searchValue = ref(props.modelValue);

const externalHooks = useExternalHooks();
const { debounce } = useDebounce();

const emitSearch = debounce((value: string) => emit('update:modelValue', value), {
	debounceTime: DEBOUNCE_TIME.INPUT.SEARCH,
	trailing: true,
});

watch(
	() => props.modelValue,
	(value) => {
		if (value !== searchValue.value.trim()) searchValue.value = value;
	},
);

function focus() {
	state.inputRef?.focus();
}

function onInput(event: Event) {
	searchValue.value = (event.target as HTMLInputElement).value.trim();
	emitSearch(searchValue.value);
}

function clear() {
	emitSearch.cancel();
	searchValue.value = '';
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
		<div :class="{ [$style.prefix]: true, [$style.active]: searchValue.length > 0 }">
			<N8nIcon icon="search" size="small" />
		</div>
		<div :class="$style.text">
			<input
				ref="inputRef"
				:placeholder="placeholder"
				:value="searchValue"
				:class="$style.input"
				autofocus
				data-test-id="node-creator-search-bar"
				tabindex="0"
				@input="onInput"
			/>
		</div>
		<div
			v-if="searchValue.length > 0"
			:class="[$style.suffix, $style.clickable]"
			data-test-id="node-creator-search-clear"
			@click="clear"
		>
			<N8nIcon size="small" icon="circle-x" />
		</div>
	</div>
</template>

<style lang="scss" module>
.searchContainer {
	display: flex;
	height: 40px;
	padding: 0 var(--spacing--xs);
	align-items: center;
	margin: var(--search--margin, var(--spacing--sm));
	filter: drop-shadow(0 2px 5px rgba(46, 46, 50, 0.04));

	border: 1px solid $node-creator-border-color;
	background-color: $node-creator-search-background-color;
	color: $node-creator-search-placeholder-color;
	border-radius: 4px;

	&:focus-within {
		border-color: var(--color--secondary);
	}
}

.prefix {
	text-align: center;
	font-size: var(--font-size--md);
	margin-right: var(--spacing--xs);

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
		font-size: var(--font-size--sm);
		appearance: none;
		background-color: var(--color--background--light-3);
		color: var(--color--text--shade-1);

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
