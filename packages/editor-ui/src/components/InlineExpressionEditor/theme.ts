import { EditorView } from '@codemirror/view';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

const commonThemeProps = {
	'&.cm-focused': {
		outline: '0 !important',
	},
	'.cm-content': {
		fontFamily: 'var(--font-family-monospace)',
		color: 'var(--input-font-color, var(--color-text-dark))',
	},
	'.cm-line': {
		padding: '0',
	},
};

export const inputTheme = ({ isSingleLine } = { isSingleLine: false }) => {
	const theme = EditorView.theme({
		...commonThemeProps,
		'&': {
			maxHeight: isSingleLine ? '30px' : '112px',
			minHeight: '30px',
			width: '100%',
			fontSize: 'var(--font-size-2xs)',
			padding: '0 0 0 var(--spacing-2xs)',
			borderWidth: 'var(--border-width-base)',
			borderStyle: 'var(--input-border-style, var(--border-style-base))',
			borderColor: 'var(--input-border-color, var(--border-color-base))',
			borderRadius: 'var(--input-border-radius, var(--border-radius-base))',
			borderTopLeftRadius: '0',
			borderBottomLeftRadius: '0',
			backgroundColor: 'white',
		},
		'.cm-scroller': {
			lineHeight: '1.68',
		},
	});

	return [theme, highlighter.resolvableStyle];
};

export const outputTheme = () => {
	const theme = EditorView.theme({
		...commonThemeProps,
		'&': {
			maxHeight: '95px',
			width: '100%',
			fontSize: 'var(--font-size-2xs)',
			padding: '0',
			borderTopLeftRadius: '0',
			borderBottomLeftRadius: '0',
			backgroundColor: 'white',
		},
		'.cm-scroller': {
			lineHeight: '1.6',
		},
		'.cm-valid-resolvable': {
			padding: '0 2px',
			borderRadius: '2px',
		},
		'.cm-invalid-resolvable': {
			padding: '0 2px',
			borderRadius: '2px',
		},
	});

	return [theme, highlighter.resolvableStyle];
};
