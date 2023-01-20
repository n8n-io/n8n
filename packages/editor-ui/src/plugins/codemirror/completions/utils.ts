import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows';
import { resolveParameter } from '@/mixins/workflowHelpers';

export function autocompletableNodeNames() {
	return useWorkflowsStore()
		.allNodes.filter((node) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
		.map((node) => node.name);
}

// @TODO: Refactor to take two args
export const longestCommonPrefix = (strings: string[]) => {
	if (strings.length === 0) return '';

	return strings.reduce((acc, next) => {
		let i = 0;

		while (acc[i] && next[i] && acc[i] === next[i]) {
			i++;
		}

		return acc.slice(0, i);
	});
};

/**
 * Move selected elements to the start of an array, in order.
 * Selected elements are assumed to be in the array.
 */
export function bringForward(array: string[], selected: string[]) {
	const copy = [...array];

	[...selected].reverse().forEach((s) => {
		const index = copy.indexOf(s);

		if (index !== -1) copy.unshift(copy.splice(index, 1)[0]);
	});

	return copy;
}

/**
 * Whether a string may be used as a key in object dot notation access.
 */
export const isAllowedInDotNotation = (str: string) => {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~]/g;

	return !DOT_NOTATION_BANNED_CHARS.test(str);
};

export const isSplitInBatchesAbsent = () =>
	!useWorkflowsStore().workflow.nodes.some((node) => node.type === SPLIT_IN_BATCHES_NODE_TYPE);

export const receivesNoBinaryData = () => resolveParameter('={{ $binary }}')?.data === undefined;

export function hasNoParams(toResolve: string) {
	const PSEUDO_PARAMS = ['notice']; // not proper params, no user input allowed

	const params = resolveParameter(`={{ ${toResolve}.params }}`);

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && PSEUDO_PARAMS.includes(paramKeys[0]);
}
