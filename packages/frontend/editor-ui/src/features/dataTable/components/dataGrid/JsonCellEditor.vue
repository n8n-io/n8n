<script setup lang="ts">
import { ref } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import JsonEditor from '@/features/editors/components/JsonEditor/JsonEditor.vue';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const editorRef = ref<InstanceType<typeof JsonEditor>>();
const valueRef = ref(String(props.params.value ?? ''));
const isCancelledRef = ref(false);

const getValue = (): string => {
	return valueRef.value;
};

const isPopup = () => true;

function afterGuiAttached() {
	requestAnimationFrame(() => {
		editorRef.value?.focus();
	});
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		isCancelledRef.value = true;
		props.params.api.stopEditing(true);
	}
}

function isCancelAfterEnd() {
	return isCancelledRef.value;
}

defineExpose({
	getValue,
	isPopup,
	afterGuiAttached,
	isCancelAfterEnd,
});
</script>

<template>
	<div class="grid-cell-json-editor" @keydown.stop="onKeydown" @mousedown.stop>
		<JsonEditor ref="editorRef" v-model="valueRef" :fill-parent="true" :rows="10" />
	</div>
</template>

<style lang="scss">
.grid-cell-json-editor {
	min-width: 420px;
	min-height: 185px;
	max-width: 1024px;
	max-height: 80vh;
	overflow: auto;
	resize: both;
	border-radius: var(--radius);
	font-size: var(--font-size--md);

	&:where(:focus-within, :active) {
		box-shadow: none;
		border: var(--grid-cell-editing-border);
	}
}
</style>
