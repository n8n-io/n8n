import { EditorView } from '@codemirror/view';
import { highlighter } from '@/features/shared/editors/plugins/codemirror/resolvableHighlighter';

const commonThemeProps = (isReadOnly = false) => ({
	'&.cm-focused': {
		outline: '0 !important',
	},
	'.cm-content': {
		fontFamily: 'var(--font-family--monospace)',
		color: 'var(--n8n-input--color--text, var(--color--text--shade-1))',
		caretColor: isReadOnly ? 'transparent' : 'var(--code--caret--color)',
	},
	'.cm-line': {
		padding: '0',
	},
});

export const inputTheme = ({ rows, isReadOnly } = { rows: 5, isReadOnly: false }) => {
	const maxHeight = Math.max(rows * 22 + 8);
	const theme = EditorView.theme({
		...commonThemeProps(isReadOnly),
		'&': {
			maxHeight: `${maxHeight}px`,
			minHeight: 'var(--height--md)',
			width: '100%',
			fontSize: 'var(--font-size--2xs)',
			padding: '0 0 0 var(--spacing--2xs)',
			borderWidth: 'var(--border-width)',
			borderStyle: 'var(--n8n-input--border-style, var(--border-style))',
			borderColor: 'var(--n8n-input--border-color, var(--border-color))',
			borderRightColor:
				'var(--n8n-input--border-right-color,var(--n8n-input--border-color, var(--border-color)))',
			borderBottomColor:
				'var(--n8n-input--border-bottom-color,var(--n8n-input--border-color, var(--border-color)))',
			borderRadius: 'var(--n8n-input--radius, var(--radius))',
			borderTopLeftRadius: 0,
			borderTopRightRadius:
				'var(--n8n-input-triple--radius--top-right, var(--n8n-input--radius, var(--radius)))',
			borderBottomLeftRadius: 0,
			borderBottomRightRadius:
				'var(--n8n-input-triple--radius--bottom-right, var(--n8n-input--radius, var(--radius)))',
			backgroundColor: 'white',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--code--caret--color)',
		},
		'.cm-scroller': {
			lineHeight: '1.68',
		},
		'.cm-lineWrapping': {
			wordBreak: 'break-all',
		},
	});

	return [theme, highlighter.resolvableStyle];
};

export const outputTheme = () => {
	const theme = EditorView.theme({
		...commonThemeProps(true),
		'&': {
			maxHeight: '95px',
			width: '100%',
			fontSize: 'var(--font-size--2xs)',
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
