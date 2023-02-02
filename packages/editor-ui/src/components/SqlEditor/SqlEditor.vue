<template>
	<div ref="sqlEditor" class="ph-no-capture"></div>
</template>

<script lang="ts">
import Vue from 'vue';
import { format, SqlLanguage } from 'sql-formatter';
import { sql, MySQL, PostgreSQL, StandardSQL, SQLDialect } from '@codemirror/lang-sql';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, insertNewlineAndIndent, history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { EditorState, Extension } from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	ViewUpdate,
} from '@codemirror/view';
import { theme } from './theme';
import { sqlEditorEventBus } from '@/event-bus/sql-editor-event-bus';

export default Vue.extend({
	name: 'sqlEditor',
	props: {
		query: {
			type: String,
			required: true,
		},
		dialect: {
			type: String,
		},
		rows: {
			type: Number,
			default: -1,
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

		extensions(): Extension[] {
			const map: Record<string, SQLDialect> = {
				mysql: MySQL,
				postgres: PostgreSQL,
				standard: StandardSQL,
			};

			return [
				bracketMatching(),
				autocompletion(),
				sql({
					upperCaseKeywords: true,
					dialect: map[this.dialect] ?? StandardSQL,
				}),
				keymap.of([indentWithTab, { key: 'Enter', run: insertNewlineAndIndent }]),
				indentOnInput(),
				theme,
				lineNumbers(),
				highlightActiveLineGutter(),
				history(),
				foldGutter(),
				dropCursor(),
				indentOnInput(),
				highlightActiveLine(),
				EditorState.readOnly.of(this.isReadOnly),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (!viewUpdate.docChanged) return;

					this.$emit('valueChanged', this.doc);
				}),
			];
		},
	},

	methods: {
		root() {
			const root = this.$refs.sqlEditor as HTMLDivElement | undefined;

			if (!root) throw new Error('Expected div with ref "sqlEditor"');

			return root;
		},

		// @TODO: Fetch schema, set to state, populate completions
		// https://github.com/codemirror/lang-sql#user-content-sqlconfig.schema

		format() {
			const doc = this.editor.state.sliceDoc();

			const map: Record<string, SqlLanguage> = {
				mysql: 'mysql',
				postgres: 'postgresql',
			};

			const formatted = format(doc, { language: map[this.dialect] });

			this.editor.dispatch({
				changes: { from: 0, to: this.doc.length, insert: formatted },
			});
		},
	},

	mounted() {
		sqlEditorEventBus.$on('format-sql', this.format);

		let doc = this.query;

		if (this.query === '' && this.rows > 0) {
			doc = '\n'.repeat(this.rows - 1);
		}

		const state = EditorState.create({ doc, extensions: this.extensions });

		this.editor = new EditorView({ parent: this.root(), state });
	},

	destroyed() {
		sqlEditorEventBus.$off('format-sql', this.format);
	},
});
</script>

<style lang="scss" module></style>
