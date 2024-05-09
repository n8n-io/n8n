import { EditorView, Tooltip, keymap, showTooltip } from '@codemirror/view';
import { EditorState, Extension, StateEffect, StateField } from '@codemirror/state';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { createInfoBoxRenderer } from '../completions/infoBoxRenderer';
import { stringExtensions } from 'n8n-workflow/src/Extensions/StringExtensions';
import { SyntaxNode, Tree } from '@lezer/common';
import { ROOT_DOLLAR_COMPLETIONS } from '../completions/constants';
import { completionStatus } from '@codemirror/autocomplete';
import { resolveParameter } from '../../../composables/useWorkflowHelpers';
import { stringMethods } from 'n8n-workflow/src/NativeMethods/String.methods';
import { DocMetadata } from 'n8n-workflow';
import { numberExtensions } from 'n8n-workflow/src/Extensions/NumberExtensions';
import { numberMethods } from 'n8n-workflow/src/NativeMethods/Number.methods';
import { booleanExtensions } from 'n8n-workflow/src/Extensions/BooleanExtensions';
import { booleanMethods } from 'n8n-workflow/src/NativeMethods/Boolean.methods';
import { DateTime } from 'luxon';
import { arrayExtensions } from 'n8n-workflow/src/Extensions/ArrayExtensions';
import { arrayMethods } from 'n8n-workflow/src/NativeMethods/Array.methods';
import { dateExtensions } from 'n8n-workflow/src/Extensions/DateExtensions';
import { objectExtensions } from 'n8n-workflow/src/Extensions/ObjectExtensions';
import { objectMethods } from 'n8n-workflow/src/NativeMethods/Object.Methods';
import { syntaxTree } from '@codemirror/language';

function docToTooltip(index: number, doc?: DocMetadata): Tooltip | null {
	if (doc) {
		return {
			pos: index,
			above: true,
			create: () => {
				const element = document.createElement('div');
				element.classList.add('cm-cursorInfo');
				const info = createInfoBoxRenderer(doc, true)();
				if (info) {
					element.appendChild(info);
				}
				return { dom: element };
			},
		};
	}

	return null;
}

function findCallExpression(node: SyntaxNode): SyntaxNode | null {
	if (node.name === ')') {
		return null;
	}

	if (node.name === 'CallExpression') {
		return node;
	}

	if (node.parent) {
		return findCallExpression(node.parent);
	}

	return null;
}

function getInfoBoxTooltip(state: EditorState): Tooltip | null {
	const { head, anchor } = state.selection.ranges[0];
	const index = head;

	const node = syntaxTree(state).resolveInner(index, -1);

	if (node.name !== 'Resolvable') {
		return null;
	}

	const read = (node?: SyntaxNode | null) => (node ? state.sliceDoc(node.from, node.to) : '');
	const resolvable = read(node);
	const jsCode = resolvable.replace(/^{{\s*(.*)\s*}}$/, '$1');
	const prefixLength = resolvable.indexOf(jsCode);
	const jsIndex = index - node.from - prefixLength;
	const jsAnchor = anchor - node.from - prefixLength;

	if (jsIndex >= jsCode.length || jsAnchor >= jsCode.length) {
		return null;
	}

	const readJs = (node?: SyntaxNode | null) => (node ? jsCode.slice(node.from, node.to) : '');
	const jsNode = javascriptLanguage.parser.parse(jsCode).resolveInner(jsIndex, -1);

	const callExpression = findCallExpression(jsNode);

	if (!callExpression || callExpression.from > jsAnchor || callExpression.to < jsAnchor) {
		return null;
	}

	const subject = callExpression.firstChild;

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

					return docToTooltip(index, doc);
				}

				if (typeof resolved === 'number') {
					const doc =
						numberExtensions.functions[methodName]?.doc ?? numberMethods.functions[methodName]?.doc;

					return docToTooltip(index, doc);
				}

				if (typeof resolved === 'boolean') {
					const doc =
						booleanExtensions.functions[methodName]?.doc ??
						booleanMethods.functions[methodName]?.doc;

					return docToTooltip(index, doc);
				}

				if (Array.isArray(resolved)) {
					const doc =
						arrayExtensions.functions[methodName]?.doc ?? arrayMethods.functions[methodName]?.doc;

					return docToTooltip(index, doc);
				}

				if (DateTime.isDateTime(resolved)) {
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltip(index, doc);
				}

				if (resolved instanceof Date) {
					if (methodName !== 'toDateTime') {
						return null;
					}
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltip(index, doc);
				}

				if (resolved && typeof resolved === 'object') {
					const doc =
						objectExtensions.functions[methodName]?.doc ?? objectMethods.functions[methodName]?.doc;

					return docToTooltip(index, doc);
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
					const info = (result.info as any)();
					if (info) {
						element.appendChild(info);
					}
					return { dom: element };
				},
			};
		}
		default:
			return null;
	}
}

const infoBoxTooltipField = StateField.define<{
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

const closeInfoBoxEffect = StateEffect.define<null>();

export const infoBoxTooltips = (): Extension[] => {
	return [
		infoBoxTooltipField,
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
					const state = view.state.field(infoBoxTooltipField, false);
					if (!state?.tooltip) return false;

					view.dispatch({ effects: closeInfoBoxEffect.of(null) });
					return true;
				},
			},
		]),
	];
};
