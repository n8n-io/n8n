import { completionStatus } from '@codemirror/autocomplete';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, StateEffect, StateField } from '@codemirror/state';
import { EditorView, type Tooltip, keymap, showTooltip, hoverTooltip } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { DateTime } from 'luxon';
import type { DocMetadata } from 'n8n-workflow';
import { arrayExtensions } from 'n8n-workflow/src/Extensions/ArrayExtensions';
import { booleanExtensions } from 'n8n-workflow/src/Extensions/BooleanExtensions';
import { dateExtensions } from 'n8n-workflow/src/Extensions/DateExtensions';
import { numberExtensions } from 'n8n-workflow/src/Extensions/NumberExtensions';
import { objectExtensions } from 'n8n-workflow/src/Extensions/ObjectExtensions';
import { stringExtensions } from 'n8n-workflow/src/Extensions/StringExtensions';
import { arrayMethods } from 'n8n-workflow/src/NativeMethods/Array.methods';
import { booleanMethods } from 'n8n-workflow/src/NativeMethods/Boolean.methods';
import { numberMethods } from 'n8n-workflow/src/NativeMethods/Number.methods';
import { objectMethods } from 'n8n-workflow/src/NativeMethods/Object.Methods';
import { stringMethods } from 'n8n-workflow/src/NativeMethods/String.methods';
import { resolveParameter } from '../../../composables/useWorkflowHelpers';
import { ROOT_DOLLAR_COMPLETIONS } from '../completions/constants';
import { createInfoBoxRenderer } from '../completions/infoBoxRenderer';

function docToTooltip(
	index: number,
	activeArgIndex: number,
	doc?: DocMetadata,
	isFunction = true,
): Tooltip | null {
	if (doc) {
		return {
			pos: index,
			above: true,
			create: () => {
				const element = document.createElement('div');
				element.classList.add('cm-cursorInfo');
				const info = createInfoBoxRenderer(doc, isFunction, activeArgIndex)();
				if (info) {
					element.appendChild(info);
				}
				return { dom: element };
			},
		};
	}

	return null;
}

function findNearestParentOfType(type: string, node: SyntaxNode): SyntaxNode | null {
	if (node.name === type) {
		return node;
	}

	if (node.parent) {
		return findNearestParentOfType(type, node.parent);
	}

	return null;
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

function getInfoBoxTooltip(state: EditorState): Tooltip | null {
	const { head, anchor } = state.selection.ranges[0];
	const index = head;

	const node = syntaxTree(state).resolveInner(index, -1);

	if (node.name !== 'Resolvable') {
		return null;
	}

	const read = (n?: SyntaxNode | null) => (n ? state.sliceDoc(n.from, n.to) : '');
	const resolvable = read(node);
	const jsCode = resolvable.replace(/^{{\s*(.*)\s*}}$/, '$1');
	const prefixLength = resolvable.indexOf(jsCode);
	const jsIndex = index - node.from - prefixLength;
	const jsAnchor = anchor - node.from - prefixLength;

	if (jsIndex >= jsCode.length || jsAnchor >= jsCode.length) {
		return null;
	}

	const readJs = (n?: SyntaxNode | null) => (n ? jsCode.slice(n.from, n.to) : '');
	const jsNode = javascriptLanguage.parser.parse(jsCode).resolveInner(jsIndex, 0);

	const argList = findNearestParentOfType('ArgList', jsNode);

	if (!argList || argList.from > jsAnchor || argList.to < jsAnchor) {
		return null;
	}
	const callExpression = findNearestParentOfType('CallExpression', argList);

	const argIndex = findActiveArgIndex(argList, jsIndex);

	const subject = callExpression?.firstChild;

	switch (subject?.name) {
		case 'MemberExpression': {
			const methodNameNode = subject.lastChild;

			if (methodNameNode?.name !== 'PropertyName' || jsIndex < methodNameNode.from) {
				return null;
			}

			try {
				const base = readJs(subject.firstChild);
				const resolved = resolveParameter(`={{ ${base} }}`);
				const methodName = readJs(methodNameNode);

				if (typeof resolved === 'string') {
					const doc =
						stringExtensions.functions[methodName]?.doc ?? stringMethods.functions[methodName]?.doc;

					return docToTooltip(index, argIndex, doc);
				}

				if (typeof resolved === 'number') {
					const doc =
						numberExtensions.functions[methodName]?.doc ?? numberMethods.functions[methodName]?.doc;

					return docToTooltip(index, argIndex, doc);
				}

				if (typeof resolved === 'boolean') {
					const doc =
						booleanExtensions.functions[methodName]?.doc ??
						booleanMethods.functions[methodName]?.doc;

					return docToTooltip(index, argIndex, doc);
				}

				if (Array.isArray(resolved)) {
					const doc =
						arrayExtensions.functions[methodName]?.doc ?? arrayMethods.functions[methodName]?.doc;

					return docToTooltip(index, argIndex, doc);
				}

				if (DateTime.isDateTime(resolved)) {
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltip(index, argIndex, doc);
				}

				if (resolved instanceof Date) {
					if (methodName !== 'toDateTime') {
						return null;
					}
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltip(index, argIndex, doc);
				}

				if (resolved && typeof resolved === 'object') {
					const doc =
						objectExtensions.functions[methodName]?.doc ?? objectMethods.functions[methodName]?.doc;

					return docToTooltip(index, argIndex, doc);
				}
			} catch (error) {
				return null;
			}

			return null;
		}

		case 'VariableName': {
			const result = ROOT_DOLLAR_COMPLETIONS.find((comp) => comp.label === readJs(subject) + '()');

			if (!result) {
				return null;
			}

			return {
				pos: index,
				above: true,
				create: () => {
					const element = document.createElement('div');
					element.classList.add('cm-cursorInfo');
					const info = result.info;
					if (typeof info === 'string') {
						element.textContent = info;
					} else if (typeof info === 'function') {
						const infoResult = info(result);

						if (infoResult instanceof Node) {
							element.appendChild(infoResult);
						} else if (infoResult && 'dom' in infoResult) {
							element.appendChild(infoResult.dom);
						}
					}

					return { dom: element };
				},
			};
		}
		default:
			return null;
	}
}

const cursorInfoBoxTooltip = StateField.define<{
	tooltip: Tooltip | null;
}>({
	create() {
		return { tooltip: null };
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

const hoverInfoBoxTooltip = hoverTooltip(async (view, pos, side) => {
	const node = syntaxTree(view.state).resolveInner(pos, -1);

	if (node.name !== 'Resolvable') {
		return null;
	}

	const read = (n?: SyntaxNode | null) => (n ? view.state.sliceDoc(n.from, n.to) : '');
	const resolvable = read(node);
	const jsCode = resolvable.replace(/^{{\s*(.*)\s*}}$/, '$1');
	const prefixLength = resolvable.indexOf(jsCode);
	const jsPos = pos - node.from - prefixLength;
	const jsNode = javascriptLanguage.parser.parse(jsCode).resolveInner(jsPos, 0);

	const start = node.from;
	const end = node.to;

	if ((start === pos && side < 0) || (end === pos && side > 0)) return null;

	const readJs = (n?: SyntaxNode | null) => (n ? jsCode.slice(n.from, n.to) : '');

	console.log(readJs(jsNode), jsNode.name);

	switch (jsNode?.name) {
		case 'PropertyName': {
			const callExpression = findNearestParentOfType('CallExpression', jsNode);
			const subject = callExpression?.firstChild;
			const propName = readJs(jsNode);
			const currentPropertyIsFunctionCall =
				subject && subject.lastChild?.from === jsNode.from && subject.lastChild?.to === jsNode.to;

			try {
				if (currentPropertyIsFunctionCall) {
					const base = readJs(jsNode.parent?.firstChild);
					const resolved = resolveParameter(`={{ ${base} }}`);

					if (typeof resolved === 'string') {
						const doc =
							stringExtensions.functions[propName]?.doc ?? stringMethods.functions[propName]?.doc;

						return docToTooltip(pos, -1, doc);
					}

					if (typeof resolved === 'number') {
						const doc =
							numberExtensions.functions[propName]?.doc ?? numberMethods.functions[propName]?.doc;

						return docToTooltip(pos, -1, doc);
					}

					if (typeof resolved === 'boolean') {
						const doc =
							booleanExtensions.functions[propName]?.doc ?? booleanMethods.functions[propName]?.doc;

						return docToTooltip(pos, -1, doc);
					}

					if (Array.isArray(resolved)) {
						const doc =
							arrayExtensions.functions[propName]?.doc ?? arrayMethods.functions[propName]?.doc;

						return docToTooltip(pos, -1, doc);
					}

					if (DateTime.isDateTime(resolved)) {
						const doc = dateExtensions.functions[propName]?.doc;
						return docToTooltip(pos, -1, doc);
					}

					if (resolved instanceof Date) {
						if (propName !== 'toDateTime') {
							return null;
						}
						const doc = dateExtensions.functions[propName]?.doc;
						return docToTooltip(pos, -1, doc);
					}

					if (resolved && typeof resolved === 'object') {
						const doc =
							objectExtensions.functions[propName]?.doc ?? objectMethods.functions[propName]?.doc;

						return docToTooltip(pos, -1, doc);
					}
				} else {
					const parent = readJs(jsNode.parent);
					const resolved = resolveParameter(`={{ ${parent} }}`);

					return docToTooltip(pos, -1, { name: propName, returnType: typeof resolved }, false);
				}
			} catch (error) {
				return null;
			}
		}
		case 'VariableName': {
			const isFunction = jsNode.nextSibling?.name === 'ArgList';
			const label = isFunction ? readJs(jsNode) + '()' : readJs(jsNode);
			const result = ROOT_DOLLAR_COMPLETIONS.find((comp) => comp.label === label);

			if (!result) {
				return null;
			}

			view.dispatch({ effects: closeInfoBoxEffect.of(null) });
			return {
				pos: jsNode.from + prefixLength + node.from,
				end: jsNode.to + prefixLength + node.from,
				above: true,
				create: () => {
					const element = document.createElement('div');
					element.classList.add('cm-cursorInfo');
					const info = result.info;
					if (typeof info === 'string') {
						element.textContent = info;
					} else if (typeof info === 'function') {
						const infoResult = info(result);

						if (infoResult instanceof Node) {
							element.appendChild(infoResult);
						} else if (infoResult && 'dom' in infoResult) {
							element.appendChild(infoResult.dom);
						}
					}

					return { dom: element };
				},
			};
		}
		default:
			return null;
	}
});

const closeInfoBoxEffect = StateEffect.define<null>();

export const infoBoxTooltips = (): Extension[] => {
	return [
		cursorInfoBoxTooltip,
		hoverInfoBoxTooltip,
		EditorView.focusChangeEffect.of((_, focus) => {
			if (!focus) {
				return closeInfoBoxEffect.of(null);
			}
			return null;
		}),
		keymap.of([
			{
				key: 'Escape',
				run: (view) => {
					const state = view.state.field(cursorInfoBoxTooltip, false);
					if (!state?.tooltip) return false;

					view.dispatch({ effects: closeInfoBoxEffect.of(null) });
					return true;
				},
			},
		]),
	];
};
