<template>
	<div>
		<div ref="sqlEditor" class="ph-no-capture"></div>
		<InlineExpressionEditorOutput
			:segments="previewSegments"
			:value="query"
			:isReadOnly="isReadOnly"
			:visible="isFocused"
			:hoveringItemNumber="1"
		/>
	</div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent } from 'vue';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, history, redo } from '@codemirror/commands';
import { foldGutter, indentOnInput, LanguageSupport } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import {
	keywordCompletion,
	MSSQL,
	MySQL,
	PostgreSQL,
	schemaCompletion,
	StandardSQL,
} from './sql-parser-skipping-whitespace';
import type { SQLDialect } from 'n8n-workflow';

import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionManager } from '@/mixins/expressionManager';
import InlineExpressionEditorOutput from '@/components/InlineExpressionEditor/InlineExpressionEditorOutput.vue';
import { EXPRESSIONS_DOCS_URL } from '@/constants';
import type { Segment } from '@/types/expressions';

const SQL_DIALECTS = {
	standard: StandardSQL,
	mssql: MSSQL,
	mysql: MySQL,
	postgres: PostgreSQL,
} as const;

// @TODO: support configs, dialects, etc.
function sqlLanguageSupport() {
	return new LanguageSupport(StandardSQL.language, [
		schemaCompletion({}),
		keywordCompletion(StandardSQL, true),
		n8nCompletionSources().map((source) => StandardSQL.language.data.of(source)),
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
			type: String as PropType<SQLDialect>,
			default: 'standard',
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			editor: {} as EditorView,
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
			isFocused: false,
		};
	},
	computed: {
		doc(): string {
			return this.editor.state.doc.toString();
		},
		previewSegments(): Segment[] {
			return this.segments.length > 1 ? this.segments.slice(1) : this.segments;
		},
	},

	mounted() {
		const dialect = SQL_DIALECTS[this.dialect as SQLDialect] ?? SQL_DIALECTS.standard;
		const extensions: Extension[] = [
			sqlLanguageSupport(),
			expressionInputHandler(),
			codeNodeEditorTheme({ isReadOnly: this.isReadOnly, customMaxHeight: '350px' }),
			lineNumbers(),
			EditorView.lineWrapping,
			lintGutter(),
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
				keymap.of([indentWithTab, { key: 'Mod-Shift-z', run: redo }]),
				autocompletion(),
				indentOnInput(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				foldGutter(),
				dropCursor(),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (!viewUpdate.docChanged) return;

					highlighter.removeColor(this.editor, this.plaintextSegments);
					highlighter.addColor(this.editor, this.resolvableSegments);

					this.$emit('valueChanged', this.doc);
				}),
			);
		}
		const state = EditorState.create({ doc: this.query, extensions });
		this.editor = new EditorView({ parent: this.$refs.sqlEditor as HTMLDivElement, state });

		highlighter.addColor(this.editor, this.resolvableSegments);
	},
});
</script>

<style module lang="scss">
.dropdown {
	display: flex;
	flex-direction: column;
	position: absolute;
	z-index: 2; // cover tooltips
	background: white;
	border: var(--border-base);
	border-top: none;
	width: 100%;
	box-shadow: 0 2px 6px 0 rgba(#441c17, 0.1);
	border-bottom-left-radius: 4px;
	border-bottom-right-radius: 4px;

	.header,
	.body,
	.footer {
		padding: var(--spacing-3xs);
	}

	.header {
		color: var(--color-text-dark);
		font-weight: var(--font-weight-bold);
		padding-left: var(--spacing-2xs);
		padding-top: var(--spacing-2xs);
	}

	.body {
		padding-top: 0;
		padding-left: var(--spacing-2xs);
		color: var(--color-text-dark);
	}

	.footer {
		border-top: var(--border-base);
		padding: var(--spacing-4xs);
		padding-left: var(--spacing-2xs);
		padding-top: 0;
		line-height: var(--font-line-height-regular);
		color: var(--color-text-base);

		.expression-syntax-example {
			display: inline-block;
			font-size: var(--font-size-2xs);
			height: var(--font-size-m);
			background-color: #f0f0f0;
			margin-left: var(--spacing-5xs);
			margin-right: var(--spacing-5xs);
		}

		.learn-more {
			line-height: 1;
			white-space: nowrap;
		}
	}
}
</style>
