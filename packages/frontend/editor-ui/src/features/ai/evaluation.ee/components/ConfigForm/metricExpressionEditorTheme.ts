import { EditorView } from '@codemirror/view';
import { highlighter } from '@/features/shared/editors/plugins/codemirror/resolvableHighlighter';

type ThemeOptions = {
	rows?: number;
	isReadOnly?: boolean;
};

export const inputTheme = ({ rows = 3, isReadOnly = false }: ThemeOptions = {}) => {
	const minHeight = Math.max(rows * 22 + 8, 30);
	const theme = EditorView.theme({
		'&': {
			minHeight: `${minHeight}px`,
			width: '100%',
			fontSize: 'var(--font-size--2xs)',
			borderWidth: 'var(--border-width)',
			borderStyle: 'var(--border-style)',
			borderColor: 'var(--input--border-color, var(--border-color))',
			borderRadius: 'var(--input--radius, var(--radius))',
			backgroundColor: 'var(--expression-editor--color--background, var(--color--background))',
		},
		'&.cm-focused': {
			borderColor: 'var(--color--secondary)',
			outline: '0 !important',
		},
		'.cm-content': {
			fontFamily: 'var(--font-family--monospace)',
			padding: 'var(--spacing--2xs)',
			color: 'var(--input--color--text, var(--color--text--shade-1))',
			caretColor: isReadOnly ? 'transparent' : 'var(--code--caret--color)',
		},
		'.cm-cursor, .cm-dropCursor': {
			borderLeftColor: 'var(--code--caret--color)',
		},
		'.cm-scroller': {
			lineHeight: '1.6',
		},
		'.cm-line': {
			padding: '0',
		},
		'.cm-lineWrapping': {
			wordBreak: 'break-word',
		},
	});

	return [theme, highlighter.resolvableStyle];
};
