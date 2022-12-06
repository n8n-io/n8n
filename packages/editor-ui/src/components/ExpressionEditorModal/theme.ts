import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

// @TODO: Deduplicate

export const EXPRESSION_EDITOR_THEME = [
	EditorView.theme({
		'&': {
			borderWidth: 'var(--border-width-base)',
			borderStyle: 'var(--input-border-style, var(--border-style-base))',
			borderColor: 'var(--input-border-color, var(--border-color-base))',
			borderRadius: 'var(--input-border-radius, var(--border-radius-base))',
			backgroundColor: 'var(--color-expression-editor-background)',
		},
		'&.cm-focused': {
			borderColor: 'var(--color-secondary)',
			outline: 'unset !important',
		},
		'.cm-content': {
			fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
			height: '220px',
			padding: 'var(--spacing-xs)',
			color: 'var(--input-font-color, var(--color-text-dark))',
		},
		'.cm-line': {
			padding: '0',
		},
	}),
	syntaxHighlighting(
		HighlightStyle.define([
			{
				tag: tags.content,
				class: highlighter.SYNTAX_HIGHLIGHTING_CSS_CLASSES.plaintext,
			},
			{
				tag: tags.className,
				class: highlighter.SYNTAX_HIGHLIGHTING_CSS_CLASSES.brokenResolvable,
			},
			// resolvables dynamically styled
		]),
	),
];
