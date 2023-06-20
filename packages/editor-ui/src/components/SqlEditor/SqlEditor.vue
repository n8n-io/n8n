<template>
	<div :class="[$style.sqlEditor, 'sql-editor']">
		<div ref="sqlEditor" data-test-id="sql-editor-container" class="ph-no-capture"></div>
		<InlineExpressionEditorOutput
			:segments="segments"
			:value="query"
			:isReadOnly="isReadOnly"
			:visible="isFocused"
			:hoveringItemNumber="hoveringItemNumber"
		/>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, history, redo, toggleComment } from '@codemirror/commands';
import { foldGutter, indentOnInput, LanguageSupport } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
// TODO: Replace this once `codemirror-lang-n8n-sql` npm package is updated
import {
	MSSQL,
	MySQL,
	PostgreSQL,
	StandardSQL,
	MariaSQL,
	SQLite,
	Cassandra,
	PLSQL,
	keywordCompletionSource,
} from './sql-parser-skipping-whitespace';
import type { SQLDialect as SQLDialectType } from './sql-parser-skipping-whitespace';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionManager } from '@/mixins/expressionManager';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';

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

type SQLEditorData = {
	editor: EditorView | null;
	isFocused: boolean;
	skipSegments: string[];
	expressionsDocsUrl: string;
};

function n8nLanguageSupport(dialect: SQLDialectType) {
	return new LanguageSupport(dialect.language, [
		n8nCompletionSources().map((source) => dialect.language.data.of(source)),
	]);
}

export default defineComponent({
	name: 'sql-editor',
	components: {
		InlineExpressionEditorOutput,
	},
	mixins: [expressionManager],
	props: {
		query: {
			type: String,
			required: true,
		},
		dialect: {
			type: String,
			default: 'StandardSQL',
			validator: (value: string) => {
				return Object.keys(SQL_DIALECTS).includes(value);
			},
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data(): SQLEditorData {
		return {
			editor: null,
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
			isFocused: false,
			skipSegments: ['Statement', 'CompositeIdentifier', 'Parens'],
		};
	},
	watch: {
		ndvInputData() {
			this.editor?.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: this.query,
				},
			});

			setTimeout(() => {
				this.editor?.contentDOM.blur();
			});
		},
	},
	computed: {
		ndvInputData(): object {
			return this.ndvStore.ndvInputData;
		},
		doc(): string {
			return this.editor ? this.editor.state.doc.toString() : '';
		},
		hoveringItemNumber(): number {
			return this.ndvStore.hoveringItemNumber;
		},
	},
	mounted() {
		const dialect =
			SQL_DIALECTS[this.dialect as keyof typeof SQL_DIALECTS] ?? SQL_DIALECTS.StandardSQL;
		const extensions = [
			n8nLanguageSupport(dialect),
			[
				dialect,
				dialect.language.data.of({
					autocomplete: keywordCompletionSource(dialect, true),
				}),
			],
			expressionInputHandler(),
			codeNodeEditorTheme({ isReadOnly: this.isReadOnly, customMaxHeight: '350px' }),
			lineNumbers(),
			EditorView.lineWrapping,
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.isFocused = true;
				},
				blur: () => {
					this.isFocused = false;
				},
			}),
		];

		if (this.isReadOnly) {
			extensions.push(EditorView.editable.of(this.isReadOnly));
		} else {
			extensions.push(
				history(),
				keymap.of([
					indentWithTab,
					{ key: 'Mod-Shift-z', run: redo },
					{ key: 'Mod-/', run: toggleComment },
				]),
				autocompletion(),
				indentOnInput(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				foldGutter(),
				dropCursor(),
				EditorView.updateListener.of((viewUpdate) => {
					if (!viewUpdate.docChanged || !this.editor) return;

					highlighter.removeColor(this.editor as EditorView, this.plaintextSegments);
					highlighter.addColor(this.editor as EditorView, this.resolvableSegments);

					this.$emit('valueChanged', this.doc);
				}),
			);
		}
		const state = EditorState.create({ doc: this.query, extensions });
		this.editor = new EditorView({ parent: this.$refs.sqlEditor as HTMLDivElement, state });

		highlighter.addColor(this.editor as EditorView, this.resolvableSegments);
	},
});
</script>

<style module lang="scss">
.sqlEditor {
	position: relative;
}
</style>
