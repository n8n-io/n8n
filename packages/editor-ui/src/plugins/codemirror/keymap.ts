import {
	acceptCompletion,
	completionStatus,
	moveCompletionSelection,
	selectedCompletion,
} from '@codemirror/autocomplete';
import { indentLess, indentMore, insertNewlineAndIndent, redo, undo } from '@codemirror/commands';
import type { EditorView, KeyBinding } from '@codemirror/view';

export const tabKeyMap = (blurOnTab = false): KeyBinding[] => [
	{
		any(view, event) {
			if (
				event.key === 'Tab' ||
				(event.key === 'Escape' && completionStatus(view.state) !== null)
			) {
				event.stopPropagation();
			}

			return false;
		},
	},
	{
		key: 'Tab',
		run: (view) => {
			if (selectedCompletion(view.state)) {
				return acceptCompletion(view);
			}

			if (!blurOnTab) return indentMore(view);
			return false;
		},
	},
	{ key: 'Shift-Tab', run: indentLess },
];

export const enterKeyMap: KeyBinding[] = [
	{
		key: 'Enter',
		run: (view) => {
			if (selectedCompletion(view.state)) {
				return acceptCompletion(view);
			}

			return insertNewlineAndIndent(view);
		},
	},
];

const SELECTED_AUTOCOMPLETE_OPTION_SELECTOR = '.cm-tooltip-autocomplete li[aria-selected]';
const onAutocompleteNavigate = (dir: 'up' | 'down') => (view: EditorView) => {
	if (completionStatus(view.state) !== null) {
		moveCompletionSelection(dir === 'down')(view);
		document
			.querySelector(SELECTED_AUTOCOMPLETE_OPTION_SELECTOR)
			?.scrollIntoView({ block: 'nearest' });
		return true;
	}
	return false;
};

export const autocompleteKeyMap: KeyBinding[] = [
	{
		key: 'ArrowDown',
		run: onAutocompleteNavigate('down'),
	},
	{
		key: 'ArrowUp',
		run: onAutocompleteNavigate('up'),
	},
];

export const historyKeyMap: KeyBinding[] = [
	{ key: 'Mod-z', run: undo },
	{ key: 'Mod-Shift-z', run: redo },
];
