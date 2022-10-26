import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

const BASE_STYLING = {
	fontSize: '0.8em',
	fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
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

/**
 * Based on Tomorrow theme by Chris Kempson
 * https://github.com/vadimdemedes/thememirror/blob/main/source/themes/tomorrow.ts
 */
const LIGHT_THEME = {
	type: 'light',
	colors: {
		background: '#FFFFFF',
		foreground: '#4D4D4C',
		caret: '#AEAFAD',
		selection: '#D6D6D6',
		gutterBackground: '#FFFFFF',
		gutterForeground: '#4D4D4C80',
		lineHighlight: '#EFEFEF',
	},
	highlight_styling: [
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
	],
} as const;

/**
 * Based on Dracula theme by Zeno Rocha
 * https://github.com/vadimdemedes/thememirror/blob/main/source/themes/dracula.ts
 */
const DARK_THEME = {
	type: 'dark',
	colors: {
		background: '#222020',
		foreground: '#f8f8f2',
		caret: '#f8f8f0',
		selection: '#312b25',
		gutterBackground: '#2d2a26',
		gutterForeground: '#818080',
		lineHighlight: '#312b25',
	},
	highlight_styling: [
		{
			tag: tags.comment,
			color: '#6272a4',
		},
		{
			tag: [tags.string, tags.special(tags.brace)],
			color: '#f1fa8c',
		},
		{
			tag: [tags.number, tags.self, tags.bool, tags.null],
			color: '#bd93f9',
		},
		{
			tag: [tags.keyword, tags.operator],
			color: '#ff79c6',
		},
		{
			tag: [tags.definitionKeyword, tags.typeName],
			color: '#8be9fd',
		},
		{
			tag: tags.definition(tags.typeName),
			color: '#f8f8f2',
		},
		{
			tag: [
				tags.className,
				tags.definition(tags.propertyName),
				tags.function(tags.variableName),
				tags.attributeName,
			],
			color: '#50fa7b',
		},
	],
} as const;

type ITheme = typeof LIGHT_THEME | typeof DARK_THEME;

const getThemeExtension = (theme: ITheme) => EditorView.theme({
	'&': {
		backgroundColor: theme.colors.background,
		color: theme.colors.foreground,
	},
	'.cm-content': {
		caretColor: theme.colors.caret,
	},
	'.cm-cursor, .cm-dropCursor': {
		borderLeftColor: theme.colors.caret,
	},
	'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection': {
		backgroundColor: theme.colors.selection,
	},
	'.cm-activeLine': {
		backgroundColor: theme.colors.lineHighlight,
	},
	'.cm-gutters': {
		backgroundColor: theme.colors.gutterBackground,
		color: theme.colors.gutterForeground,
	},
	'.cm-activeLineGutter': {
		backgroundColor: theme.colors.lineHighlight,
	},
}, { dark: theme.type === 'dark' });

const getSyntaxHighlighting = (theme: ITheme) => syntaxHighlighting(HighlightStyle.define(theme.highlight_styling, { themeType: theme.type }));

const cssStyleDeclaration = getComputedStyle(document.documentElement);

export const CODE_NODE_EDITOR_THEME = {
	BASE_THEME: EditorView.baseTheme({
		'&': {
			'font-size': BASE_STYLING.fontSize,
			border: cssStyleDeclaration.getPropertyValue('--border-base'),
			borderRadius: cssStyleDeclaration.getPropertyValue('--border-radius-base'),
		},
		'.cm-content': {
			fontFamily: BASE_STYLING.fontFamily,
		},
		'.cm-tooltip': {
			maxWidth: BASE_STYLING.tooltip.maxWidth,
			lineHeight: BASE_STYLING.tooltip.lineHeight,
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
	LIGHT_THEME: [
		getThemeExtension(LIGHT_THEME),
		getSyntaxHighlighting(LIGHT_THEME),
	],
	DARK_THEME: [
		getThemeExtension(DARK_THEME),
		getSyntaxHighlighting(DARK_THEME),
	],
};
