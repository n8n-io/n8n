import { EditorView } from '@codemirror/view';
import { highlighter } from '@/plugins/codemirror/resolvableHighlighter';

const commonThemeProps = (isReadOnly = false) => ({
	'&': {
		borderWidth: 'var(--border-width-base)',
		borderStyle: 'var(--input-border-style, var(--border-style-base))',
		borderColor: 'var(--input-border-color, var(--border-color-base))',
		borderRadius: 'var(--input-border-radius, var(--border-radius-base))',
		backgroundColor: 'var(--color-expression-editor-background)',
	},
	'.cm-cursor, .cm-dropCursor': {
		borderLeftColor: 'var(--color-code-caret)',
	},
	'&.cm-editor': {
		overflow: 'hidden',
	},
	'&.cm-focused': {
		borderColor: 'var(--color-secondary)',
		outline: '0 !important',
	},
	'.cm-content': {
		fontFamily: 'var(--font-family-monospace)',
		padding: 'var(--spacing-xs)',
		color: 'var(--input-font-color, var(--color-text-dark))',
		caretColor: isReadOnly ? 'transparent' : 'var(--color-code-caret)',
	},
	'.cm-line': {
		padding: '0',
	},
});

export const inputTheme = (isReadOnly = false) => {
	const theme = EditorView.theme(commonThemeProps(isReadOnly));

	return [theme, highlighter.resolvableStyle];
};

export const outputTheme = () => {
	const theme = EditorView.theme({
		...commonThemeProps(true),
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
