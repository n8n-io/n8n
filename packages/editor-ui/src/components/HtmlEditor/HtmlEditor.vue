<template>
	<div ref="htmlEditor" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import prettier from 'prettier/standalone';
import htmlParser from 'prettier/parser-html';
import cssParser from 'prettier/parser-postcss';
import jsParser from 'prettier/parser-babel';
import { htmlLanguage, autoCloseTags, html } from 'codemirror-lang-html-n8n';
import { autocompletion } from '@codemirror/autocomplete';
import { indentWithTab, insertNewlineAndIndent, history } from '@codemirror/commands';
import {
	bracketMatching,
	ensureSyntaxTree,
	foldGutter,
	indentOnInput,
	LanguageSupport,
} from '@codemirror/language';
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

import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { htmlEditorEventBus } from '@/event-bus/html-editor-event-bus';
import { expressionManager } from '@/mixins/expressionManager';
import { theme } from './theme';
import { nonTakenRanges } from './utils';
import type { Range, Section } from './types';

export default mixins(expressionManager).extend({
	name: 'HtmlEditor',
	props: {
		html: {
			type: String,
			required: true,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		rows: {
			type: Number,
			default: -1,
		},
		disableExpressionColoring: {
			type: Boolean,
			default: false,
		},
		disableExpressionCompletions: {
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
			function htmlWithCompletions() {
				return new LanguageSupport(
					htmlLanguage,
					n8nCompletionSources().map((source) => htmlLanguage.data.of(source)),
				);
			}

			return [
				bracketMatching(),
				autocompletion(),
				this.disableExpressionCompletions ? html() : htmlWithCompletions(),
				autoCloseTags,
				expressionInputHandler(),
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

					this.getHighlighter()?.removeColor(this.editor, this.htmlSegments);
					this.getHighlighter()?.addColor(this.editor, this.resolvableSegments);

					this.$emit('valueChanged', this.doc);
				}),
			];
		},

		sections(): Section[] {
			const { state } = this.editor;

			const fullTree = ensureSyntaxTree(this.editor.state, this.doc.length);

			if (fullTree === null) {
				throw new Error(`Failed to parse syntax tree for: ${this.doc}`);
			}

			let documentRange: Range = [-1, -1];
			const styleRanges: Range[] = [];
			const scriptRanges: Range[] = [];

			fullTree.cursor().iterate((node) => {
				if (node.type.name === 'Document') {
					documentRange = [node.from, node.to];
				}

				if (node.type.name === 'StyleSheet') {
					styleRanges.push([node.from - '<style>'.length, node.to + '</style>'.length]);
				}

				if (node.type.name === 'Script') {
					scriptRanges.push([node.from - '<script>'.length, node.to + ('<' + '/script>').length]);
					// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
				}
			});

			const htmlRanges = nonTakenRanges(documentRange, [...styleRanges, ...scriptRanges]);

			const styleSections: Section[] = styleRanges.map(([start, end]) => ({
				kind: 'style' as const,
				range: [start, end],
				content: state.sliceDoc(start, end).replace(/<\/?style>/g, ''),
			}));

			const scriptSections: Section[] = scriptRanges.map(([start, end]) => ({
				kind: 'script' as const,
				range: [start, end],
				content: state.sliceDoc(start, end).replace(/<\/?script>/g, ''),
			}));

			const htmlSections: Section[] = htmlRanges.map(([start, end]) => ({
				kind: 'html' as const,
				range: [start, end] as Range,
				content: state.sliceDoc(start, end).replace(/<\/html>/g, ''),
				// opening tag may contain attributes, e.g. <html lang="en">
			}));

			return [...styleSections, ...scriptSections, ...htmlSections].sort(
				(a, b) => a.range[0] - b.range[0],
			);
		},
	},

	methods: {
		root() {
			const root = this.$refs.htmlEditor as HTMLDivElement | undefined;

			if (!root) throw new Error('Expected div with ref "htmlEditor"');

			return root;
		},

		isMissingHtmlTags() {
			const zerothSection = this.sections.at(0);

			return (
				!zerothSection?.content.trim().startsWith('<html') &&
				!zerothSection?.content.trim().endsWith('</html>')
			);
		},

		format() {
			if (this.sections.length === 1 && this.isMissingHtmlTags()) {
				const zerothSection = this.sections.at(0) as Section;

				const formatted = prettier
					.format(zerothSection.content, {
						parser: 'html',
						plugins: [htmlParser],
					})
					.trim();

				return this.editor.dispatch({
					changes: { from: 0, to: this.doc.length, insert: formatted },
				});
			}

			const formatted = [];

			for (const { kind, content } of this.sections) {
				if (kind === 'style') {
					const formattedStyle = prettier.format(content, {
						parser: 'css',
						plugins: [cssParser],
					});

					formatted.push(`<style>\n${formattedStyle}</style>`);
				}

				if (kind === 'script') {
					const formattedScript = prettier.format(content, {
						parser: 'babel',
						plugins: [jsParser],
					});

					formatted.push(`<script>\n${formattedScript}<` + '/script>');
					// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
				}

				if (kind === 'html') {
					const match = content.match(/(?<pre>[\s\S]*<html[\s\S]*?>)(?<rest>[\s\S]*)/);

					if (!match?.groups?.pre || !match.groups?.rest) continue;

					// Prettier cannot format pre-HTML section, e.g. <!DOCTYPE html>, so keep as is

					const { pre, rest } = match.groups;

					const formattedRest = prettier.format(rest, {
						parser: 'html',
						plugins: [htmlParser],
					});

					formatted.push(`${pre}\n${formattedRest}</html>`);
				}
			}

			if (formatted.length === 0) return;

			this.editor.dispatch({
				changes: { from: 0, to: this.doc.length, insert: formatted.join('\n\n') },
			});
		},

		getHighlighter() {
			if (this.disableExpressionColoring) return;

			return highlighter;
		},
	},

	mounted() {
		htmlEditorEventBus.$on('format-html', this.format);

		let doc = this.html;

		if (this.html === '' && this.rows > 0) {
			doc = '\n'.repeat(this.rows - 1);
		}

		const state = EditorState.create({ doc, extensions: this.extensions });

		this.editor = new EditorView({ parent: this.root(), state });

		this.getHighlighter()?.addColor(this.editor, this.resolvableSegments);
	},

	destroyed() {
		htmlEditorEventBus.$off('format-html', this.format);
	},
});
</script>

<style lang="scss" module></style>
