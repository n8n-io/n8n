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
	deleteCharBackward,
} from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';

import { codeInputHandler } from '@/plugins/codemirror/inputHandlers/code.inputHandler';

export const readOnlyEditorExtensions: readonly Extension[] = [
	lineNumbers(),
	EditorView.lineWrapping,
	highlightSpecialChars(),
];

export const writableEditorExtensions: readonly Extension[] = [
	history(),
	lintGutter(),
	foldGutter(),
	codeInputHandler(),
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	highlightActiveLine(),
	highlightActiveLineGutter(),
	keymap.of([
		{ key: 'Enter', run: insertNewlineAndIndent },
		{ key: 'Tab', run: acceptCompletion },
		{ key: 'Enter', run: acceptCompletion },
		{ key: 'Mod-/', run: toggleComment },
		{ key: 'Mod-Shift-z', run: redo },
		{ key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
		indentWithTab,
	]),
];
