<template>
	<div ref="sqlEditor" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import type { PropType } from 'vue';
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
import { MSSQL, MySQL, PostgreSQL, StandardSQL, keywordCompletion } from '@codemirror/lang-sql';
import type { SQLDialect } from 'n8n-workflow';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { expressionManager } from '@/mixins/expressionManager';

import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';

const SQL_DIALECTS = {
	standard: StandardSQL,
	mssql: MSSQL,
	mysql: MySQL,
	postgres: PostgreSQL,
} as const;

export default mixins(expressionManager).extend({
	name: 'sql-editor',
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
		const { isReadOnly } = this;
		const dialect = SQL_DIALECTS[this.dialect as SQLDialect] ?? SQL_DIALECTS.standard;
		const sqlLanguageSupport = new LanguageSupport(dialect.language, [
			keywordCompletion(dialect, true),
			...n8nCompletionSources().map((source) => dialect.language.data.of(source)),
		]);

		const extensions: Extension[] = [
			sqlLanguageSupport,
			lineNumbers(),
			EditorView.lineWrapping,
			lintGutter(),
			EditorState.readOnly.of(isReadOnly),
			EditorView.editable.of(!isReadOnly),
			codeNodeEditorTheme({ isReadOnly }),
		];

		if (!isReadOnly) {
			extensions.push(
				history(),
				expressionInputHandler(),
				keymap.of([indentWithTab, { key: 'Mod-Shift-z', run: redo }]),
				autocompletion(),
				indentOnInput(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				foldGutter(),
				dropCursor(),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (!viewUpdate.docChanged) return;
					this.$emit('valueChanged', this.doc);
				}),
			);
		}
		const state = EditorState.create({ doc: this.query, extensions });
		this.editor = new EditorView({ parent: this.$refs.sqlEditor as HTMLDivElement, state });
	},
});
</script>
