import { CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID } from '@/constants';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView, tooltips } from '@codemirror/view';
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
	fontFamily: 'var(--font-family--monospace)',
	maxHeight: '400px',
	tooltip: {
		maxWidth: '250px',
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
	maxHeight?: string;
	minHeight?: string;
	rows?: number;
}

const codeEditorSyntaxHighlighting = syntaxHighlighting(
	HighlightStyle.define([
		{ tag: tags.keyword, color: 'var(--color-code-tags-keyword)' },
		{
			tag: [
				tags.deleted,
				tags.character,
				tags.macroName,
				tags.definition(tags.name),
				tags.definition(tags.variableName),
				tags.atom,
				tags.bool,
			],
			color: 'var(--color-code-tags-variable)',
		},
		{ tag: [tags.name, tags.propertyName], color: 'var(--color-code-tags-property)' },
		{
			tag: [tags.processingInstruction, tags.string, tags.inserted, tags.special(tags.string)],
			color: 'var(--color-code-tags-string)',
		},
		{
			tag: [tags.function(tags.variableName), tags.labelName],
			color: 'var(--color-code-tags-function)',
		},
		{
			tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
			color: 'var(--color-code-tags-constant)',
		},
		{ tag: [tags.className], color: 'var(--color-code-tags-class)' },
		{
			tag: [tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace],
			color: 'var(--color-code-tags-primitive)',
		},
		{ tag: [tags.typeName], color: 'var(--color-code-tags-type)' },
		{ tag: [tags.operator, tags.operatorKeyword], color: 'var(--color-code-tags-keyword)' },
		{
			tag: [tags.url, tags.escape, tags.regexp, tags.link],
			color: 'var(--color-code-tags-keyword)',
		},
		{ tag: [tags.meta, tags.comment, tags.lineComment], color: 'var(--color-code-tags-comment)' },
		{ tag: tags.strong, fontWeight: 'bold' },
		{ tag: tags.emphasis, fontStyle: 'italic' },
		{ tag: tags.link, textDecoration: 'underline' },
		{ tag: tags.heading, fontWeight: 'bold', color: 'var(--color-code-tags-heading)' },
		{ tag: tags.invalid, color: 'var(--color-code-tags-invalid)' },
		{ tag: tags.strikethrough, textDecoration: 'line-through' },
		{
			tag: [tags.derefOperator, tags.special(tags.variableName), tags.variableName, tags.separator],
			color: 'var(--color-code-foreground)',
		},
	]),
);

export const codeEditorTheme = ({ isReadOnly, minHeight, maxHeight, rows }: ThemeSettings) => [
	EditorView.theme({
		'&': {
			'font-size': BASE_STYLING.fontSize,
			border: 'var(--border)',
			borderRadius: 'var(--radius)',
			backgroundColor: 'var(--color-code-background)',
			color: 'var(--color-code-foreground)',
			height: '100%',
		},
		'.cm-content': {
			fontFamily: BASE_STYLING.fontFamily,
			caretColor: isReadOnly ? 'transparent' : 'var(--color-code-caret)',
			lineHeight: 'var(--line-height--xl)',
			paddingTop: 'var(--spacing--2xs)',
			paddingBottom: 'var(--spacing--sm)',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--color-code-caret)',
		},
		'&.cm-focused > .cm-scroller .cm-selectionLayer > .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
			{
				background: 'var(--color-code-selection)',
			},
		'&.cm-editor': {
			...(isReadOnly ? { backgroundColor: 'var(--color-code-background-readonly)' } : {}),
			borderColor: 'var(--border-color)',
			overflow: 'hidden',
		},
		'&.cm-editor.cm-focused': {
			outline: 'none',
			borderColor: 'var(--color--secondary)',
		},
		'.cm-activeLine': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-activeLineGutter': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-lineNumbers .cm-activeLineGutter': {
			color: 'var(--color-code-gutter-foreground-active)',
		},
		'.cm-gutters': {
			backgroundColor: isReadOnly
				? 'var(--color-code-background-readonly)'
				: 'var(--color-code-gutter-background)',
			color: 'var(--color-code-gutter-foreground)',
			border: '0',
			borderRadius: 'var(--radius)',
		},
		'.cm-gutterElement': {
			padding: 0,
		},
		'.cm-tooltip': {
			maxWidth: BASE_STYLING.tooltip.maxWidth,
			lineHeight: BASE_STYLING.tooltip.lineHeight,
		},
		'.cm-scroller': {
			overflow: 'auto',
			maxHeight: maxHeight ?? '100%',
			...(isReadOnly
				? {}
				: {
						minHeight: rows && rows !== -1 ? `${Number(rows + 1) * 1.3}em` : 'auto',
					}),
		},
		'.cm-lineNumbers .cm-gutterElement': {
			padding: '0 var(--spacing--5xs) 0 var(--spacing--2xs)',
		},
		'.cm-gutter,.cm-content': {
			minHeight: rows && rows !== -1 ? 'auto' : (minHeight ?? 'calc(35vh - var(--spacing--2xl))'),
		},
		'.cm-foldGutter': {
			width: '16px',
		},
		'.cm-fold-marker': {
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			height: '100%',
			opacity: 0,
			transition: 'opacity 0.3s ease',
		},
		'.cm-activeLineGutter .cm-fold-marker, .cm-gutters:hover .cm-fold-marker': {
			opacity: 1,
		},
		'.cm-diagnosticAction': {
			backgroundColor: BASE_STYLING.diagnosticButton.backgroundColor,
			color: 'var(--color--primary)',
			lineHeight: BASE_STYLING.diagnosticButton.lineHeight,
			textDecoration: BASE_STYLING.diagnosticButton.textDecoration,
			marginLeft: BASE_STYLING.diagnosticButton.marginLeft,
			cursor: BASE_STYLING.diagnosticButton.cursor,
		},
		'.cm-diagnostic-error': {
			backgroundColor: 'var(--color-infobox-background)',
		},
		'.cm-diagnosticText': {
			fontSize: 'var(--font-size--xs)',
			color: 'var(--color--text)',
		},
		'.cm-diagnosticDocs': {
			fontSize: 'var(--font-size--2xs)',
		},
		'.cm-foldPlaceholder': {
			color: 'var(--color--text)',
			backgroundColor: 'var(--color--background)',
			border: 'var(--border)',
		},
		'.cm-lintRange-error': {
			backgroundImage:
				"url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3e%3cpath d='m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0' stroke='%23F56565' fill='none' stroke-width='.7'/%3e%3c/svg%3e\") !important", // #F56565 is --color--text--danger
		},
		'.cm-selectionMatch': {
			background: 'var(--color-code-selection-highlight)',
		},
		'.cm-selectionMatch-main': {
			background: 'var(--color-code-selection-highlight)',
		},
		'.cm-matchingBracket': {
			background: 'var(--color-code-selection)',
		},
		'.cm-completionMatchedText': {
			textDecoration: 'none',
			fontWeight: '600',
			color: 'var(--color-autocomplete-item-selected)',
		},
		'.cm-faded > span': {
			opacity: 0.6,
		},
		'.cm-panel.cm-search': {
			padding: 'var(--spacing--4xs) var(--spacing--2xs)',
		},
		'.cm-panels': {
			background: 'var(--color--background--light-2)',
			color: 'var(--color--text)',
		},
		'.cm-panels-bottom': {
			borderTop: 'var(--border)',
		},
		'.cm-textfield': {
			color: 'var(--color--text--shade-1)',
			background: 'var(--color--foreground--tint-2)',
			borderRadius: 'var(--radius)',
			border: 'var(--border)',
			fontSize: '90%',
		},
		'.cm-textfield:focus': {
			outline: 'none',
			borderColor: 'var(--color--secondary)',
		},
		'.cm-panel button': {
			color: 'var(--color--text)',
		},
		'.cm-panel input[type="checkbox"]': {
			border: 'var(--border)',
			outline: 'none',
		},
		'.cm-panel input[type="checkbox"]:hover': {
			border: 'var(--border)',
			outline: 'none',
		},
		'.cm-panel.cm-search label': {
			fontSize: '90%',
			display: 'inline',
		},
		'.cm-button': {
			outline: 'none',
			border: 'var(--border)',
			color: 'var(--color--text--shade-1)',
			backgroundColor: 'var(--color--foreground--tint-2)',
			backgroundImage: 'none',
			borderRadius: 'var(--radius)',
			fontSize: '90%',
		},
	}),
	codeEditorSyntaxHighlighting,
	tooltips({
		parent: document.getElementById(CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID) ?? undefined,
	}),
];
