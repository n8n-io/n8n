import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

// @TODO: Clean up and dedup

export const EXPRESSION_EDITOR_THEME = [
	EditorView.theme({
		'&': {
			maxHeight: '95px',
			width: '100%',
			fontSize: 'var(--font-size-2xs)',
			padding: '0',
			borderWidth: 'var(--border-width-base)',
			// borderStyle: 'var(--input-border-style, var(--border-style-base))',
			// borderColor: 'var(--input-border-color, var(--border-color-base))',
			// borderRadius: 'var(--input-border-radius, var(--border-radius-base))',
			borderTopLeftRadius: '0',
			borderBottomLeftRadius: '0',
			backgroundColor: '#ffffff',
		},
		'&.cm-focused': {
			// borderColor: 'var(--color-secondary)',
			outline: '0 !important',
			// borderBottomRightRadius: '0',
		},
		'.cm-scroller': {
			lineHeight: '1.6',
			// lineHeight: '0.875rem',
		},
		'.cm-content': {
			fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
			// height: '220px',
			// padding: '12px', // var(--spacing-xs)
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
