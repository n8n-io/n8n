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
import { acceptCompletion } from '@codemirror/autocomplete';
import { history, indentWithTab, insertNewlineAndIndent } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';

export const BASE_EXTENSIONS = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	lintGutter(),
	// closeBrackets(), // @TODO: interferes with autocompletions
	drawSelection(),
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	highlightActiveLine(),
	keymap.of([
		{ key: "Enter", run: insertNewlineAndIndent },
		{ key: 'Tab', run: acceptCompletion },
		{ key: 'Enter', run: acceptCompletion },
		indentWithTab,
	]),
	EditorView.lineWrapping,
];
