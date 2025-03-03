<script setup lang="ts">
import type { EventBus } from '@n8n/utils/event-bus';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ExpandableInputBase from './ExpandableInputBase.vue';
import { onClickOutside } from '@vueuse/core';

type Props = {
	modelValue: string;
	placeholder: string;
	maxlength?: number;
	autofocus?: boolean;
	eventBus?: EventBus;
};

const props = defineProps<Props>();
const emit = defineEmits<{
	'update:model-value': [value: string];
	enter: [value: string];
	blur: [value: string];
	esc: [];
}>();

const inputRef = ref<HTMLInputElement>();

onMounted(() => {
	// autofocus on input element is not reliable
	if (props.autofocus && inputRef.value) {
		focus();
	}
	props.eventBus?.on('focus', focus);
});

onBeforeUnmount(() => {
	props.eventBus?.off('focus', focus);
});

function focus() {
	if (inputRef.value) {
		inputRef.value.focus();
	}
}

function onInput() {
	if (inputRef.value) {
		emit('update:model-value', inputRef.value.value);
	}
}

function onEnter() {
	if (inputRef.value) {
		emit('enter', inputRef.value.value);
	}
}

onClickOutside(inputRef, () => {
	if (inputRef.value) {
		emit('blur', inputRef.value.value);
	}
});

function onEscape() {
	emit('esc');
}
</script>

<template>
	<ExpandableInputBase :model-value="modelValue" :placeholder="placeholder">
		<input
			ref="inputRef"
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
