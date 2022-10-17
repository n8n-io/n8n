import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Based on Tomorrow theme by Chris Kempson
 * https://github.com/vadimdemedes/thememirror/blob/main/source/themes/tomorrow.ts
 */

const BASE_STYLING = {
	fontSize: '0.8em',
	fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
	background: '#FFFFFF',
	foreground: '#4D4D4C',
	caret: '#AEAFAD',
	selection: '#D6D6D6',
	gutterBackground: '#FFFFFF',
	gutterForeground: '#4D4D4C80',
	lineHighlight: '#EFEFEF',
	maxHeight: '400px',
	tooltip: {
		maxWidth: '300px',
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

const HIGHLIGHT_STYLING = [
	{
		tag: tags.comment,
		color: '#8E908C',
	},
	{
		tag: [tags.variableName, tags.self, tags.propertyName, tags.attributeName, tags.regexp],
		color: '#C82829',
	},
	{
		tag: [tags.number, tags.bool, tags.null],
		color: '#F5871F',
	},
	{
		tag: [tags.className, tags.typeName, tags.definition(tags.typeName)],
		color: '#C99E00',
	},
	{
		tag: [tags.string, tags.special(tags.brace)],
		color: '#718C00',
	},
	{
		tag: tags.operator,
		color: '#3E999F',
	},
	{
		tag: [tags.definition(tags.propertyName), tags.function(tags.variableName)],
		color: '#4271AE',
	},
	{
		tag: tags.keyword,
		color: '#8959A8',
	},
	{
		tag: tags.derefOperator,
		color: '#4D4D4C',
	},
];

const cssStyleDeclaration = getComputedStyle(document.documentElement);

export const CODE_NODE_EDITOR_THEME = [
	EditorView.theme({
		'&': {
			backgroundColor: BASE_STYLING.background,
			color: BASE_STYLING.foreground,
			'font-size': BASE_STYLING.fontSize,
			border: cssStyleDeclaration.getPropertyValue('--border-base'),
			borderRadius: cssStyleDeclaration.getPropertyValue('--border-radius-base'),
		},
		'.cm-content': {
			fontFamily: BASE_STYLING.fontFamily,
			caretColor: BASE_STYLING.caret,
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: BASE_STYLING.caret,
		},
		'.cm-tooltip': {
			maxWidth: BASE_STYLING.tooltip.maxWidth,
			lineHeight: BASE_STYLING.tooltip.lineHeight,
		},
		'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection': {
			backgroundColor: BASE_STYLING.selection,
		},
		'.cm-activeLine': {
			backgroundColor: BASE_STYLING.lineHighlight,
		},
		'.cm-gutters': {
			backgroundColor: BASE_STYLING.gutterBackground,
			color: BASE_STYLING.gutterForeground,
		},
		'.cm-activeLineGutter': {
			backgroundColor: BASE_STYLING.lineHighlight,
		},
		'.cm-scroller': {
			overflow: 'auto',
			maxHeight: BASE_STYLING.maxHeight,
		},
		'.cm-diagnosticAction': {
			backgroundColor: BASE_STYLING.diagnosticButton.backgroundColor,
			color: cssStyleDeclaration.getPropertyValue('--color-primary'),
			lineHeight: BASE_STYLING.diagnosticButton.lineHeight,
			textDecoration: BASE_STYLING.diagnosticButton.textDecoration,
			marginLeft: BASE_STYLING.diagnosticButton.marginLeft,
			cursor: BASE_STYLING.diagnosticButton.cursor,
		},
	}),
	syntaxHighlighting(HighlightStyle.define(HIGHLIGHT_STYLING)),
];
