import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { CREDENTIAL_EDIT_MODAL_KEY, SPLIT_IN_BATCHES_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { resolveParameter } from '@/composables/useWorkflowHelpers';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import {
	insertCompletionText,
	type Completion,
	type CompletionContext,
	pickedCompletion,
} from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import type { TransactionSpec } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';

/**
 * Split user input into base (to resolve) and tail (to filter).
 */
export function splitBaseTail(userInput: string): [string, string] {
	const read = (node: SyntaxNode | null) => (node ? userInput.slice(node.from, node.to) : '');
	const lastNode = javascriptLanguage.parser.parse(userInput).resolveInner(userInput.length, -1);

	switch (lastNode.type.name) {
		case '.':
			return [read(lastNode.parent).slice(0, -1), ''];
		case 'MemberExpression':
			return [read(lastNode.parent), read(lastNode)];
		case 'PropertyName':
			const tail = read(lastNode);
			return [read(lastNode.parent).slice(0, -(tail.length + 1)), tail];
		default:
			return ['', ''];
	}
}

export function longestCommonPrefix(...strings: string[]) {
	if (strings.length < 2) {
		throw new Error('Expected at least two strings');
	}

	return strings.reduce((acc, next) => {
		let i = 0;

		while (acc[i] && next[i] && acc[i] === next[i]) {
			i++;
		}

		return acc.slice(0, i);
	}, '');
}

export const prefixMatch = (first: string, second: string) =>
	first.startsWith(second) && first !== second;

/**
 * Make a function to bring selected elements to the start of an array, in order.
 */
export const setRank = (selected: string[]) => (full: string[]) => {
	const fullCopy = [...full];

	[...selected].reverse().forEach((s) => {
		const index = fullCopy.indexOf(s);

		if (index !== -1) fullCopy.unshift(fullCopy.splice(index, 1)[0]);
	});

	return fullCopy;
};

export const isPseudoParam = (candidate: string) => {
	const PSEUDO_PARAMS = ['notice']; // user input disallowed

	return PSEUDO_PARAMS.includes(candidate);
};

/**
 * Whether a string may be used as a key in object dot access notation.
 */
export const isAllowedInDotNotation = (str: string) => {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()+\-=[\]{};':"\\|,.<>?~]/g;

	return !DOT_NOTATION_BANNED_CHARS.test(str);
};

// ----------------------------------
//      resolution-based utils
// ----------------------------------

export function receivesNoBinaryData() {
	try {
		return resolveParameter('={{ $binary }}')?.data === undefined;
	} catch {
		return true;
	}
}

export function hasNoParams(toResolve: string) {
	let params;

	try {
		params = resolveParameter(`={{ ${toResolve}.params }}`);
	} catch {
		return true;
	}

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && isPseudoParam(paramKeys[0]);
}

// ----------------------------------
//        state-based utils
// ----------------------------------

export const isCredentialsModalOpen = () => useUIStore().modals[CREDENTIAL_EDIT_MODAL_KEY].open;

export const hasActiveNode = () => useNDVStore().activeNode?.name !== undefined;

export const isSplitInBatchesAbsent = () =>
	!useWorkflowsStore().workflow.nodes.some((node) => node.type === SPLIT_IN_BATCHES_NODE_TYPE);

export function autocompletableNodeNames() {
	return useWorkflowsStore()
		.allNodes.filter((node) => {
			const activeNodeName = useNDVStore().activeNode?.name;

			return (
				!NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type) && node.name !== activeNodeName
			);
		})
		.map((node) => node.name);
}

/**
 * Remove excess parens from an option label when the cursor is already
 * followed by parens, e.g. `$json.myStr.|()` -> `isNumeric`
 */
export const stripExcessParens = (context: CompletionContext) => (option: Completion) => {
	const followedByParens = context.state.sliceDoc(context.pos, context.pos + 2) === '()';

	if (option.label.endsWith('()') && followedByParens) {
		option.label = option.label.slice(0, '()'.length * -1);
	}

	return option;
};

/**
 * When a function completion is selected, set the cursor correctly
 * e.g. `$max()` -> `$max(<cursor>)`
 */
export const applyCompletion = (
	view: EditorView,
	completion: Completion,
	from: number,
	to: number,
): void => {
	const tx: TransactionSpec = {
		...insertCompletionText(view.state, completion.label, from, to),
		annotations: pickedCompletion.of(completion),
	};

	if (completion.label.endsWith('()')) {
		const cursorPosition = from + completion.label.length - 1;
		tx.selection = { anchor: cursorPosition, head: cursorPosition };
	}

	view.dispatch(tx);
};

export const sortCompletionsAlpha = (completions: Completion[]): Completion[] => {
	return completions.sort((a, b) => a.label.localeCompare(b.label));
};
