import { Tooltip, showTooltip } from '@codemirror/view';
import { EditorState, StateField } from '@codemirror/state';
import { javascriptLanguage } from '@codemirror/lang-javascript';
import { createInfoBoxRenderer } from '../completions/infoBoxRenderer';
import { stringExtensions } from 'n8n-workflow/src/Extensions/StringExtensions';
import { SyntaxNode } from '@lezer/common';
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

function docToTooltips(index: number, doc?: DocMetadata): Tooltip[] {
	if (doc) {
		return [
			{
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
			},
		];
	}

	return [];
}

function getCursorTooltips(state: EditorState): readonly Tooltip[] {
	console.log(state.selection.ranges);
	if (
		state.selection.ranges.length !== 1 ||
		state.selection.ranges[0].head === 0 ||
		completionStatus(state) === 'active'
	) {
		return [];
	}

	const index = state.selection.ranges[0].head;

	const node = javascriptLanguage.parser.parse(state.doc.toString()).resolveInner(index, -1);

	const read = (node?: SyntaxNode | null) => (node ? state.sliceDoc(node.from, node.to) : '');

	if (node.parent?.name !== 'ArgList' && node.parent?.name !== 'MemberExpression') {
		return [];
	}

	const callExpression = node.parent.parent;

	if (callExpression?.name !== 'CallExpression') {
		return [];
	}

	const subject = callExpression.firstChild;

	switch (subject?.name) {
		case 'MemberExpression': {
			const methodNameNode = subject.lastChild;

			if (methodNameNode?.name !== 'PropertyName') {
				return [];
			}

			try {
				const base = read(subject.firstChild);
				const resolved = resolveParameter(`={{ ${base} }}`);
				const methodName = read(methodNameNode);

				console.log({ base, resolved, methodName });

				if (typeof resolved === 'string') {
					const doc =
						stringExtensions.functions[methodName]?.doc ?? stringMethods.functions[methodName]?.doc;

					return docToTooltips(index, doc);
				}

				if (typeof resolved === 'number') {
					const doc =
						numberExtensions.functions[methodName]?.doc ?? numberMethods.functions[methodName]?.doc;

					return docToTooltips(index, doc);
				}

				if (typeof resolved === 'boolean') {
					const doc =
						booleanExtensions.functions[methodName]?.doc ??
						booleanMethods.functions[methodName]?.doc;

					return docToTooltips(index, doc);
				}

				if (Array.isArray(resolved)) {
					const doc =
						arrayExtensions.functions[methodName]?.doc ?? arrayMethods.functions[methodName]?.doc;

					return docToTooltips(index, doc);
				}

				if (DateTime.isDateTime(resolved)) {
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltips(index, doc);
				}

				if (resolved instanceof Date) {
					if (methodName !== 'toDateTime') {
						return [];
					}
					const doc = dateExtensions.functions[methodName]?.doc;
					return docToTooltips(index, doc);
				}

				if (resolved && typeof resolved === 'object') {
					const doc =
						objectExtensions.functions[methodName]?.doc ?? objectMethods.functions[methodName]?.doc;

					return docToTooltips(index, doc);
				}
			} catch (error) {
				return [];
			}

			return [];
		}

		case 'VariableName': {
			const result = ROOT_DOLLAR_COMPLETIONS.find((comp) => comp.label === read(subject) + '()');

			console.log({ result }, read(subject));

			if (!result) {
				return [];
			}

			return [
				{
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
				},
			];
		}
		default:
			return [];
	}
}

export const cursorTooltipField = StateField.define<readonly Tooltip[]>({
	create: getCursorTooltips,

	update(tooltips, tr) {
		if (!tr.docChanged && !tr.selection && !completionStatus(tr.state)) return tooltips;
		return getCursorTooltips(tr.state);
	},

	provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});
