import { history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { lintGutter } from '@codemirror/lint';
import { type Extension, Prec } from '@codemirror/state';
import {
	dropCursor,
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	highlightSpecialChars,
	keymap,
	lineNumbers,
} from '@codemirror/view';

import { codeInputHandler } from '@/plugins/codemirror/inputHandlers/code.inputHandler';
import { editorKeymap } from '@/plugins/codemirror/keymap';

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
	Prec.highest(keymap.of(editorKeymap)),
];
