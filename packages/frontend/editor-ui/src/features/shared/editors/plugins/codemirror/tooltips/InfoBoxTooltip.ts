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
	tooltips,
	ViewPlugin,
	type Command,
	type EditorView,
	type Tooltip,
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import type { createInfoBoxRenderer } from '../completions/infoBoxRenderer';
import { CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID } from '@/app/constants';

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

async function getCompletion(
	state: EditorState,
	pos: number,
	filter: (completion: Completion) => boolean,
): Promise<Completion | null> {
	const context = new CompletionContext(state, pos, true);
	const sources = state.languageDataAt<
		(context: CompletionContext) => CompletionResult | Promise<CompletionResult | null>
	>('autocomplete', pos);

	for (const source of sources) {
		const result = await source(context);

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

interface TooltipContext {
	state: EditorState;
	head: number;
	argIndex: number;
	globalPosition: number;
	methodName: string;
}

function getTooltipContext(state: EditorState): TooltipContext | null {
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
			return {
				state,
				head,
				argIndex,
				globalPosition: getGlobalPosition(subject.to - 1),
				methodName: methodName + '()',
			};
		}
		case 'VariableName': {
			const methodName = readNode(subject);
			return {
				state,
				head,
				argIndex,
				globalPosition: getGlobalPosition(subject.to - 1),
				methodName: methodName + '()',
			};
		}
		default:
			return null;
	}
}

async function getInfoBoxTooltip(state: EditorState): Promise<Tooltip | null> {
	const ctx = getTooltipContext(state);
	if (!ctx) return null;

	const completion = await getCompletion(
		ctx.state,
		ctx.globalPosition,
		(c) => c.label === ctx.methodName,
	);
	return completionToTooltip(completion, ctx.head, { argIndex: ctx.argIndex });
}

const setAsyncTooltipEffect = StateEffect.define<Tooltip | null>();

const cursorInfoBoxTooltip = StateField.define<{
	tooltip: Tooltip | null;
	contextKey: string | null;
}>({
	create(state) {
		const ctx = getTooltipContext(state);
		return {
			tooltip: null,
			contextKey: ctx ? `${ctx.globalPosition}:${ctx.methodName}` : null,
		};
	},

	update(value, tr) {
		if (
			tr.state.selection.ranges.length !== 1 ||
			tr.state.selection.ranges[0].head === 0 ||
			completionStatus(tr.state) === 'active'
		) {
			return { tooltip: null, contextKey: null };
		}

		if (tr.effects.find((effect) => effect.is(closeInfoBoxEffect))) {
			return { tooltip: null, contextKey: null };
		}

		// Check for async tooltip update effect
		for (const effect of tr.effects) {
			if (effect.is(setAsyncTooltipEffect)) {
				return { ...value, tooltip: effect.value };
			}
		}

		if (!tr.docChanged && !tr.selection) return value;

		const ctx = getTooltipContext(tr.state);
		const newContextKey = ctx ? `${ctx.globalPosition}:${ctx.methodName}` : null;

		// Context changed - clear tooltip, ViewPlugin will load new one async
		if (newContextKey !== value.contextKey) {
			return { tooltip: null, contextKey: newContextKey };
		}

		return value;
	},

	provide: (f) => showTooltip.compute([f], (state) => state.field(f).tooltip),
});

// ViewPlugin to handle async tooltip loading
const asyncTooltipLoader = ViewPlugin.define((view) => {
	let pendingLoad: { key: string; aborted: boolean } | null = null;

	const loadAsync = async () => {
		const ctx = getTooltipContext(view.state);
		if (!ctx) return;

		const contextKey = `${ctx.globalPosition}:${ctx.methodName}`;
		const currentField = view.state.field(cursorInfoBoxTooltip, false);

		// If we already have a tooltip or context hasn't changed, skip
		if (currentField?.tooltip || currentField?.contextKey !== contextKey) return;

		// Abort any pending load
		if (pendingLoad) {
			pendingLoad.aborted = true;
		}

		const load = { key: contextKey, aborted: false };
		pendingLoad = load;

		const tooltip = await getInfoBoxTooltip(view.state);

		// Only dispatch if not aborted and context is still the same
		if (!load.aborted && view.state.field(cursorInfoBoxTooltip, false)?.contextKey === contextKey) {
			view.dispatch({ effects: setAsyncTooltipEffect.of(tooltip) });
		}
	};

	// Initial load
	void loadAsync();

	return {
		update(update) {
			if (update.docChanged || update.selectionSet) {
				void loadAsync();
			}
		},
	};
});

export const hoverTooltipSource = async (
	view: EditorView,
	pos: number,
): Promise<Tooltip | null> => {
	const state = view.state.field(cursorInfoBoxTooltip, false);
	const cursorTooltipOpen = !!state?.tooltip;

	// Don't show hover tooltips when autocomplete is active
	if (completionStatus(view.state) === 'active') return null;

	const jsNodeResult = getJsNodeAtPosition(view.state, pos);

	if (!jsNodeResult) {
		return null;
	}

	const { node, getGlobalPosition, readNode } = jsNodeResult;

	const tooltipForNode = async (subject: SyntaxNode): Promise<Tooltip | null> => {
		const completion = await getCompletion(
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
			return await tooltipForNode(node);
		}
		case 'String':
		case 'Number':
		case 'Boolean':
		case 'CallExpression': {
			const callExpression = findNearestCallExpression(node);

			if (!callExpression) return null;

			return await tooltipForNode(callExpression);
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
		tooltips({
			parent: document.getElementById(CODEMIRROR_TOOLTIP_CONTAINER_ELEMENT_ID) ?? undefined,
		}),
		cursorInfoBoxTooltip,
		asyncTooltipLoader,
		hoverInfoBoxTooltip,
		keymap.of([
			{
				key: 'Escape',
				run: closeCursorInfoBox,
			},
		]),
	];
};
