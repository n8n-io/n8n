import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

// @TODO: Dedup

export const EXPRESSION_EDITOR_THEME = [
	EditorView.theme({
		'&': {
			maxHeight: '112px',
			width: '100%',
			minHeight: '30px',
			fontSize: 'var(--font-size-2xs)',
			padding: '0 0 0 var(--spacing-2xs)',
			borderWidth: 'var(--border-width-base)',
			borderStyle: 'var(--input-border-style, var(--border-style-base))',
			borderColor: 'var(--input-border-color, var(--border-color-base))',
			borderRadius: 'var(--input-border-radius, var(--border-radius-base))',
			borderTopLeftRadius: '0',
			borderBottomLeftRadius: '0',
			backgroundColor: '#ffffff',
		},
		'&.cm-focused': {
			borderColor: 'var(--color-secondary)',
			outline: 'unset !important',
			borderBottomRightRadius: '0',
		},
		'.cm-scroller': {
			lineHeight: '1.6',
		},
		'.cm-content': {
			fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
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
