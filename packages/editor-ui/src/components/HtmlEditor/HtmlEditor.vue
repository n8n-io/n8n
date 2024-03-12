<template>
	<div :class="$style.editor">
		<div ref="htmlEditor"></div>
		<slot name="suffix" />
	</div>
</template>

<script lang="ts">
import { history } from '@codemirror/commands';
import {
	LanguageSupport,
	bracketMatching,
	ensureSyntaxTree,
	foldGutter,
	indentOnInput,
} from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorState, Prec } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	EditorView,
	dropCursor,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { autoCloseTags, html, htmlLanguage } from 'codemirror-lang-html-n8n';
import { format } from 'prettier';
import jsParser from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import htmlParser from 'prettier/plugins/html';
import cssParser from 'prettier/plugins/postcss';
import { defineComponent } from 'vue';

import { htmlEditorEventBus } from '@/event-bus';
import { expressionManager } from '@/mixins/expressionManager';
import { n8nCompletionSources } from '@/plugins/codemirror/completions/addCompletions';
import { expressionInputHandler } from '@/plugins/codemirror/inputHandlers/expression.inputHandler';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';
import { codeNodeEditorTheme } from '../CodeNodeEditor/theme';
import type { Range, Section } from './types';
import { nonTakenRanges } from './utils';
import { isEqual } from 'lodash-es';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';
import { n8nAutocompletion } from '@/plugins/codemirror/n8nLang';
import { completionStatus } from '@codemirror/autocomplete';

export default defineComponent({
	name: 'HtmlEditor',
	mixins: [expressionManager],
	props: {
		modelValue: {
			type: String,
			required: true,
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
			editor: null as EditorView | null,
			editorState: null as EditorState | null,
		};
	},
	watch: {
		displayableSegments(segments, newSegments) {
			if (isEqual(segments, newSegments)) return;

			highlighter.removeColor(this.editor, this.plaintextSegments);
			highlighter.addColor(this.editor, this.resolvableSegments);

			this.$emit('update:modelValue', this.editor?.state.doc.toString());
		},
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
				n8nAutocompletion(),
				this.disableExpressionCompletions ? html() : htmlWithCompletions(),
				autoCloseTags,
				expressionInputHandler(),
				Prec.highest(
					keymap.of([...tabKeyMap(), ...enterKeyMap, ...historyKeyMap, ...autocompleteKeyMap]),
				),
				indentOnInput(),
				codeNodeEditorTheme({
					isReadOnly: this.isReadOnly,
					maxHeight: this.fillParent ? '100%' : '40vh',
					minHeight: '20vh',
					rows: this.rows,
					highlightColors: 'html',
				}),
				lineNumbers(),
				highlightActiveLineGutter(),
				history(),
				foldGutter(),
				dropCursor(),
				indentOnInput(),
				highlightActiveLine(),
				EditorView.editable.of(!this.isReadOnly),
				EditorState.readOnly.of(this.isReadOnly),
				EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
					if (!this.editor) return;

					this.completionStatus = completionStatus(viewUpdate.view.state);

					if (!viewUpdate.docChanged) return;

					// Force segments value update by keeping track of editor state
					this.editorState = this.editor.state;
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

	mounted() {
		htmlEditorEventBus.on('format-html', this.format);

		let doc = this.modelValue;

		if (this.modelValue === '' && this.rows > 0) {
			doc = '\n'.repeat(this.rows - 1);
		}

		const state = EditorState.create({ doc, extensions: this.extensions });

		this.editor = new EditorView({ parent: this.root(), state });
		this.editorState = this.editor.state;

		this.getHighlighter()?.addColor(this.editor, this.resolvableSegments);
	},

	beforeUnmount() {
		htmlEditorEventBus.off('format-html', this.format);
	},

	methods: {
		root() {
			const rootRef = this.$refs.htmlEditor as HTMLDivElement | undefined;
			if (!rootRef) {
				throw new Error('Expected div with ref "htmlEditor"');
			}

			return rootRef;
		},

		isMissingHtmlTags() {
			const zerothSection = this.sections.at(0);

			return (
				!zerothSection?.content.trim().startsWith('<html') &&
				!zerothSection?.content.trim().endsWith('</html>')
			);
		},

		async format() {
			if (this.sections.length === 1 && this.isMissingHtmlTags()) {
				const zerothSection = this.sections.at(0) as Section;

				const formatted = (
					await format(zerothSection.content, {
						parser: 'html',
						plugins: [htmlParser],
					})
				).trim();

				return this.editor.dispatch({
					changes: { from: 0, to: this.doc.length, insert: formatted },
				});
			}

			const formatted = [];

			for (const { kind, content } of this.sections) {
				if (kind === 'style') {
					const formattedStyle = await format(content, {
						parser: 'css',
						plugins: [cssParser],
					});

					formatted.push(`<style>\n${formattedStyle}</style>`);
				}

				if (kind === 'script') {
					const formattedScript = await format(content, {
						parser: 'babel',
						plugins: [jsParser, estree],
					});

					formatted.push(`<script>\n${formattedScript}<` + '/script>');
					// typing the closing script tag in full causes ESLint, Prettier and Vite to crash
				}

				if (kind === 'html') {
					const match = content.match(/(?<pre>[\s\S]*<html[\s\S]*?>)(?<rest>[\s\S]*)/);

					if (!match?.groups?.pre || !match.groups?.rest) continue;

					// Prettier cannot format pre-HTML section, e.g. <!DOCTYPE html>, so keep as is

					const { pre, rest } = match.groups;

					const formattedRest = await format(rest, {
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
});
</script>

<style lang="scss" module>
.editor {
	height: 100%;

	& > div {
		height: 100%;
	}
}
</style>
