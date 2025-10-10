<script setup lang="ts">
import DraggableTarget from '@/components/DraggableTarget.vue';
import InlineExpressionEditorOutput from '../InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { useExpressionEditor } from '../../composables/useExpressionEditor';
import { codeNodeEditorEventBus } from '@/event-bus';
import { n8nCompletionSources } from '../../plugins/codemirror/completions/addCompletions';
import { dropInExpressionEditor, mappingDropCursor } from '../../plugins/codemirror/dragAndDrop';
import { editorKeymap } from '../../plugins/codemirror/keymap';
import { n8nAutocompletion } from '../../plugins/codemirror/n8nLang';
import { history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, LanguageSupport } from '@codemirror/language';
import { Prec, type Line } from '@codemirror/state';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import {
	Cassandra,
	MSSQL,
	MariaSQL,
	MySQL,
	PLSQL,
	PostgreSQL,
	SQLite,
	StandardSQL,
	keywordCompletionSource,
} from '@n8n/codemirror-lang-sql';
import { onClickOutside } from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, toRaw, watch } from 'vue';
import { codeEditorTheme } from '../CodeNodeEditor/theme';
import {
	expressionCloseBrackets,
	expressionCloseBracketsConfig,
} from '../../plugins/codemirror/expressionCloseBrackets';
import type { TargetNodeParameterContext } from '@/Interface';

const SQL_DIALECTS = {
	StandardSQL,
	PostgreSQL,
	MySQL,
	MariaSQL,
	MSSQL,
	SQLite,
	Cassandra,
	PLSQL,
} as const;

type Props = {
	modelValue: string;
	dialect?: keyof typeof SQL_DIALECTS;
	rows?: number;
	isReadOnly?: boolean;
	fullscreen?: boolean;
	targetNodeParameterContext?: TargetNodeParameterContext;
};

const props = withDefaults(defineProps<Props>(), {
	dialect: 'StandardSQL',
	rows: 4,
	isReadOnly: false,
	fullscreen: false,
	targetNodeParameterContext: undefined,
});

const emit = defineEmits<{
	'update:model-value': [value: string];
}>();

const container = ref<HTMLDivElement>();
const sqlEditor = ref<HTMLDivElement>();
const isFocused = ref(false);
const outputPopover = ref<InstanceType<typeof InlineExpressionEditorOutput>>();

const extensions = computed(() => {
	const dialect = SQL_DIALECTS[props.dialect] ?? SQL_DIALECTS.StandardSQL;
	function sqlWithN8nLanguageSupport() {
		return new LanguageSupport(dialect.language, [
			dialect.sqlLanguage.data.of({ closeBrackets: expressionCloseBracketsConfig }),
			dialect.sqlLanguage.data.of({
				autocomplete: keywordCompletionSource(dialect, true),
			}),
			n8nCompletionSources().map((source) => dialect.language.data.of(source)),
		]);
	}

	const baseExtensions = [
		sqlWithN8nLanguageSupport(),
		expressionCloseBrackets(),
		codeEditorTheme({
			isReadOnly: props.isReadOnly,
			maxHeight: props.fullscreen ? '100%' : '40vh',
			minHeight: '10vh',
			rows: props.rows,
		}),
		lineNumbers(),
		EditorView.lineWrapping,
	];

	if (!props.isReadOnly) {
		return baseExtensions.concat([
			history(),
			Prec.highest(keymap.of(editorKeymap)),
			n8nAutocompletion(),
			indentOnInput(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			foldGutter(),
			dropCursor(),
			bracketMatching(),
			mappingDropCursor(),
		]);
	}

	return baseExtensions;
});
const {
	editor,
	segments: { all: segments },
	readEditorValue,
	hasFocus: editorHasFocus,
	focus,
} = useExpressionEditor({
	editorRef: sqlEditor,
	editorValue: () => props.modelValue,
	extensions,
	skipSegments: ['Statement', 'CompositeIdentifier', 'Parens', 'Brackets'],
	isReadOnly: props.isReadOnly,
	targetNodeParameterContext: props.targetNodeParameterContext,
	onChange: () => {
		emit('update:model-value', readEditorValue());
	},
});

watch(editorHasFocus, (hasFocus) => {
	if (hasFocus) {
		isFocused.value = true;
	}
});

onMounted(() => {
	codeNodeEditorEventBus.on('highlightLine', highlightLine);

	if (props.fullscreen) {
		focus();
	}
});

onBeforeUnmount(() => {
	codeNodeEditorEventBus.off('highlightLine', highlightLine);
});

onClickOutside(container, (event) => onBlur(event));

function onBlur(event: FocusEvent | KeyboardEvent) {
	if (
		event?.target instanceof Element &&
		(Array.from(event.target.classList).some((_class) => _class.includes('resizer')) ||
			outputPopover.value?.contentRef?.contains(event.target))
	) {
		return; // prevent blur on resizing or interacting with output popover
	}

	isFocused.value = false;
}

function line(lineNumber: number): Line | null {
	try {
		return editor.value?.state.doc.line(lineNumber) ?? null;
	} catch {
		return null;
	}
}

function highlightLine(lineNumber: number | 'last') {
	if (!editor.value) return;

	if (lineNumber === 'last') {
		editor.value.dispatch({
			selection: { anchor: editor.value.state.doc.length },
		});
		return;
	}

	const lineToHighlight = line(lineNumber);

	if (!lineToHighlight) return;

	editor.value.dispatch({
		selection: { anchor: lineToHighlight.from },
	});
}

async function onDrop(value: string, event: MouseEvent) {
	if (!editor.value) return;

	await dropInExpressionEditor(toRaw(editor.value), event, value);
}

defineExpose({
	focus,
});
</script>

<template>
	<div ref="container" :class="$style.sqlEditor" @keydown.tab="onBlur">
		<DraggableTarget type="mapping" :disabled="isReadOnly" @drop="onDrop">
			<template #default="{ activeDrop, droppable }">
				<div
					ref="sqlEditor"
					:class="[
						$style.codemirror,
						{ [$style.activeDrop]: activeDrop, [$style.droppable]: droppable },
					]"
					data-test-id="sql-editor-container"
				></div>
			</template>
		</DraggableTarget>
		<slot name="suffix" />
		<InlineExpressionEditorOutput
			v-if="!fullscreen"
			ref="outputPopover"
			:segments="segments"
			:is-read-only="isReadOnly"
			:visible="isFocused"
			:virtual-ref="container"
		/>
	</div>
</template>

<style module lang="scss">
.sqlEditor {
	position: relative;
	height: 100%;

	& > div {
		height: 100%;
	}
}

.codemirror {
	height: 100%;
}

.codemirror.droppable {
	:global(.cm-editor) {
		border-color: var(--color-ndv-droppable-parameter);
		border-style: dashed;
		border-width: 1.5px;
	}
}

.codemirror.activeDrop {
	:global(.cm-editor) {
		border-color: var(--color--success);
		border-style: solid;
		cursor: grabbing;
		border-width: 1px;
	}
}
</style>
