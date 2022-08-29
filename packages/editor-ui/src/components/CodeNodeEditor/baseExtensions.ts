import {
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
} from '@codemirror/view';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { history, indentWithTab } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';

export const BASE_EXTENSIONS = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	lintGutter(),
	drawSelection(),
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	highlightActiveLine(),
	keymap.of([indentWithTab]),
	EditorView.lineWrapping,
];
