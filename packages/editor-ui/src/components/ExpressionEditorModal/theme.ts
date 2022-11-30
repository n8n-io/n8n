import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

export const SYNTAX_HIGHLIGHTING_CLASSES = {
	validResolvable: 'cm-valid-resolvable',
	invalidResolvable: 'cm-invalid-resolvable',
	brokenResolvable: 'cm-broken-resolvable',
	plaintext: 'cm-plaintext',
};

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
				class: SYNTAX_HIGHLIGHTING_CLASSES.plaintext,
			},
			{
				tag: tags.className,
				class: SYNTAX_HIGHLIGHTING_CLASSES.brokenResolvable,
			},
			/**
			 * Resolvables are dynamically styled with
			 * `cm-valid-resolvable` and `cm-invalid-resolvable`
			 */
		]),
	),
];

export const DYNAMICALLY_STYLED_RESOLVABLES_THEME = EditorView.theme({
	['.' + SYNTAX_HIGHLIGHTING_CLASSES.validResolvable]: {
		color: 'var(--color-valid-resolvable-foreground)',
		backgroundColor: 'var(--color-valid-resolvable-background)',
	},
	['.' + SYNTAX_HIGHLIGHTING_CLASSES.invalidResolvable]: {
		color: 'var(--color-invalid-resolvable-foreground)',
		backgroundColor: 'var(--color-invalid-resolvable-background)',
	},
});
