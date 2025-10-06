<script setup lang="ts">
import { history } from '@codemirror/commands';
import { type EditorState, Prec, type SelectionRange } from '@codemirror/state';
import { dropCursor, EditorView, keymap } from '@codemirror/view';
import { computed, ref, watch } from 'vue';

import { useExpressionEditor } from '@/composables/useExpressionEditor';
import { mappingDropCursor } from '@/plugins/codemirror/dragAndDrop';
import { editorKeymap } from '@/plugins/codemirror/keymap';
import { n8nAutocompletion, n8nLang } from '@/plugins/codemirror/n8nLang';
import { infoBoxTooltips } from '@/plugins/codemirror/tooltips/InfoBoxTooltip';
import type { Segment } from '@/types/expressions';
import type { IDataObject } from 'n8n-workflow';
import { inputTheme } from './theme';
import { onKeyStroke } from '@vueuse/core';
import { expressionCloseBrackets } from '@/plugins/codemirror/expressionCloseBrackets';

type Props = {
	modelValue: string;
	path: string;
	rows?: number;
	isReadOnly?: boolean;
	additionalData?: IDataObject;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	isReadOnly: false,
	additionalData: () => ({}),
});

const emit = defineEmits<{
	'update:model-value': [value: { value: string; segments: Segment[] }];
	'update:selection': [value: { state: EditorState; selection: SelectionRange }];
	focus: [];
}>();

const root = ref<HTMLElement>();
const extensions = computed(() => [
	Prec.highest(keymap.of(editorKeymap)),
	n8nLang(),
	n8nAutocompletion(),
	inputTheme({ isReadOnly: props.isReadOnly, rows: props.rows }),
	history(),
	mappingDropCursor(),
	dropCursor(),
	expressionCloseBrackets(),
	EditorView.lineWrapping,
	infoBoxTooltips(),
]);
const editorValue = computed(() => props.modelValue);

// Exit expression editor when pressing Backspace in empty field
onKeyStroke(
	'Backspace',
	() => {
		if (props.modelValue === '') emit('update:model-value', { value: '', segments: [] });
	},
	{ target: root },
);

const {
	editor: editorRef,
	segments,
	selection,
	readEditorValue,
	setCursorPosition,
	hasFocus,
	focus,
} = useExpressionEditor({
	editorRef: root,
	editorValue,
	extensions,
	disableSearchDialog: true,
	isReadOnly: computed(() => props.isReadOnly),
	autocompleteTelemetry: { enabled: true, parameterPath: props.path },
	additionalData: props.additionalData,
});

watch(segments.display, (newSegments) => {
	emit('update:model-value', {
		value: '=' + readEditorValue(),
		segments: newSegments,
	});
});

watch(selection, (newSelection: SelectionRange) => {
	if (editorRef.value) {
		emit('update:selection', {
			state: editorRef.value.state,
			selection: newSelection,
		});
	}
});

watch(hasFocus, (focused) => {
	if (focused) emit('focus');
});

defineExpose({
	editor: editorRef,
	setCursorPosition,
	focus: () => {
		if (!hasFocus.value) {
			setCursorPosition('lastExpression');
			focus();
		}
	},
	selectAll: () => {
		editorRef.value?.dispatch({
			selection: selection.value.extend(0, editorRef.value?.state.doc.length),
		});
	},
});
</script>

<template>
	<div ref="root" title="" data-test-id="inline-expression-editor-input"></div>
</template>

<style lang="scss" scoped>
:deep(.cm-editor) {
	padding-left: 0;
}
:deep(.cm-content) {
	padding-left: var(--spacing-2xs);

	&[aria-readonly='true'] {
		background-color: var(--disabled-fill, var(--color-background-light));
		border-color: var(--disabled-border, var(--border-color-base));
		color: var(--disabled-color, var(--color-text-base));
		cursor: not-allowed;

		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}
}
</style>
