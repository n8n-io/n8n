<script setup lang="ts">
import { history } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { dropCursor, EditorView, keymap } from '@codemirror/view';
import { computed, onMounted, ref, watch } from 'vue';

import { n8nAutocompletion, n8nLang } from '@/features/editors/plugins/codemirror/n8nLang';
import { forceParse } from '@/utils/forceParse';
import { inputTheme } from './theme';

import { useExpressionEditor } from '@/features/editors/composables/useExpressionEditor';
import { infoBoxTooltips } from '@/features/editors/plugins/codemirror/tooltips/InfoBoxTooltip';
import type { Segment } from '@/types/expressions';
import { removeExpressionPrefix } from '@/utils/expressions';
import { mappingDropCursor } from '@/features/editors/plugins/codemirror/dragAndDrop';
import { editorKeymap } from '@/features/editors/plugins/codemirror/keymap';
import { expressionCloseBrackets } from '@/features/editors/plugins/codemirror/expressionCloseBrackets';
import type { TargetNodeParameterContext } from '@/Interface';

type Props = {
	modelValue: string;
	path: string;
	targetNodeParameterContext?: TargetNodeParameterContext;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	isReadOnly: false,
	targetNodeParameterContext: undefined,
});

const emit = defineEmits<{
	change: [value: { value: string; segments: Segment[] }];
	focus: [];
	close: [];
}>();

const root = ref<HTMLElement>();
const extensions = computed(() => [
	inputTheme(props.isReadOnly),
	Prec.highest(keymap.of(editorKeymap)),
	n8nLang(),
	n8nAutocompletion(),
	mappingDropCursor(),
	dropCursor(),
	history(),
	expressionCloseBrackets(),
	EditorView.lineWrapping,
	EditorView.domEventHandlers({ scroll: (_, view) => forceParse(view) }),
	infoBoxTooltips(),
]);
const editorValue = ref<string>(removeExpressionPrefix(props.modelValue));
const { segments, readEditorValue, editor, hasFocus, focus } = useExpressionEditor({
	editorRef: root,
	editorValue,
	extensions,
	isReadOnly: computed(() => props.isReadOnly),
	autocompleteTelemetry: {
		enabled: true,
		parameterPath: props.path,
	},
	targetNodeParameterContext: props.targetNodeParameterContext,
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

defineExpose({ editor, focus });
</script>

<template>
	<div ref="root" :class="$style.editor" @keydown.stop></div>
</template>

<style lang="scss" module>
.editor {
	:global(.cm-content) {
		border-radius: var(--radius);
		&[aria-readonly='true'] {
			--disabled-fill: var(--color--background);
			background-color: var(--disabled-fill, var(--color--background--light-2));
			color: var(--disabled-color, var(--color--text));
			cursor: not-allowed;
		}
	}
}
</style>
