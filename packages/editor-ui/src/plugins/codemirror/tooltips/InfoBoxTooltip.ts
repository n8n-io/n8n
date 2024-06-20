import {
	CompletionContext,
	completionStatus,
	type Completion,
	type CompletionInfo,
	type CompletionResult,
} from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { StateEffect, StateField, type EditorState, type Extension } from '@codemirror/state';
import {
	hoverTooltip,
	keymap,
	showTooltip,
	type Command,
	type EditorView,
	type Tooltip,
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { createInfoBoxRenderer } from '../completions/infoBoxRenderer';

const findNearestParentOfType =
	(type: string) =>
	(node: SyntaxNode): SyntaxNode | null => {
		if (node.name === type) {
			return node;
		}

		if (node.parent) {
			return findNearestParentOfType(type)(node.parent);
		}

		return null;
	};

const findNearestArgList = findNearestParentOfType('ArgList');
const findNearestCallExpression = findNearestParentOfType('CallExpression');

function completionToTooltip(
	completion: Completion | null,
	pos: number,
	options: { argIndex?: number; end?: number } = {},
): Tooltip | null {
	if (!completion) return null;

	return {
		pos,
		end: options.end,
		above: true,
		create: () => {
			const element = document.createElement('div');
			element.classList.add('cm-cursorInfo');
			const info = completion.info;
			if (typeof info === 'string') {
				element.textContent = info;
			} else if (isInfoBoxRenderer(info)) {
				const infoResult = info(completion, options.argIndex ?? -1);

				if (infoResult) {
					element.appendChild(infoResult);
				}
			}

			return { dom: element };
		},
	};
}

function findActiveArgIndex(node: SyntaxNode, index: number) {
	let currentIndex = 1;
	let argIndex = 0;
	let child: SyntaxNode | null = null;

	do {
		child = node.childAfter(currentIndex);

		if (child) {
			currentIndex = child.to;

			if (index >= child.from && index <= child.to) {
				return argIndex;
			}

			if (child.name !== ',' && child.name !== '(') argIndex++;
		}
	} while (child);

	return -1;
}

const createStateReader = (state: EditorState) => (node?: SyntaxNode | null) => {
	return node ? state.sliceDoc(node.from, node.to) : '';
};

const createStringReader = (str: string) => (node?: SyntaxNode | null) => {
	return node ? str.slice(node.from, node.to) : '';
};

function getJsNodeAtPosition(state: EditorState, pos: number, anchor?: number) {
	// Syntax node in the n8n language (Resolvable | Plaintext)
	const rootNode = syntaxTree(state).resolveInner(pos, -1);

	if (rootNode.name !== 'Resolvable') {
		return null;
	}

	const read = createStateReader(state);
	const resolvable = read(rootNode);
	const jsCode = resolvable.replace(/^{{\s*(.*)\s*}}$/, '$1');
	const prefixLength = resolvable.indexOf(jsCode);
	const jsOffset = rootNode.from + prefixLength;
	const jsPos = pos - jsOffset;
	const jsAnchor = anchor ? anchor - jsOffset : jsPos;
	const getGlobalPosition = (jsPosition: number) => jsPosition + jsOffset;
	const isSelectionWithinNode = (n: SyntaxNode) => {
		return jsPos >= n.from && jsPos <= n.to && jsAnchor >= n.from && jsAnchor <= n.to;
	};

	// Cursor or selection is outside of JS code
	if (jsPos >= jsCode.length || jsAnchor >= jsCode.length) {
		return null;
	}

	// Syntax node in JavaScript
	const jsNode = javascriptLanguage.parser
		.parse(jsCode)
		.resolveInner(jsPos, typeof anchor === 'number' ? 0 : -1);

	return {
		node: jsNode,
		pos: jsPos,
		readNode: createStringReader(jsCode),
		isSelectionWithinNode,
		getGlobalPosition,
	};
}

function getCompletion(
	state: EditorState,
	pos: number,
	filter: (completion: Completion) => boolean,
): Completion | null {
	const context = new CompletionContext(state, pos, true);
	const sources = state.languageDataAt<(context: CompletionContext) => CompletionResult>(
		'autocomplete',
		pos,
	);

	for (const source of sources) {
		const result = source(context);

		const options = result?.options.filter(filter);
		if (options && options.length > 0) {
			return options[0];
		}
	}

	return null;
}

const isInfoBoxRenderer = (
	info: string | ((completion: Completion) => CompletionInfo | Promise<CompletionInfo>) | undefined,
): info is ReturnType<typeof createInfoBoxRenderer> => {
	return typeof info === 'function';
};

function getInfoBoxTooltip(state: EditorState): Tooltip | null {
	const { head, anchor } = state.selection.ranges[0];
	const jsNodeResult = getJsNodeAtPosition(state, head, anchor);

	if (!jsNodeResult) {
		return null;
	}

	const { node, pos, isSelectionWithinNode, getGlobalPosition, readNode } = jsNodeResult;

	const argList = findNearestArgList(node);
	if (!argList || !isSelectionWithinNode(argList)) {
		return null;
	}

	const callExpression = findNearestCallExpression(argList);
	if (!callExpression) {
		return null;
	}
	const argIndex = findActiveArgIndex(argList, pos);
	const subject = callExpression?.firstChild;

	switch (subject?.name) {
		case 'MemberExpression': {
			const methodName = readNode(subject.lastChild);
			const completion = getCompletion(
				state,
				getGlobalPosition(subject.to - 1),
				(c) => c.label === methodName + '()',
			);

			return completionToTooltip(completion, head, { argIndex });
		}
		case 'VariableName': {
			const methodName = readNode(subject);
			const completion = getCompletion(
				state,
				getGlobalPosition(subject.to - 1),
				(c) => c.label === methodName + '()',
			);

			return completionToTooltip(completion, head, { argIndex });
		}
		default:
			return null;
	}
}

const cursorInfoBoxTooltip = StateField.define<{ tooltip: Tooltip | null }>({
	create(state) {
		return { tooltip: getInfoBoxTooltip(state) };
	},

	update(value, tr) {
		if (
			tr.state.selection.ranges.length !== 1 ||
			tr.state.selection.ranges[0].head === 0 ||
			completionStatus(tr.state) === 'active'
		) {
			return { tooltip: null };
		}

		if (tr.effects.find((effect) => effect.is(closeInfoBoxEffect))) {
			return { tooltip: null };
		}

		if (!tr.docChanged && !tr.selection) return { tooltip: value.tooltip };

		return { ...value, tooltip: getInfoBoxTooltip(tr.state) };
	},

	provide: (f) => showTooltip.compute([f], (state) => state.field(f).tooltip),
});

export const hoverTooltipSource = (view: EditorView, pos: number) => {
	const state = view.state.field(cursorInfoBoxTooltip, false);
	const cursorTooltipOpen = !!state?.tooltip;

	const jsNodeResult = getJsNodeAtPosition(view.state, pos);

	if (!jsNodeResult) {
		return null;
	}

	const { node, getGlobalPosition, readNode } = jsNodeResult;

	const tooltipForNode = (subject: SyntaxNode) => {
		const completion = getCompletion(
			view.state,
			getGlobalPosition(subject.to - 1),
			(c) => c.label === readNode(subject) || c.label === readNode(subject) + '()',
		);

		const newHoverTooltip = completionToTooltip(completion, getGlobalPosition(subject.from), {
			end: getGlobalPosition(subject.to),
		});

		if (newHoverTooltip && cursorTooltipOpen) {
			closeCursorInfoBox(view);
		}

		return newHoverTooltip;
	};

	switch (node.name) {
		case 'VariableName':
		case 'PropertyName': {
			return tooltipForNode(node);
		}
		case 'String':
		case 'Number':
		case 'Boolean':
		case 'CallExpression': {
			const callExpression = findNearestCallExpression(node);

			if (!callExpression) return null;

			return tooltipForNode(callExpression);
		}

		default:
			return null;
	}
};
const hoverInfoBoxTooltip = hoverTooltip(hoverTooltipSource, {
	hideOnChange: true,
	hoverTime: 500,
});

const closeInfoBoxEffect = StateEffect.define<null>();

export const closeCursorInfoBox: Command = (view) => {
	const state = view.state.field(cursorInfoBoxTooltip, false);
	if (!state?.tooltip) return false;

	view.dispatch({ effects: closeInfoBoxEffect.of(null) });
	return true;
};

export const infoBoxTooltips = (): Extension[] => {
	return [
		cursorInfoBoxTooltip,
		hoverInfoBoxTooltip,
		keymap.of([
			{
				key: 'Escape',
				run: closeCursorInfoBox,
			},
		]),
	];
};
