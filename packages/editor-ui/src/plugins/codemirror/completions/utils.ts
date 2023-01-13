import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows';
import { resolveParameter } from '@/mixins/workflowHelpers';

export function autocompletableNodeNames() {
	return useWorkflowsStore()
		.allNodes.filter((node) => !NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION.includes(node.type))
		.map((node) => node.name);
}

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
 * Whether a string may be used as a key in object dot notation access.
 */
export const isAllowedInDotNotation = (str: string) => {
	const DOT_NOTATION_BANNED_CHARS = /^(\d)|[\\ `!@#$%^&*()_+\-=[\]{};':"\\|,.<>?~]/g;

	return !DOT_NOTATION_BANNED_CHARS.test(str);
};

export const isSplitInBatchesAbsent = () =>
	!useWorkflowsStore().workflow.nodes.some((node) => node.type === SPLIT_IN_BATCHES_NODE_TYPE);

export const inputHasNoBinaryData = () => resolveParameter('={{ $binary }}')?.data === undefined;

export function inputHasNoParams() {
	const PSEUDO_PARAMS = ['notice']; // disallowing user input

	const params = resolveParameter('={{ $input.params }}');

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && PSEUDO_PARAMS.includes(paramKeys[0]);
}
