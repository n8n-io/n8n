<template>
	<div :class="$style.sqlEditor">
		<div ref="sqlEditor" :class="$style.codemirror" data-test-id="sql-editor-container"></div>
		<slot name="suffix" />
		<InlineExpressionEditorOutput
			v-if="!fullscreen"
			:segments="segments"
			:is-read-only="isReadOnly"
			:visible="hasFocus"
		/>
	</div>
</template>

<script setup lang="ts">
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { codeNodeEditorEventBus } from '@/event-bus';
import { useExpressionEditor } from '@/composables/useExpressionEditor';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';
import { ifNotIn } from '@codemirror/autocomplete';
import { history, toggleComment } from '@codemirror/commands';
import { LanguageSupport, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
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
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';

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
};

const props = withDefaults(defineProps<Props>(), {
	dialect: 'StandardSQL',
	rows: 4,
	isReadOnly: false,
	fullscreen: false,
});

const emit = defineEmits<{
	(event: 'update:model-value', value: string): void;
}>();

const sqlEditor = ref<HTMLElement>();
const extensions = computed(() => {
	const dialect = SQL_DIALECTS[props.dialect] ?? SQL_DIALECTS.StandardSQL;
	function sqlWithN8nLanguageSupport() {
		return new LanguageSupport(dialect.language, [
			dialect.language.data.of({
				autocomplete: ifNotIn(['Resolvable'], keywordCompletionSource(dialect, true)),
			}),
			n8nCompletionSources().map((source) => dialect.language.data.of(source)),
		]);
	}

	const baseExtensions = [
		sqlWithN8nLanguageSupport(),
		expressionInputHandler(),
		codeNodeEditorTheme({
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
			Prec.highest(
				keymap.of([
					...tabKeyMap(),
					...enterKeyMap,
					...historyKeyMap,
					...autocompleteKeyMap,
					{ key: 'Mod-/', run: toggleComment },
				]),
			),
			n8nAutocompletion(),
			indentOnInput(),
			highlightActiveLine(),
			highlightActiveLineGutter(),
			foldGutter(),
			dropCursor(),
			bracketMatching(),
		]);
	}
	return baseExtensions;
});
const editorValue = ref(props.modelValue);
const {
	editor,
	segments: { all: segments },
	readEditorValue,
	hasFocus,
} = useExpressionEditor({
	editorRef: sqlEditor,
	editorValue,
	extensions,
	skipSegments: ['Statement', 'CompositeIdentifier', 'Parens', 'Brackets'],
	isReadOnly: props.isReadOnly,
});

watch(
	() => props.modelValue,
	(newValue) => {
		editorValue.value = newValue;
	},
);

watch(segments, () => {
	emit('update:model-value', readEditorValue());
});

onMounted(() => {
	codeNodeEditorEventBus.on('error-line-number', highlightLine);

	if (props.fullscreen) {
		focus();
	}
});

onBeforeUnmount(() => {
	codeNodeEditorEventBus.off('error-line-number', highlightLine);
	emit('update:model-value', readEditorValue());
});

function line(lineNumber: number): Line | null {
	try {
		return editor.value?.state.doc.line(lineNumber) ?? null;
	} catch {
		return null;
	}
}

function highlightLine(lineNumber: number | 'final') {
	if (!editor.value) return;

	if (lineNumber === 'final') {
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
</script>

<style module lang="scss">
.sqlEditor {
	position: relative;
	height: 100%;
}

.codemirror {
	height: 100%;
}
</style>
