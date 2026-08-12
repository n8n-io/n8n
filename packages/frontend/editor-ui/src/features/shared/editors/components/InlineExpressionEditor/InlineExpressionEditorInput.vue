<script setup lang="ts">
import { keymap } from '@codemirror/view';
import { Prec, type EditorState, type SelectionRange } from '@codemirror/state';
import { computed, useTemplateRef } from 'vue';
import { ExpressionEditorInput } from '@n8n/expression-editor';
import type { Segment } from '@n8n/expression-editor';
import type { IDataObject } from 'n8n-workflow';

import { mappingDropCursor } from '../../plugins/codemirror/dragAndDrop';
import { editorKeymap } from '../../plugins/codemirror/keymap';
import {
	infoBoxTooltips,
	closeCursorInfoBox,
} from '../../plugins/codemirror/tooltips/InfoBoxTooltip';
import { n8nCompletionSourceFns } from '../../plugins/codemirror/completions/addCompletions';
import { useNdvExpressionEditorHost } from '../../composables/useNdvExpressionEditorHost';

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

const input = useTemplateRef('input');

const { resolver, staticExtensions, trackAutocomplete } = useNdvExpressionEditorHost({
	additionalData: computed(() => props.additionalData),
	autocompleteTelemetry: computed(() => ({ enabled: true, parameterPath: props.path })),
});

trackAutocomplete(() => input.value?.editor);

const extensions = computed(() => [
	Prec.highest(keymap.of(editorKeymap)),
	mappingDropCursor(),
	infoBoxTooltips(),
]);

defineExpose({
	get editor() {
		return input.value?.editor;
	},
	setCursorPosition: (pos: number | 'lastExpression' | 'end') =>
		input.value?.setCursorPosition(pos),
	focus: () => input.value?.focus(),
	selectAll: () => input.value?.selectAll(),
});
</script>

<template>
	<ExpressionEditorInput
		ref="input"
		:model-value="modelValue"
		:resolver="resolver"
		:completion-sources="n8nCompletionSourceFns"
		:extensions="extensions"
		:static-extensions="staticExtensions"
		:rows="rows"
		:is-read-only="isReadOnly"
		:on-editor-blur="closeCursorInfoBox"
		@update:model-value="emit('update:model-value', $event)"
		@update:selection="emit('update:selection', $event)"
		@focus="emit('focus')"
	/>
</template>
