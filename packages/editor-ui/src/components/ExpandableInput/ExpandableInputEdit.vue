<template>
	<ExpandableInputBase :model-value="modelValue" :placeholder="placeholder">
		<input
			ref="inputRef"
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

function onClickOutside(e: Event) {
	if (e.type === 'click' && inputRef.value) {
		emit('blur', inputRef.value.value);
	}
}

function onEscape() {
	emit('esc');
}
</script>
