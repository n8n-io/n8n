<template>
	<div ref="sqlEditor" class="ph-no-capture"></div>
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
} from './custom-lang-sql'; // update with: codemirror-lang-n8n-sql
import type { SQLDialect } from 'n8n-workflow';

import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { expressionManager } from '@/mixins/expressionManager';

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
		};
	},
	computed: {
		doc(): string {
			return this.editor.state.doc.toString();
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
