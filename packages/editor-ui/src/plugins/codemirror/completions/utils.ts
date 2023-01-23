import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows';
import { resolveParameter } from '@/mixins/workflowHelpers';

/**
 * Split user input into base (to resolve) and tail (to filter).
 *
 * ```
 * DateTime. -> ['DateTime', '']
 * DateTime.fr -> ['DateTime', 'fr']
 * ```
 */
export function splitBaseTail(userInput: string): [string, string] {
	const parts = userInput.split('.');
	const tail = parts.pop() ?? '';

	return [parts.join('.'), tail];
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
	});
}

export const prefixMatch = (first: string, second: string) =>
	first.startsWith(second) && first !== second;

/**
 * Move selected elements to the start of an array, in order.
 * Selected elements are assumed to be in the array.
 */
export function bringToStart(array: string[], selected: string[]) {
	const copy = [...array];

	[...selected].reverse().forEach((s) => {
		const index = copy.indexOf(s);

		if (index !== -1) copy.unshift(copy.splice(index, 1)[0]);
	});

	return copy;
}

export const isPseudoParam = (candidate: string) => {
	const PSEUDO_PARAMS = ['notice']; // not real params, user input disallowed

	return PSEUDO_PARAMS.includes(candidate);
};

/**
 * Whether a string may be used as a key in object dot access notation.
 */
export const isAllowedInDotNotation = (str: string) => {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~]/g;

	return !DOT_NOTATION_BANNED_CHARS.test(str);
};

// ----------------------------------
//        state-based utils
// ----------------------------------

export const isSplitInBatchesAbsent = () =>
	!useWorkflowsStore().workflow.nodes.some((node) => node.type === SPLIT_IN_BATCHES_NODE_TYPE);

export function receivesNoBinaryData() {
	return resolveParameter('={{ $binary }}')?.data === undefined;
}

export function hasNoParams(toResolve: string) {
	const params = resolveParameter(`={{ ${toResolve}.params }}`);

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && isPseudoParam(paramKeys[0]);
}

export function autocompletableNodeNames() {
	return useWorkflowsStore()
		.allNodes.filter((node) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
		.map((node) => node.name);
}
