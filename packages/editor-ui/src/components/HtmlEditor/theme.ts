import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

export const theme = [
	EditorView.theme({
		'&': {
			'font-size': '0.8em',
			border: 'var(--border-base)',
			borderRadius: 'var(--border-radius-base)',
			backgroundColor: 'var(--color-code-background)',
			color: 'var(--color-code-foreground)',
		},
		'.cm-content': {
			fontFamily: "Menlo, Consolas, 'DejaVu Sans Mono', monospace !important",
			caretColor: 'var(--color-code-caret)',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--color-code-caret)',
		},
		'&.cm-focused .cm-selectionBackgroundm .cm-selectionBackground, .cm-content ::selection': {
			backgroundColor: 'var(--color-code-selection)',
		},
		'.cm-activeLine': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-activeLineGutter': {
			backgroundColor: 'var(--color-code-lineHighlight)',
		},
		'.cm-gutters': {
			backgroundColor: 'var(--color-code-gutterBackground)',
			color: 'var(--color-code-gutterForeground)',
		},
		'.cm-scroller': {
			overflow: 'auto',
			maxHeight: '350px',
		},
	}),
	syntaxHighlighting(
		HighlightStyle.define([
			{ tag: tags.keyword, color: '#c678dd' },
			{
				tag: [tags.name, tags.deleted, tags.character, tags.propertyName, tags.macroName],
				color: '#e06c75',
			},
			{ tag: [tags.function(tags.variableName), tags.labelName], color: '#61afef' },
			{ tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#d19a66' },
			{ tag: [tags.definition(tags.name), tags.separator], color: '#abb2bf' },
			{
				tag: [
					tags.typeName,
					tags.className,
					tags.number,
					tags.changed,
					tags.annotation,
					tags.modifier,
					tags.self,
					tags.namespace,
				],
				color: '#e06c75',
			},
			{
				tag: [
					tags.operator,
					tags.operatorKeyword,
					tags.url,
					tags.escape,
					tags.regexp,
					tags.link,
					tags.special(tags.string),
				],
				color: '#56b6c2',
			},
			{ tag: [tags.meta, tags.comment], color: '#7d8799' },
			{ tag: tags.strong, fontWeight: 'bold' },
			{ tag: tags.emphasis, fontStyle: 'italic' },
			{ tag: tags.strikethrough, textDecoration: 'line-through' },
			{ tag: tags.link, color: '#7d8799', textDecoration: 'underline' },
			{ tag: tags.heading, fontWeight: 'bold', color: '#e06c75' },
			{ tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#d19a66' },
			{ tag: [tags.processingInstruction, tags.string, tags.inserted], color: '#98c379' },
			{ tag: tags.invalid, color: 'red', 'font-weight': 'bold' },
		]),
	),
];
