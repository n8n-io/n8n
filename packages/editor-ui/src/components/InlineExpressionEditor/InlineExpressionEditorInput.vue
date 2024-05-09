<script setup lang="ts">
import { startCompletion } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { type EditorState, Prec, type SelectionRange } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch } from 'vue';

import { useExpressionEditor } from '@/composables/useExpressionEditor';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import { n8nAutocompletion, n8nLang } from '@/plugins/codemirror/n8nLang';
import { useNDVStore } from '@/stores/ndv.store';
import type { Segment } from '@/types/expressions';
import { removeExpressionPrefix } from '@/utils/expressions';
import { createEventBus, type EventBus } from 'n8n-design-system/utils';
import type { IDataObject } from 'n8n-workflow';
import { inputTheme } from './theme';

type Props = {
	modelValue: string;
	path: string;
	rows?: number;
	isReadOnly?: boolean;
	additionalData?: IDataObject;
	eventBus?: EventBus;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 5,
	isReadOnly: false,
	additionalData: () => ({}),
	eventBus: () => createEventBus(),
});

const emit = defineEmits<{
	(event: 'update:model-value', value: { value: string; segments: Segment[] }): void;
	(event: 'update:selection', value: { state: EditorState; selection: SelectionRange }): void;
	(event: 'focus'): void;
}>();

const ndvStore = useNDVStore();

const root = ref<HTMLElement>();
const extensions = computed(() => [
	Prec.highest(
		keymap.of([...tabKeyMap(true), ...enterKeyMap, ...autocompleteKeyMap, ...historyKeyMap]),
	),
	n8nLang(),
	n8nAutocompletion(),
	inputTheme({ rows: props.rows }),
	history(),
	expressionInputHandler(),
	EditorView.lineWrapping,
]);
const editorValue = ref<string>(removeExpressionPrefix(props.modelValue));
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
	isReadOnly: props.isReadOnly,
	autocompleteTelemetry: { enabled: true, parameterPath: props.path },
	additionalData: props.additionalData,
});

defineExpose({
	focus: () => {
		if (!hasFocus.value) {
			setCursorPosition('lastExpression');
			focus();
		}
	},
});

async function onDrop() {
	await nextTick();

	const editor = toValue(editorRef);
	if (!editor) return;

	focus();

	setCursorPosition('lastExpression');

	if (!ndvStore.isAutocompleteOnboarded) {
		setTimeout(() => {
			startCompletion(editor);
		});
	}
}

watch(
	() => props.modelValue,
	(newValue) => {
		editorValue.value = removeExpressionPrefix(newValue);
	},
);

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

onMounted(() => {
	props.eventBus.on('drop', onDrop);
});

onBeforeUnmount(() => {
	props.eventBus.off('drop', onDrop);
});
</script>

<template>
	<div ref="root" :class="$style.editor" data-test-id="inline-expression-editor-input"></div>
</template>

<style lang="scss" module>
.editor div[contenteditable='false'] {
	background-color: var(--disabled-fill, var(--color-background-light));
	cursor: not-allowed;
}
</style>

<style lang="scss" scoped>
:deep(.cm-editor) {
	padding-left: 0;
}
:deep(.cm-content) {
	padding-left: var(--spacing-2xs);
}
</style>
