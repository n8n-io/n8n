<template>
	<div :class="$style.sqlEditor" v-click-outside="onBlur">
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
import { acceptCompletion, autocompletion, ifNotIn } from '@codemirror/autocomplete';
import { indentWithTab, history, redo, toggleComment } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, LanguageSupport } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
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
} from '@n8n/codemirror-lang-sql';
import type { SQLDialect as SQLDialectType } from '@n8n/codemirror-lang-sql';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionManager } from '@/mixins/expressionManager';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';

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
		'ndvStore.ndvInputData'() {
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
		doc(): string {
			return this.editor?.state.doc.toString() ?? '';
		},
		hoveringItemNumber(): number {
			return this.ndvStore.hoveringItemNumber;
		},
		sqlDialect(): SQLDialectType {
			return SQL_DIALECTS[this.dialect as keyof typeof SQL_DIALECTS] ?? SQL_DIALECTS.StandardSQL;
		},
		extensions(): Extension[] {
			const dialect = this.sqlDialect;

			function sqlWithN8nLanguageSupport() {
				return new LanguageSupport(dialect.language, [
					dialect.language.data.of({
						autocomplete: ifNotIn(['Resolvable'], keywordCompletionSource(dialect, true)),
					}),
					n8nCompletionSources().map((source) => dialect.language.data.of(source)),
				]);
			}

			const extensions = [
				sqlWithN8nLanguageSupport(),
				expressionInputHandler(),
				codeNodeEditorTheme({ isReadOnly: this.isReadOnly, customMaxHeight: '350px' }),
				lineNumbers(),
				EditorView.lineWrapping,
				EditorState.readOnly.of(this.isReadOnly),
				EditorView.domEventHandlers({
					focus: () => {
						this.isFocused = true;
					},
				}),
				EditorState.readOnly.of(this.isReadOnly),
				EditorView.editable.of(!this.isReadOnly),
			];

			if (!this.isReadOnly) {
				extensions.push(
					history(),
					keymap.of([
						{ key: 'Mod-Shift-z', run: redo },
						{ key: 'Mod-/', run: toggleComment },
						{ key: 'Tab', run: acceptCompletion },
						indentWithTab,
					]),
					autocompletion(),
					indentOnInput(),
					highlightActiveLine(),
					highlightActiveLineGutter(),
					foldGutter(),
					dropCursor(),
					bracketMatching(),
					EditorView.updateListener.of((viewUpdate) => {
						if (!viewUpdate.docChanged || !this.editor) return;

						highlighter.removeColor(this.editor as EditorView, this.plaintextSegments);
						highlighter.addColor(this.editor as EditorView, this.resolvableSegments);

						this.$emit('valueChanged', this.doc);
					}),
				);
			}
			return extensions;
		},
	},
	mounted() {
		if (!this.isReadOnly) codeNodeEditorEventBus.on('error-line-number', this.highlightLine);

		const state = EditorState.create({ doc: this.query, extensions: this.extensions });
		this.editor = new EditorView({ parent: this.$refs.sqlEditor as HTMLDivElement, state });
		highlighter.addColor(this.editor as EditorView, this.resolvableSegments);
	},
	methods: {
		onBlur() {
			this.isFocused = false;
		},
		highlightLine(line: number | 'final') {
			if (!this.editor) return;

			if (line === 'final') {
				this.editor.dispatch({
					selection: { anchor: this.query.length },
				});
				return;
			}

			this.editor.dispatch({
				selection: { anchor: this.editor.state.doc.line(line).from },
			});
		},
	},
});
</script>

<style module lang="scss">
.sqlEditor {
	position: relative;
}
</style>
