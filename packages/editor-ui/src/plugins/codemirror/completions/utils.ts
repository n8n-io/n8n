import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { useWorkflowsStore } from '@/stores/workflows';

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
