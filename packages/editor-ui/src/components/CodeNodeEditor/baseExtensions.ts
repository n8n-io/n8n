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
import { history, toggleComment, deleteCharBackward } from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import { type Extension, Prec } from '@codemirror/state';

import { codeInputHandler } from '@/plugins/codemirror/inputHandlers/code.inputHandler';
import {
	autocompleteKeyMap,
	enterKeyMap,
	historyKeyMap,
	tabKeyMap,
} from '@/plugins/codemirror/keymap';

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
	Prec.highest(
		keymap.of([
			...tabKeyMap(),
			...enterKeyMap,
			...autocompleteKeyMap,
			...historyKeyMap,
			{ key: 'Mod-/', run: toggleComment },
			{ key: 'Backspace', run: deleteCharBackward, shift: deleteCharBackward },
		]),
	),
];
