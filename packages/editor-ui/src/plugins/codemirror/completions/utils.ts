import { NODE_TYPES_EXCLUDED_FROM_AUTOCOMPLETION } from '@/components/CodeNodeEditor/constants';
import { SPLIT_IN_BATCHES_NODE_TYPE } from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows';
import { resolveParameter } from '@/mixins/workflowHelpers';
import { useNDVStore } from '@/stores/ndv';
import type { Completion, CompletionContext } from '@codemirror/autocomplete';

// String literal expression is everything enclosed in single, double or tick quotes following a dot
const stringLiteralRegex = /^"[^"]+"|^'[^']+'|^`[^`]+`\./;
// JavaScript operands
const operandsRegex = /[+\-*/><<==>**!=?]/;
/**
 * Split user input into base (to resolve) and tail (to filter).
 */
export function splitBaseTail(userInput: string): [string, string] {
	const processedInput = extractSubExpression(userInput);
	const parts = processedInput.split('.');
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

// Process user input if expressions are used as part of complex expression
// i.e. as a function parameter or an operation expression
// this function will extract expression that is currently typed so autocomplete
// suggestions can be matched based on it.
function extractSubExpression(userInput: string): string {
	const dollarSignIndex = userInput.indexOf('$');
	// If it's not a dollar sign expression just strip parentheses
	if (dollarSignIndex === -1) {
		userInput = userInput.replace(/^.+(\(|\[|{)/, '');
	} else if (!stringLiteralRegex.test(userInput)) {
		// If there is a dollar sign in the input and input is not a string literal,
		// extract part of following the last $
		const expressionParts = userInput.split('$');
		userInput = `$${expressionParts[expressionParts.length - 1]}`;
		// If input is part of a complex operation expression and extract last operand
		const operationPart = userInput.split(operandsRegex).pop()?.trim() || '';
		const lastOperand = operationPart.split(' ').pop();
		if (lastOperand) {
			userInput = lastOperand;
		}
	}
	return userInput;
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
	return resolveParameter('={{ $binary }}')?.data === undefined;
}

export function hasNoParams(toResolve: string) {
	const params = resolveParameter(`={{ ${toResolve}.params }}`);

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && isPseudoParam(paramKeys[0]);
}

// ----------------------------------
//        state-based utils
// ----------------------------------

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
