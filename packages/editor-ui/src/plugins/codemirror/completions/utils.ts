import {
	CREDENTIAL_EDIT_MODAL_KEY,
	HTTP_REQUEST_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
} from '@/constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { resolveParameter, useWorkflowHelpers } from '@/composables/useWorkflowHelpers';
import { useNDVStore } from '@/stores/ndv.store';
import { useUIStore } from '@/stores/ui.store';
import {
	insertCompletionText,
	type Completion,
	type CompletionContext,
	pickedCompletion,
	type CompletionSection,
} from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import type { TransactionSpec } from '@codemirror/state';
import type { SyntaxNode, Tree } from '@lezer/common';
import { useRouter } from 'vue-router';
import type { DocMetadata } from 'n8n-workflow';
import { escapeMappingString } from '@/utils/mappingUtils';

/**
 * Split user input into base (to resolve) and tail (to filter).
 */
export function splitBaseTail(syntaxTree: Tree, userInput: string): [string, string] {
	const lastNode = syntaxTree.resolveInner(userInput.length, -1);

	switch (lastNode.type.name) {
		case '.':
			return [read(lastNode.parent, userInput).slice(0, -1), ''];
		case 'MemberExpression':
			return [read(lastNode.parent, userInput), read(lastNode, userInput)];
		case 'PropertyName':
			const tail = read(lastNode, userInput);
			return [read(lastNode.parent, userInput).slice(0, -(tail.length + 1)), tail];
		default:
			return ['', ''];
	}
}

function replaceSyntaxNode(source: string, node: SyntaxNode, replacement: string) {
	return source.slice(0, node.from) + replacement + source.slice(node.to);
}

function isInputNodeCall(node: SyntaxNode, source: string): node is SyntaxNode {
	return (
		node.name === 'VariableName' &&
		read(node, source) === '$' &&
		node.parent?.name === 'CallExpression'
	);
}

function isInputVariable(node: SyntaxNode | null | undefined, source: string): node is SyntaxNode {
	return node?.name === 'VariableName' && read(node, source) === '$input';
}

function isItemProperty(node: SyntaxNode | null | undefined, source: string): node is SyntaxNode {
	return (
		node?.parent?.name === 'MemberExpression' &&
		node.name === 'PropertyName' &&
		read(node, source) === 'item'
	);
}

function isItemMatchingCall(
	node: SyntaxNode | null | undefined,
	source: string,
): node is SyntaxNode {
	return (
		node?.name === 'CallExpression' &&
		node.firstChild?.lastChild?.name === 'PropertyName' &&
		read(node.firstChild.lastChild, source) === 'itemMatching'
	);
}

function read(node: SyntaxNode | null, source: string) {
	return node ? source.slice(node.from, node.to) : '';
}
/**
 * Replace expressions that depend on pairedItem with the first item when possible
 * $input.item.json.foo -> $input.first().json.foo
 * $('Node').item.json.foo -> $('Node').item.json.foo
 */
export function expressionWithFirstItem(syntaxTree: Tree, expression: string): string {
	let result = expression;

	syntaxTree.cursor().iterate(({ node }) => {
		if (isInputVariable(node, expression)) {
			if (isItemProperty(node.parent?.lastChild, expression)) {
				result = replaceSyntaxNode(expression, node.parent.lastChild, 'first()');
			} else if (isItemMatchingCall(node.parent?.parent, expression)) {
				result = replaceSyntaxNode(expression, node.parent.parent, '$input.first()');
			}
		}

		if (isInputNodeCall(node, expression)) {
			if (isItemProperty(node.parent?.parent?.lastChild, expression)) {
				result = replaceSyntaxNode(expression, node.parent.parent.lastChild, 'first()');
			} else if (isItemMatchingCall(node.parent?.parent?.parent, expression)) {
				result = replaceSyntaxNode(
					expression,
					node.parent.parent.parent,
					`${read(node.parent, expression)}.first()`,
				);
			}
		}
	});

	return result;
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
	first.toLocaleLowerCase().startsWith(second.toLocaleLowerCase()) && first !== second;

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
		return resolveAutocompleteExpression('={{ $binary }}')?.data === undefined;
	} catch {
		return true;
	}
}

export function hasNoParams(toResolve: string) {
	let params;

	try {
		params = resolveAutocompleteExpression(`={{ ${toResolve}.params }}`);
	} catch {
		return true;
	}

	if (!params) return true;

	const paramKeys = Object.keys(params);

	return paramKeys.length === 1 && isPseudoParam(paramKeys[0]);
}

export function resolveAutocompleteExpression(expression: string) {
	const ndvStore = useNDVStore();
	return resolveParameter(
		expression,
		ndvStore.isInputParentOfActiveNode
			? {
					targetItem: ndvStore.expressionTargetItem ?? undefined,
					inputNodeName: ndvStore.ndvInputNodeName,
					inputRunIndex: ndvStore.ndvInputRunIndex,
					inputBranchIndex: ndvStore.ndvInputBranchIndex,
				}
			: {},
	);
}

// ----------------------------------
//        state-based utils
// ----------------------------------

export const isCredentialsModalOpen = () => useUIStore().modalsById[CREDENTIAL_EDIT_MODAL_KEY].open;

export const isInHttpNodePagination = () => {
	const ndvStore = useNDVStore();
	return (
		ndvStore.activeNode?.type === HTTP_REQUEST_NODE_TYPE &&
		ndvStore.focusedInputPath.startsWith('parameters.options.pagination')
	);
};

export const hasActiveNode = () => useNDVStore().activeNode?.name !== undefined;

export const isSplitInBatchesAbsent = () =>
	!useWorkflowsStore().workflow.nodes.some((node) => node.type === SPLIT_IN_BATCHES_NODE_TYPE);

export function autocompletableNodeNames() {
	const activeNodeName = useNDVStore().activeNode?.name;

	if (!activeNodeName) return [];

	return useWorkflowHelpers({ router: useRouter() })
		.getCurrentWorkflow()
		.getParentNodesByDepth(activeNodeName)
		.map((node) => node.name)
		.filter((name) => name !== activeNodeName);
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

export const getDefaultArgs = (doc?: DocMetadata): string[] => {
	return (
		doc?.args
			?.filter((arg) => !arg.optional)
			.map((arg) => arg.default)
			.filter((def): def is string => !!def) ?? []
	);
};

export const insertDefaultArgs = (label: string, args: unknown[]): string => {
	if (!label.endsWith('()')) return label;
	const argList = args.join(', ');
	const fnName = label.replace('()', '');

	return `${fnName}(${argList})`;
};

/**
 * When a function completion is selected, set the cursor correctly
 *
 *  @example `.includes()` -> `.includes(<cursor>)`
 *  @example `$max()` -> `$max()<cursor>`
 */
export const applyCompletion =
	({
		hasArgs = true,
		defaultArgs = [],
		transformLabel = (label) => label,
	}: {
		hasArgs?: boolean;
		defaultArgs?: unknown[];
		transformLabel?: (label: string) => string;
	} = {}) =>
	(view: EditorView, completion: Completion, from: number, to: number): void => {
		const isFunction = completion.label.endsWith('()');
		const label = insertDefaultArgs(transformLabel(completion.label), defaultArgs);
		const tx: TransactionSpec = {
			...insertCompletionText(view.state, label, from, to),
			annotations: pickedCompletion.of(completion),
		};

		if (isFunction) {
			if (defaultArgs.length > 0) {
				tx.selection = { anchor: from + label.indexOf('(') + 1, head: from + label.length - 1 };
			} else if (hasArgs) {
				const cursorPosition = from + label.length - 1;
				tx.selection = { anchor: cursorPosition, head: cursorPosition };
			}
		}

		view.dispatch(tx);
	};

export const applyBracketAccess = (key: string): string => {
	return `['${escapeMappingString(key)}']`;
};

/**
 * Apply a bracket-access completion
 *
 *  @example `$json.` -> `$json['key with spaces']`
 *  @example `$json` -> `$json['key with spaces']`
 */
export const applyBracketAccessCompletion = (
	view: EditorView,
	completion: Completion,
	from: number,
	to: number,
): void => {
	const label = applyBracketAccess(completion.label);
	const completionAtDot = view.state.sliceDoc(from - 1, from) === '.';

	view.dispatch({
		...insertCompletionText(view.state, label, completionAtDot ? from - 1 : from, to),
		annotations: pickedCompletion.of(completion),
	});
};

export const hasRequiredArgs = (doc?: DocMetadata): boolean => {
	if (!doc) return false;
	const requiredArgs = doc?.args?.filter((arg) => !arg.name.endsWith('?') && !arg.optional) ?? [];
	return requiredArgs.length > 0;
};

export const sortCompletionsAlpha = (completions: Completion[]): Completion[] => {
	return completions.sort((a, b) => a.label.localeCompare(b.label));
};

export const renderSectionHeader = (section: CompletionSection): HTMLElement => {
	const container = document.createElement('li');
	container.classList.add('cm-section-header');
	const inner = document.createElement('div');
	inner.classList.add('cm-section-title');
	inner.textContent = section.name;
	container.appendChild(inner);

	return container;
};

export const withSectionHeader = (section: CompletionSection): CompletionSection => {
	section.header = renderSectionHeader;
	return section;
};

export const isCompletionSection = (
	section: CompletionSection | string | undefined,
): section is CompletionSection => {
	return typeof section === 'object';
};

export const getDisplayType = (value: unknown): string => {
	if (Array.isArray(value)) {
		if (value.length > 0) {
			return `${getDisplayType(value[0])}[]`;
		}
		return 'Array';
	}
	if (value === null) return 'null';
	if (typeof value === 'object') return 'Object';
	return (typeof value).toLocaleLowerCase();
};

export function attempt<T, TDefault>(
	fn: () => T,
	onError: (error: unknown) => TDefault,
): T | TDefault;
export function attempt<T>(fn: () => T): T | null;
export function attempt<T, TDefault>(
	fn: () => T,
	onError?: (error: unknown) => TDefault,
): T | TDefault | null {
	try {
		return fn();
	} catch (error) {
		if (onError) {
			return onError(error);
		}
		return null;
	}
}
