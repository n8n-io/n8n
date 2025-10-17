<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { ICellEditorParams } from 'ag-grid-community';
import JsonEditor from '@/features/editors/components/JsonEditor/JsonEditor.vue';
import { jsonParse } from 'n8n-workflow';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	params: ICellEditorParams;
}>();

const editorRef = ref<InstanceType<typeof JsonEditor>>();
const valueRef = ref(props.params.value ? JSON.stringify(props.params.value, null, 2) : '');
const isCancelledRef = ref(false);
const toast = useToast();
const i18n = useI18n();

const getValue = (): Record<string, unknown> | null => {
	if (!valueRef.value) {
		return null;
	}
	try {
		const parsed = jsonParse(valueRef.value);
		if (Array.isArray(parsed)) {
			throw new Error(i18n.baseText('dataTable.error.arrayValuesNotAllowed'));
		}
		return parsed as Record<string, unknown>;
	} catch (e) {
		toast.showError(e, i18n.baseText('generic.invalidJsonSaveFailed'));
		return props.params.value;
	}
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

const stopFocusOut = (e: FocusEvent) => {
	// focus out is triggered when the cm editor is focused in and if we don't stop it it closes the cell editor
	if (e.target instanceof Element && e.target.classList.contains('ag-cell-focus')) {
		e.stopImmediatePropagation();
	}
};

onMounted(() => {
	document.addEventListener('focusout', stopFocusOut, true);
});

onBeforeUnmount(() => {
	document.removeEventListener('focusout', stopFocusOut, true);
});

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
