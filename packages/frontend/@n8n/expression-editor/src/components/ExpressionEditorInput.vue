<script setup lang="ts">
import { history } from '@codemirror/commands';
import { type EditorState, type Extension, type SelectionRange } from '@codemirror/state';
import { dropCursor, EditorView, tooltips } from '@codemirror/view';
import { onKeyStroke } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import { expressionCloseBrackets } from '../codemirror/expressionCloseBrackets';
import { n8nAutocompletion, n8nLang } from '../codemirror/n8nLang';
import { inputTheme } from '../codemirror/theme';
import { useExpressionEditor } from '../composables/useExpressionEditor';
import type { ExpressionCompletionSource, ExpressionResolver, Segment } from '../types';

type Props = {
	modelValue: string;
	resolver: ExpressionResolver;
	completionSources?: readonly ExpressionCompletionSource[];
	/** Appended after the built-in set; `Prec` decides who wins, not position. */
	extensions?: Extension[];
	/** Read once when the view is built and never reconfigured — facets, host compartments. */
	staticExtensions?: () => Extension[];
	rows?: number;
	isReadOnly?: boolean;
	dataTestId?: string;
	/**
	 * Where autocompletion parents its tooltip. Left unset it goes in the editor,
	 * where a scrolling ancestor can clip it and the host's tooltip styling —
	 * keyed on its own container — misses it.
	 */
	tooltipParent?: HTMLElement;
	onEditorBlur?: (view: EditorView) => void;
};

const props = withDefaults(defineProps<Props>(), {
	completionSources: () => [],
	extensions: () => [],
	staticExtensions: undefined,
	rows: 5,
	isReadOnly: false,
	dataTestId: 'inline-expression-editor-input',
	tooltipParent: undefined,
	onEditorBlur: undefined,
});

const emit = defineEmits<{
	'update:model-value': [value: { value: string; segments: Segment[] }];
	'update:selection': [value: { state: EditorState; selection: SelectionRange }];
	focus: [];
}>();

const root = ref<HTMLElement>();
const extensions = computed(() => [
	n8nLang(props.completionSources),
	n8nAutocompletion(),
	inputTheme({ isReadOnly: props.isReadOnly, rows: props.rows }),
	history(),
	dropCursor(),
	expressionCloseBrackets(),
	EditorView.lineWrapping,
	...(props.tooltipParent ? [tooltips({ parent: props.tooltipParent })] : []),
	...props.extensions,
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
	staticExtensions: () => props.staticExtensions?.() ?? [],
	resolver: props.resolver,
	disableSearchDialog: true,
	isReadOnly: computed(() => props.isReadOnly),
	initialCursorPosition: 'lastExpression',
	onBlur: props.onEditorBlur,
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
	segments,
	setCursorPosition,
	focus: () => {
		if (!hasFocus.value) {
			focus();
			requestAnimationFrame(() => {
				setCursorPosition('lastExpression');
			});
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
	<div ref="root" title="" :data-test-id="dataTestId"></div>
</template>

<style lang="scss" scoped>
:deep(.cm-editor) {
	padding-left: 0;
}
:deep(.cm-content) {
	padding-left: var(--spacing--2xs);

	&[aria-readonly='true'] {
		background-color: var(--input--color--background--disabled, var(--color--background--light-2));
		border-color: var(--input--border-color--disabled, var(--border-color));
		color: var(--input--color--disabled, var(--color--text));
		cursor: not-allowed;

		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}
}
</style>
