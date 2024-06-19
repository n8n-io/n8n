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
import type { SyntaxNode } from '@lezer/common';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { useRouter } from 'vue-router';
import type { DocMetadata } from 'n8n-workflow';
import { escapeMappingString } from '@/utils/mappingUtils';

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
