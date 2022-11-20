import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// @TODO: Dedup after review

const BASE_STYLING = {
	fontSize: '0.8em',
	fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
	// maxHeight: '200px',
	tooltip: {
		maxWidth: '100px',
		lineHeight: '1.3em',
	},
	diagnosticButton: {
		backgroundColor: 'inherit',
		lineHeight: '1em',
		textDecoration: 'underline',
		marginLeft: '0.2em',
		cursor: 'pointer',
	},
};

export const SYNTAX_HIGHLIGHTING_CLASSES = {
	validResolvable: 'cm-valid-resolvable',
	invalidResolvable: 'cm-invalid-resolvable',
	brokenResolvable: 'cm-broken-resolvable',
	plaintext: 'cm-plaintext',
};

export const EXPRESSION_EDITOR_THEME = [
	EditorView.theme({
		'&': {
			maxHeight: '112px',
			fontSize: BASE_STYLING.fontSize,
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
			fontFamily: BASE_STYLING.fontFamily,
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
				class: SYNTAX_HIGHLIGHTING_CLASSES.plaintext,
			},
			{
				tag: tags.className,
				class: SYNTAX_HIGHLIGHTING_CLASSES.brokenResolvable,
			},
			/**
			 * Resolvables are dynamically highlighted with
			 * `cm-valid-resolvable` and `cm-invalid-resolvable`
			 */
		]),
	),
];

export const DYNAMICALLY_HIGHLIGHTED_RESOLVABLES_THEME = EditorView.theme({
	['.' + SYNTAX_HIGHLIGHTING_CLASSES.validResolvable]: {
		color: '#29a568',
		backgroundColor: '#e1f3d8',
	},
	['.' + SYNTAX_HIGHLIGHTING_CLASSES.invalidResolvable]: {
		color: '#f45959',
		backgroundColor: '#fef0f0',
	},
});
