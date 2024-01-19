<template>
	<div v-on-click-outside="onBlur" :class="$style.sqlEditor">
		<div ref="sqlEditor" data-test-id="sql-editor-container"></div>
		<slot name="suffix" />
		<InlineExpressionEditorOutput
			v-if="!fillParent"
			:segments="segments"
			:is-read-only="isReadOnly"
			:visible="isFocused"
			:hovering-item-number="hoveringItemNumber"
		/>
	</div>
</template>

<script lang="ts">
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { expressionManager } from '@/mixins/expressionManager';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { autocompletion, ifNotIn } from '@codemirror/autocomplete';
import { history, redo, toggleComment, undo } from '@codemirror/commands';
import { LanguageSupport, bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { type Extension, type Line, Prec } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import type { SQLDialect as SQLDialectType } from '@n8n/codemirror-lang-sql';
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
import { defineComponent } from 'vue';
import { enterKeyMap, tabKeyMap } from '../CodeNodeEditor/baseExtensions';
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

type SQLEditorData = {
	editor: EditorView | null;
	editorState: EditorState | null;
	isFocused: boolean;
	skipSegments: string[];
	expressionsDocsUrl: string;
};

export default defineComponent({
	name: 'SqlEditor',
	components: {
		InlineExpressionEditorOutput,
	},
	mixins: [expressionManager],
	props: {
		modelValue: {
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
		fillParent: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: 4,
		},
	},
	data(): SQLEditorData {
		return {
			editor: null,
			editorState: null,
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
			isFocused: false,
			skipSegments: ['Statement', 'CompositeIdentifier', 'Parens'],
		};
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
				codeNodeEditorTheme({
					isReadOnly: this.isReadOnly,
					maxHeight: this.fillParent ? '100%' : '40vh',
					minHeight: '10vh',
					rows: this.rows,
				}),
				lineNumbers(),
				EditorView.lineWrapping,
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
					Prec.highest(
						keymap.of([
							...tabKeyMap,
							...enterKeyMap,
							{ key: 'Mod-z', run: undo },
							{ key: 'Mod-Shift-z', run: redo },
							{ key: 'Mod-/', run: toggleComment },
						]),
					),
					autocompletion(),
					indentOnInput(),
					highlightActiveLine(),
					highlightActiveLineGutter(),
					foldGutter(),
					dropCursor(),
					bracketMatching(),
					EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
						if (!viewUpdate.docChanged || !this.editor) return;

						highlighter.removeColor(this.editor as EditorView, this.plaintextSegments);
						highlighter.addColor(this.editor as EditorView, this.resolvableSegments);

						this.$emit('update:modelValue', this.editor?.state.doc.toString());
					}),
				);
			}
			return extensions;
		},
	},
	watch: {
		'ndvStore.ndvInputData'() {
			this.editor?.dispatch({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: this.modelValue,
				},
			});

			setTimeout(() => {
				this.editor?.contentDOM.blur();
			});
		},
	},
	mounted() {
		if (!this.isReadOnly) codeNodeEditorEventBus.on('error-line-number', this.highlightLine);

		const state = EditorState.create({ doc: this.modelValue, extensions: this.extensions });

		this.editor = new EditorView({ parent: this.$refs.sqlEditor as HTMLDivElement, state });
		this.editorState = this.editor.state;
		highlighter.addColor(this.editor as EditorView, this.resolvableSegments);
	},
	methods: {
		onBlur() {
			this.isFocused = false;
		},
		line(lineNumber: number): Line | null {
			try {
				return this.editor?.state.doc.line(lineNumber) ?? null;
			} catch {
				return null;
			}
		},
		highlightLine(lineNumber: number | 'final') {
			if (!this.editor) return;

			if (lineNumber === 'final') {
				this.editor.dispatch({
					selection: { anchor: this.modelValue.length },
				});
				return;
			}

			const line = this.line(lineNumber);

			if (!line) return;

			this.editor.dispatch({
				selection: { anchor: line.from },
			});
		},
	},
});
</script>

<style module lang="scss">
.sqlEditor {
	position: relative;
	height: 100%;

	& > div {
		height: 100%;
	}
}
</style>
