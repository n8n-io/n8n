<template>
	<ExpandableInputBase :model-value="modelValue" :placeholder="placeholder">
		<input
			ref="input"
			v-on-click-outside="onClickOutside"
			class="el-input__inner"
			:value="modelValue"
			:placeholder="placeholder"
			:maxlength="maxlength"
			size="4"
			@input="onInput"
			@keydown.enter="onEnter"
			@keydown.esc="onEscape"
		/>
	</ExpandableInputBase>
</template>

<script setup lang="ts">
import type { EventBus } from 'n8n-design-system';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ExpandableInputBase from './ExpandableInputBase.vue';

type Props = {
	modelValue: string;
	placeholder: string;
	maxlength?: number;
	autofocus?: boolean;
	eventBus?: EventBus;
};

const props = defineProps<Props>();
const emit = defineEmits<{
	(event: 'update:model-value', value: string): void;
	(event: 'enter', value: string): void;
	(event: 'blur', value: string): void;
	(event: 'esc'): void;
}>();

const input = ref<HTMLInputElement>();

onMounted(() => {
	// autofocus on input element is not reliable
	if (props.autofocus && input.value) {
		focus();
	}
	props.eventBus?.on('focus', focus);
});

onBeforeUnmount(() => {
	props.eventBus?.off('focus', focus);
});

function focus() {
	if (input.value) {
		input.value.focus();
	}
}

function onInput() {
	if (input.value) {
		emit('update:model-value', input.value.value);
	}
}

function onEnter() {
	if (input.value) {
		emit('enter', input.value.value);
	}
}

function onClickOutside(e: Event) {
	if (e.type === 'click' && input.value) {
		emit('blur', input.value.value);
	}
}

function onEscape() {
	emit('esc');
}
</script>
