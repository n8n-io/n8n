import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/**
 * Light theme based on Tomorrow theme by Chris Kempson
 * https://github.com/vadimdemedes/thememirror/blob/main/source/themes/tomorrow.ts
 *
 * Dark theme based on Dracula theme by Zeno Rocha
 * https://github.com/vadimdemedes/thememirror/blob/main/source/themes/dracula.ts
 */

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

interface ThemeSettings {
	isReadOnly?: boolean;
	customMaxHeight?: string;
	customMinHeight?: number;
}

export const codeNodeEditorTheme = ({
	isReadOnly,
	customMaxHeight,
	customMinHeight,
}: ThemeSettings) => [
	EditorView.theme({
		'&': {
			'font-size': BASE_STYLING.fontSize,
			border: 'var(--border-base)',
			borderRadius: 'var(--border-radius-base)',
			backgroundColor: 'var(--color-code-background)',
			color: 'var(--color-code-foreground)',
			height: '100%',
		},
		'.cm-content': {
			fontFamily: BASE_STYLING.fontFamily,
			caretColor: 'var(--color-code-caret)',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--color-code-caret)',
		},
		'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection': {
			backgroundColor: 'var(--color-code-selection)',
		},
		'&.cm-editor': {
			...(isReadOnly ? { backgroundColor: 'var(--color-code-background-readonly)' } : {}),
			borderColor: 'var(--border-color-base)',
		},
		'&.cm-editor.cm-focused': {
			outline: 'none',
			borderColor: 'var(--color-secondary)',
		},
		'.cm-activeLine': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-activeLineGutter': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-gutters': {
			backgroundColor: isReadOnly
				? 'var(--color-code-background-readonly)'
				: 'var(--color-code-gutterBackground)',
			color: 'var(--color-code-gutterForeground)',
			borderRadius: 'var(--border-radius-base)',
			borderRightColor: 'var(--border-color-base)',
		},
		'.cm-tooltip': {
			maxWidth: BASE_STYLING.tooltip.maxWidth,
			lineHeight: BASE_STYLING.tooltip.lineHeight,
		},
		'.cm-scroller': {
			overflow: 'auto',

			maxHeight: customMaxHeight ?? '100%',
			...(isReadOnly
				? {}
				: { minHeight: customMinHeight ? `${Number(customMinHeight) * 1.3}em` : '10em' }),
		},
		'.cm-diagnosticAction': {
			backgroundColor: BASE_STYLING.diagnosticButton.backgroundColor,
			color: 'var(--color-primary)',
			lineHeight: BASE_STYLING.diagnosticButton.lineHeight,
			textDecoration: BASE_STYLING.diagnosticButton.textDecoration,
			marginLeft: BASE_STYLING.diagnosticButton.marginLeft,
			cursor: BASE_STYLING.diagnosticButton.cursor,
		},
		'.cm-diagnostic-error': {
			backgroundColor: 'var(--color-background-base)',
		},
		'.cm-diagnosticText': {
			color: 'var(--color-text-base)',
		},
	}),
	syntaxHighlighting(
		HighlightStyle.define([
			{
				tag: tags.comment,
				color: 'var(--color-code-tags-comment)',
			},
			{
				tag: [tags.string, tags.special(tags.brace)],
				color: 'var(--color-code-tags-string)',
			},
			{
				tag: [tags.number, tags.self, tags.bool, tags.null],
				color: 'var(--color-code-tags-primitive)',
			},
			{
				tag: tags.keyword,
				color: 'var(--color-code-tags-keyword)',
			},
			{
				tag: tags.operator,
				color: 'var(--color-code-tags-operator)',
			},
			{
				tag: [
					tags.variableName,
					tags.propertyName,
					tags.attributeName,
					tags.regexp,
					tags.className,
					tags.typeName,
				],
				color: 'var(--color-code-tags-variable)',
			},
			{
				tag: [
					tags.definition(tags.typeName),
					tags.definition(tags.propertyName),
					tags.function(tags.variableName),
				],
				color: 'var(--color-code-tags-definition)',
			},
		]),
	),
];
