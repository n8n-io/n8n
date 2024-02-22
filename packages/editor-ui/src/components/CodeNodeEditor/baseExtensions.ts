import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
	type KeyBinding,
} from '@codemirror/view';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { acceptCompletion, selectedCompletion } from '@codemirror/autocomplete';
import {
	history,
	indentLess,
	indentMore,
	insertNewlineAndIndent,
	toggleComment,
	redo,
	deleteCharBackward,
	undo,
} from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { type Extension, Prec } from '@codemirror/state';

import { codeInputHandler } from '@/plugins/codemirror/inputHandlers/code.inputHandler';

export const readOnlyEditorExtensions: readonly Extension[] = [
	lineNumbers(),
	EditorView.lineWrapping,
	highlightSpecialChars(),
];

export const tabKeyMap: KeyBinding[] = [
	{
		any(editor, event) {
			if (event.key === 'Tab' || (event.key === 'Escape' && selectedCompletion(editor.state))) {
				event.stopPropagation();
			}

			return false;
		},
	},
	{
		key: 'Tab',
		run: (editor) => {
			if (selectedCompletion(editor.state)) {
				return acceptCompletion(editor);
			}

			return indentMore(editor);
		},
	},
	{ key: 'Shift-Tab', run: indentLess },
];

export const enterKeyMap: KeyBinding[] = [
	{
		key: 'Enter',
		run: (editor) => {
			if (selectedCompletion(editor.state)) {
				return acceptCompletion(editor);
			}

			return insertNewlineAndIndent(editor);
		},
	},
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
	Prec.highest(
		keymap.of([
			...tabKeyMap,
			...enterKeyMap,
			{ key: 'Mod-/', run: toggleComment },
			{ key: 'Mod-z', run: undo },
			{ key: 'Mod-Shift-z', run: redo },
			{ key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
		]),
	),
];
