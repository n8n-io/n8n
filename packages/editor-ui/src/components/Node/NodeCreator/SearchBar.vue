<template>
	<div :class="$style.searchContainer">
		<div :class="{ [$style.prefix]: true, [$style.active]: value.length > 0 }">
			<font-awesome-icon icon="search" size="sm" />
		</div>
		<div :class="$style.text">
			<input
				:placeholder="placeholder"
				ref="input"
				:value="value"
				@input="onInput"
				:class="$style.input"
			/>
		</div>
		<div :class="$style.suffix" v-if="value.length > 0" @click="clear">
			<button :class="[$style.clear, $style.clickable]">
				<font-awesome-icon icon="times-circle" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import Vue, { onMounted, onUnmounted, reactive, toRefs } from 'vue';

import { externalHooks } from '@/components/mixins/externalHooks';

export interface Props {
	placeholder: string;
	value: string;
	eventBus?: Vue;
}

const props = withDefaults(defineProps<Props>(), {
	placeholder: '',
	value: '',
});

const emit = defineEmits<{
	(event: 'input', value: string): void,
}>();

const { $externalHooks } = new externalHooks();

const state = reactive({
	input: null as HTMLInputElement | null,
});

function focus() {
	state.input?.focus();
}

function onInput(event: Event) {
	const input = event.target as HTMLInputElement;
	emit("input", input.value);
}

function clear() {
	emit("input", "");
}

onMounted(() => {
	props.eventBus?.$on("focus", focus);
	setTimeout(focus, 0);

	$externalHooks().run('nodeCreator_searchBar.mount', { inputRef: state.input });
});

onUnmounted(() => {
	props.eventBus?.$off("focus", focus);
});

const { input } = toRefs(state);
</script>

<style lang="scss" module>
.searchContainer {
	display: flex;
	height: 40px;
	padding: var(--spacing-s) var(--spacing-xs);
	align-items: center;
	margin: var(--search-margin, var(--spacing-s));
	filter: drop-shadow(0px 2px 5px rgba(46, 46, 50, 0.04));

	border: 1px solid $node-creator-border-color;
	background-color: $node-creator-search-background-color;
	color: $node-creator-search-placeholder-color;
	border-radius: 4px;

	&:focus-within {
		border-color: var(--color-secondary)
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
	background-color: $node-creator-search-clear-color;
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
</style>
