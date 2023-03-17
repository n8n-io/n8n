import {
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
import {
	history,
	indentWithTab,
	insertNewlineAndIndent,
	toggleComment,
	redo,
} from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';

import { codeInputHandler } from '@/plugins/codemirror/inputHandlers/code.inputHandler';

export const baseExtensions = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	lintGutter(),
	codeInputHandler(),
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	highlightActiveLine(),
	keymap.of([
		{ key: 'Enter', run: insertNewlineAndIndent },
		{ key: 'Tab', run: acceptCompletion },
		{ key: 'Enter', run: acceptCompletion },
		{ key: 'Mod-/', run: toggleComment },
		{ key: 'Mod-Shift-z', run: redo },
		indentWithTab,
	]),
	EditorView.lineWrapping,
];
