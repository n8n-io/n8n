<template>
	<div ref="root" :class="$style.editor" @keydown.stop></div>
</template>

<script setup lang="ts">
import { history } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { computed, onMounted, ref, toValue, watch } from 'vue';

import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { n8nAutocompletion, n8nLang } from '@/plugins/codemirror/n8nLang';
import { forceParse } from '@/utils/forceParse';
import { completionStatus } from '@codemirror/autocomplete';
import { inputTheme } from './theme';

import type { IVariableItemSelected } from '@/Interface';
import { useExpressionEditor } from '@/composables/useExpressionEditor';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import type { Segment } from '@/types/expressions';
import { removeExpressionPrefix } from '@/utils/expressions';
import { infoBoxTooltips } from '@/plugins/codemirror/tooltips/InfoBoxTooltip';

type Props = {
	modelValue: string;
	path: string;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
});

const emit = defineEmits<{
	(event: 'change', value: { value: string; segments: Segment[] }): void;
	(event: 'focus'): void;
	(event: 'close'): void;
}>();

const root = ref<HTMLElement>();
const extensions = computed(() => [
	inputTheme(),
	Prec.highest(
		keymap.of([
			...tabKeyMap(),
			...historyKeyMap,
			...enterKeyMap,
			...autocompleteKeyMap,
			{
				any: (view, event) => {
					if (event.key === 'Escape' && completionStatus(view.state) === null) {
						event.stopPropagation();
						emit('close');
					}

					return false;
				},
			},
		]),
	),
	n8nLang(),
	n8nAutocompletion(),
	history(),
	expressionInputHandler(),
	EditorView.lineWrapping,
	EditorView.domEventHandlers({ scroll: forceParse }),
	infoBoxTooltips(),
]);
const editorValue = ref<string>(removeExpressionPrefix(props.modelValue));
const {
	editor: editorRef,
	segments,
	readEditorValue,
	setCursorPosition,
	hasFocus,
	focus,
} = useExpressionEditor({
	editorRef: root,
	editorValue,
	extensions,
	isReadOnly: props.isReadOnly,
	autocompleteTelemetry: { enabled: true, parameterPath: props.path },
});

watch(
	() => props.modelValue,
	(newValue) => {
		editorValue.value = removeExpressionPrefix(newValue);
	},
);

watch(segments.display, (newSegments) => {
	emit('change', {
		value: '=' + readEditorValue(),
		segments: newSegments,
	});
});

watch(hasFocus, (focused) => {
	if (focused) {
		emit('focus');
	}
});

onMounted(() => {
	focus();
});

function itemSelected({ variable }: IVariableItemSelected) {
	const editor = toValue(editorRef);

	if (!editor || props.isReadOnly) return;

	const OPEN_MARKER = '{{';
	const CLOSE_MARKER = '}}';

	const { selection, doc } = editor.state;
	const { head } = selection.main;

	const isInsideResolvable =
		editor.state.sliceDoc(0, head).includes(OPEN_MARKER) &&
		editor.state.sliceDoc(head, doc.length).includes(CLOSE_MARKER);

	const insert = isInsideResolvable ? variable : [OPEN_MARKER, variable, CLOSE_MARKER].join(' ');

	editor.dispatch({
		changes: {
			from: head,
			insert,
		},
	});

	focus();
	setCursorPosition(head + insert.length);
}

defineExpose({ itemSelected });
</script>

<style lang="scss" module>
.editor div[contenteditable='false'] {
	background-color: var(--disabled-fill, var(--color-background-light));
	cursor: not-allowed;
}
</style>
<style lang="scss" scoped>
:deep(.cm-content) {
	border-radius: var(--border-radius-base);
}
</style>
