import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

// @TODO: Dedup after review

const BASE_STYLING = {
	fontSize: '0.8em',
	fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
	maxHeight: '200px',
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

export const EXPRESSION_EDITOR_THEME = [
	EditorView.theme({
		'.cm-content': {
			fontFamily: BASE_STYLING.fontFamily,
			// height: BASE_STYLING.maxHeight,
		},
	}),
	syntaxHighlighting(
		HighlightStyle.define([
			{
				tag: tags.content,
				class: 'plaintext',
			},
			{
				tag: tags.string,
				class: 'resolvable',
			},
		]),
	),
];
