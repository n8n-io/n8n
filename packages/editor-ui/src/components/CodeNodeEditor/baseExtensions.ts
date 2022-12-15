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
import { acceptCompletion, closeBrackets } from '@codemirror/autocomplete';
import {
	history,
	indentWithTab,
	insertNewlineAndIndent,
	toggleComment,
} from '@codemirror/commands';
import { lintGutter } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';

import { customInputHandler } from './inputHandler';

const [_, bracketState] = closeBrackets() as readonly Extension[];

export const baseExtensions = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	foldGutter(),
	lintGutter(),
	[customInputHandler, bracketState],
	dropCursor(),
	indentOnInput(),
	bracketMatching(),
	highlightActiveLine(),
	keymap.of([
		{ key: 'Enter', run: insertNewlineAndIndent },
		{ key: 'Tab', run: acceptCompletion },
		{ key: 'Enter', run: acceptCompletion },
		{ key: 'Mod-/', run: toggleComment },
		indentWithTab,
	]),
	EditorView.lineWrapping,
];
