import type { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import * as icons from './icons';

export const editorTheme: Extension = [
	EditorView.theme({
		'&': {
			fontFamily: 'var(--font-family-monospace)',
			fontSize: 'var(--font-size-s)',
			background: '#fff',
		},
		'.cm-foldPlaceholder': {
			background: 'transparent',
			border: 'none',
		},
		'.cm-tooltip': {
			maxWidth: '800px',
			display: 'flex',
			flexDirection: 'column',
		},
		'.cm-tooltip-section': {
			order: '1',
		},
		'.cm-tooltip-lint': {
			order: '2',
		},
		'.cm-tooltip-section:not(:first-child)': {
			borderTop: 'none',
		},
		'.cm-tooltip-below': {
			marginTop: '5px',
		},
		'.cm-tooltip.cm-tooltip-autocomplete > ul': {
			minWidth: '250px',
		},
		'.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
			display: 'flex',
			alignItems: 'center',
			padding: '2px',
		},
		'.cm-completionMatchedText': {
			textDecoration: 'none',
			fontWeight: 600,
			color: '#00B4D4',
		},
		'.cm-completionDetail': {
			fontStyle: 'initial',
			color: '#ABABAB',
			marginLeft: '2rem',
		},
		'.cm-completionIcon': {
			padding: '0',
			marginRight: '4px',
			width: '16px',
			height: '16px',
			backgroundRepeat: 'no-repeat',
			backgroundImage: icons.snippetSymbol,
			'&:after': {
				content: "' '",
			},
			'&.cm-completionIcon-function, &.cm-completionIcon-method': {
				backgroundImage: icons.methodSymbol,
				'&:after': {
					content: "' '",
				},
			},
			'&.cm-completionIcon-property, &.cm-completionIcon-getter': {
				backgroundImage: icons.fieldSymbol,
				'&:after': {
					content: "' '",
				},
			},
			'&.cm-completionIcon-enum, &.cm-completionIcon-enum-member, &.cm-completionIcon-string': {
				backgroundImage: icons.constantSymbol,
				'&:after': {
					content: "' '",
				},
			},
			'&.cm-completionIcon-var, &.cm-completionIcon-let, &.cm-completionIcon-const': {
				backgroundImage: icons.variableSymbol,
				'&:after': {
					content: "' '",
				},
			},
			'&.cm-completionIcon-keyword': {
				backgroundImage: icons.keywordSymbol,
				'&:after': {
					content: "' '",
				},
			},
			'&.cm-completionIcon-class, &.cm-completionIcon-interface, &.cm-completionIcon-alias': {
				backgroundImage: icons.classSymbol,
				'&:after': {
					content: "' '",
				},
			},
		},

		'.cm-scroller': { overflow: 'auto' },
		'.cm-gutters': { background: '#fff' },
		'.cm-gutterElement': { color: '#cbd5e1' },
		'.cm-foldMarker': {
			color: '#94a3b8',
		},
		'.cm-activeLine, .cm-activeLineGutter': {
			background: '#f1f5f9',
		},
		'.cm-tooltip-autocomplete': {
			background: '#e2e8f0',
		},
		'.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
			background: '#cbd5e1',
			color: '#1e293b',
		},
		'.cm-diagnostic, .cm-quickinfo-tooltip': {
			background: '#e2e8f0',
			border: '1px solid #cbd5e1',
			color: '#1e293b',
			marginLeft: '0px',
			padding: '0.5rem',
		},
		'.cm-line': { color: '#1e293b' },
	}),
];
