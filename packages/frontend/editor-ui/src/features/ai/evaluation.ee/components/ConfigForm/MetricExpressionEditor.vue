<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { history } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { useExpressionEditor } from '@/features/shared/editors/composables/useExpressionEditor';
import { editorKeymap } from '@/features/shared/editors/plugins/codemirror/keymap';
import { expressionCloseBrackets } from '@/features/shared/editors/plugins/codemirror/expressionCloseBrackets';
import { n8nAutocompletion, n8nLang } from '@/features/shared/editors/plugins/codemirror/n8nLang';
import { infoBoxTooltips } from '@/features/shared/editors/plugins/codemirror/tooltips/InfoBoxTooltip';
import { removeExpressionPrefix } from '@/app/utils/expressions';
import type { TargetNodeParameterContext } from '@/Interface';

import { inputTheme } from './metricExpressionEditorTheme';

type Props = {
	modelValue: string;
	/**
	 * `expression` — the stored value is a pure expression (`={{ ... }}`).
	 * The leading `=` is stripped before editing and re-added on emit.
	 *
	 * `template` — the stored value is plain text that may contain `{{ ... }}`
	 * interpolations. No prefix handling.
	 */
	mode: 'expression' | 'template';
	path: string;
	rows?: number;
	endNodeName?: string;
	placeholder?: string;
	isReadOnly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	rows: 3,
	endNodeName: '',
	placeholder: '',
	isReadOnly: false,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const root = ref<HTMLElement>();

function toEditorValue(value: string): string {
	if (props.mode !== 'expression') return value;
	const stripped = removeExpressionPrefix<string>(value);
	return typeof stripped === 'string' ? stripped : '';
}

const editorValue = ref<string>(toEditorValue(props.modelValue));

// Anchor autocomplete "on" the end node so $("OtherNode") suggestions work, but also
// set inputNodeName = endNode so that `$json` resolves to the end node's OUTPUT (what
// a metric node would see as its input at runtime) instead of the end node's input.
const targetNodeParameterContext: TargetNodeParameterContext | undefined = props.endNodeName
	? {
			nodeName: props.endNodeName,
			parameterPath: props.path,
			inputNodeName: props.endNodeName,
		}
	: undefined;

const extensions = computed(() => [
	Prec.highest(keymap.of(editorKeymap)),
	n8nLang(),
	n8nAutocompletion(),
	inputTheme({ rows: props.rows, isReadOnly: props.isReadOnly }),
	history(),
	expressionCloseBrackets(),
	EditorView.lineWrapping,
	infoBoxTooltips(),
]);

const { segments, readEditorValue } = useExpressionEditor({
	editorRef: root,
	editorValue,
	extensions,
	isReadOnly: computed(() => props.isReadOnly),
	targetNodeParameterContext,
	autocompleteTelemetry: { enabled: true, parameterPath: props.path },
});

watch(segments.display, () => {
	const next = readEditorValue();
	const emitted = props.mode === 'expression' ? `=${next}` : next;
	if (emitted === props.modelValue) return;
	emit('update:model-value', emitted);
});

watch(
	() => props.modelValue,
	(newValue) => {
		const normalized = toEditorValue(newValue);
		if (normalized !== editorValue.value) {
			editorValue.value = normalized;
		}
	},
);
</script>

<template>
	<div
		ref="root"
		:class="$style.editor"
		:data-placeholder="placeholder || undefined"
		data-test-id="metric-expression-editor"
	></div>
</template>

<style lang="scss" module>
.editor {
	width: 100%;

	:global(.cm-editor) {
		background-color: var(--expression-editor--color--background, var(--code--color--background));
	}

	:global(.cm-content) {
		border-radius: var(--radius);
		font-family: var(--font-family--monospace);

		&[aria-readonly='true'] {
			background-color: var(--color--background--light-2);
			color: var(--color--text);
			cursor: not-allowed;
		}
	}
}
</style>
