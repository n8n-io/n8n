import type { Diagnostic } from '@codemirror/lint';
import { linter as codeMirrorLinter } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import * as esprima from 'esprima-next';
import type { Node, MemberExpression } from 'estree';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useI18n } from '@n8n/i18n';
import {
	DEFAULT_LINTER_DELAY_IN_MS,
	DEFAULT_LINTER_SEVERITY,
	OFFSET_FOR_SCRIPT_WRAPPER,
} from './constants';
import type { RangeNode } from './types';
import { walk } from './utils';

export const useLinter = (
	mode: MaybeRefOrGetter<CodeExecutionMode>,
	language: MaybeRefOrGetter<CodeNodeEditorLanguage>,
) => {
	const i18n = useI18n();
	const linter = computed(() => {
		switch (toValue(language)) {
			case 'javaScript':
				return codeMirrorLinter(lintSource, { delay: DEFAULT_LINTER_DELAY_IN_MS });
		}

		return [];
	});

	function lintSource(editorView: EditorView): Diagnostic[] {
		const doc = editorView.state.doc.toString();
		const script = `module.exports = async function() {${doc}\n}()`;

		let ast: esprima.Program | null = null;

		try {
			ast = esprima.parseScript(script, { range: true });
		} catch (syntaxError) {
			return [];
		}

		if (ast === null) return [];

		const lintings: Diagnostic[] = [];

		/**
		 * Lint for incorrect `.item()` instead of `.item` in `runOnceForEachItem` mode
		 *
		 * $input.item() -> $input.item
		 */

		if (toValue(mode) === 'runOnceForEachItem') {
			const isItemCall = (node: Node) =>
				node.type === 'CallExpression' &&
				node.callee.type === 'MemberExpression' &&
				node.callee.property.type === 'Identifier' &&
				node.callee.property.name === 'item';

			walk(ast, isItemCall).forEach((node) => {
				const [start, end] = getRange(node);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.allItems.itemCall'),
					actions: [
						{
							name: 'Fix',
							apply(view, _, to) {
								view.dispatch({ changes: { from: end - '()'.length, to } });
							},
						},
					],
				});
			});
		}

		/**
		 * Lint for `$json`, `$binary` and `$itemIndex` unavailable in `runOnceForAllItems` mode
		 *
		 * $json -> <removed>
		 */

		if (toValue(mode) === 'runOnceForAllItems') {
			const isUnavailableVarInAllItems = (node: Node) =>
				node.type === 'Identifier' && ['$json', '$binary', '$itemIndex'].includes(node.name);

			walk(ast, isUnavailableVarInAllItems).forEach((node) => {
				const [start, end] = getRange(node);

				const varName = getText(editorView, node);

				if (!varName) return;

				const message = [
					`\`${varName}\``,
					i18n.baseText('codeNodeEditor.linter.allItems.unavailableVar'),
				].join(' ');

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message,
					actions: [
						{
							name: 'Remove',
							apply(view, from, to) {
								view.dispatch({ changes: { from, to } });
							},
						},
					],
				});
			});
		}

		/**
		 * Lint for `.item` unavailable in `$input` in `runOnceForAllItems` mode
		 *
		 * $input.item -> <removed>
		 */

		if (toValue(mode) === 'runOnceForAllItems') {
			type TargetNode = RangeNode & { property: RangeNode };

			const isInputIdentifier = (node: Node) =>
				node.type === 'Identifier' && node.name === '$input';
			const isPreviousNodeCall = (node: Node) =>
				node.type === 'CallExpression' &&
				node.callee.type === 'Identifier' &&
				node.callee.name === '$';
			const isDirectMemberExpression = (node: Node): node is MemberExpression =>
				node.type === 'MemberExpression' && !node.computed;
			const isItemIdentifier = (node: Node) => node.type === 'Identifier' && node.name === 'item';

			const isUnavailableInputItemAccess = (node: Node) =>
				isDirectMemberExpression(node) &&
				(isInputIdentifier(node.object) || isPreviousNodeCall(node.object)) &&
				isItemIdentifier(node.property);

			walk<TargetNode>(ast, isUnavailableInputItemAccess).forEach((node) => {
				const [start, end] = getRange(node.property);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.allItems.unavailableProperty'),
					actions: [
						{
							name: 'Fix',
							apply(view) {
								view.dispatch({ changes: { from: start, to: end, insert: 'first()' } });
							},
						},
					],
				});
			});
		}

		/**
		 * Lint for `items` (legacy var from Function node) unavailable
		 * in `runOnceForEachItem` mode, unless user-defined `items`.
		 *
		 * items -> $input.item
		 */
		if (toValue(mode) === 'runOnceForEachItem' && !/(let|const|var) items =/.test(script)) {
			type TargetNode = RangeNode & { object: RangeNode & { name: string } };

			const isUnavailableLegacyItems = (node: Node) =>
				node.type === 'Identifier' && node.name === 'items';

			walk<TargetNode>(ast, isUnavailableLegacyItems).forEach((node) => {
				const [start, end] = getRange(node);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.eachItem.unavailableItems'),
					actions: [
						{
							name: 'Fix',
							apply(view, from, to) {
								// prevent second insertion of unknown origin
								if (view.state.doc.toString().slice(from, to).includes('$input.item')) {
									return;
								}

								view.dispatch({ changes: { from: start, to: end } });
								view.dispatch({ changes: { from, insert: '$input.item' } });
							},
						},
					],
				});
			});
		}

		/**
		 * Lint for `.first()`, `.last()`, `.all()` and `.itemMatching()`
		 * unavailable in `runOnceForEachItem` mode
		 *
		 * $input.first()
		 * $input.last()
		 * $input.all()
		 * $input.itemMatching()
		 */

		if (toValue(mode) === 'runOnceForEachItem') {
			type TargetNode = RangeNode & { property: RangeNode & { name: string } };

			const isUnavailableMethodinEachItem = (node: Node) =>
				node.type === 'MemberExpression' &&
				!node.computed &&
				node.object.type === 'Identifier' &&
				node.object.name === '$input' &&
				node.property.type === 'Identifier' &&
				['first', 'last', 'all', 'itemMatching'].includes(node.property.name);

			walk<TargetNode>(ast, isUnavailableMethodinEachItem).forEach((node) => {
				const [start, end] = getRange(node.property);

				const method = getText(editorView, node.property);

				if (!method) return;

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.eachItem.unavailableMethod', {
						interpolate: { method },
					}),
				});
			});
		}

		/**
		 * Lint for `.itemMatching()` called with no argument in `runOnceForAllItems` mode
		 *
		 * $input.itemMatching()
		 */

		if (toValue(mode) === 'runOnceForAllItems') {
			type TargetNode = RangeNode & { callee: RangeNode & { property: RangeNode } };

			const isItemMatchingCallWithoutArg = (node: Node) =>
				node.type === 'CallExpression' &&
				node.callee.type === 'MemberExpression' &&
				node.callee.property.type === 'Identifier' &&
				node.callee.property.name === 'itemMatching' &&
				node.arguments.length === 0;

			walk<TargetNode>(ast, isItemMatchingCallWithoutArg).forEach((node) => {
				const [start, end] = getRange(node.callee.property);

				lintings.push({
					from: start,
					to: end + '()'.length,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.allItems.itemMatchingNoArg'),
				});
			});
		}

		/**
		 * Lint for `$input.first()` or `$input.last()` called with argument in `runOnceForAllItems` mode
		 *
		 * $input.first(arg) -> $input.first()
		 * $input.last(arg) -> $input.last()
		 */

		if (toValue(mode) === 'runOnceForAllItems') {
			type TargetNode = RangeNode & {
				callee: { property: { name: string } & RangeNode };
			};

			const inputFirstOrLastCalledWithArg = (node: Node) =>
				node.type === 'CallExpression' &&
				node.callee.type === 'MemberExpression' &&
				!node.callee.computed &&
				node.callee.object.type === 'Identifier' &&
				node.callee.object.name === '$input' &&
				node.callee.property.type === 'Identifier' &&
				['first', 'last'].includes(node.callee.property.name) &&
				node.arguments.length !== 0;

			walk<TargetNode>(ast, inputFirstOrLastCalledWithArg).forEach((node) => {
				const [start, end] = getRange(node.callee.property);

				const message = [
					`\`$input.${node.callee.property.name}()\``,
					i18n.baseText('codeNodeEditor.linter.allItems.firstOrLastCalledWithArg'),
				].join(' ');

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message,
				});
			});
		}

		/**
		 * Lint for empty (i.e. no value) return
		 *
		 * return -> <no autofix>
		 */

		const isEmptyReturn = (node: Node) => node.type === 'ReturnStatement' && node.argument === null;

		const emptyReturnMessage =
			toValue(mode) === 'runOnceForAllItems'
				? i18n.baseText('codeNodeEditor.linter.allItems.emptyReturn')
				: i18n.baseText('codeNodeEditor.linter.eachItem.emptyReturn');

		walk<RangeNode>(ast, isEmptyReturn).forEach((node) => {
			const [start, end] = node.range.map((loc) => loc - OFFSET_FOR_SCRIPT_WRAPPER);

			lintings.push({
				from: start,
				to: end,
				severity: DEFAULT_LINTER_SEVERITY,
				message: emptyReturnMessage,
			});
		});

		/**
		 * Lint for array return in `runOnceForEachItem` mode
		 *
		 * return [] -> <no autofix>
		 */

		if (toValue(mode) === 'runOnceForEachItem') {
			const isArrayReturn = (node: Node) =>
				node.type === 'ReturnStatement' &&
				node.argument !== null &&
				node.argument !== undefined &&
				node.argument.type === 'ArrayExpression';

			walk<RangeNode>(ast, isArrayReturn).forEach((node) => {
				const [start, end] = getRange(node);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.eachItem.returnArray'),
				});
			});
		}

		/**
		 * Lint for direct access to item property (i.e. not using `json`)
		 * in `runOnceForAllItems` mode
		 *
		 * item.myField = 123 -> item.json.myField = 123;
		 * const a = item.myField -> const a = item.json.myField;
		 */

		if (toValue(mode) === 'runOnceForAllItems') {
			type TargetNode = RangeNode & {
				left: { declarations: Array<{ id: { type: string; name: string } }> };
			};

			const isForOfStatementOverN8nVar = (node: Node) =>
				node.type === 'ForOfStatement' &&
				node.left.type === 'VariableDeclaration' &&
				node.left.declarations.length === 1 &&
				node.left.declarations[0].type === 'VariableDeclarator' &&
				node.left.declarations[0].id.type === 'Identifier' &&
				node.right.type === 'CallExpression' &&
				node.right.callee.type === 'MemberExpression' &&
				!node.right.callee.computed &&
				node.right.callee.object.type === 'Identifier' &&
				node.right.callee.object.name.startsWith('$'); // n8n var, e.g $input

			const found = walk<TargetNode>(ast, isForOfStatementOverN8nVar);

			if (found.length === 1) {
				const itemAlias = found[0].left.declarations[0].id.name;

				/**
				 * for (const item of $input.all()) {
				 * 	const item = {}; // shadow item
				 * }
				 */
				const isShadowItemVar = (node: Node) =>
					node.type === 'VariableDeclarator' &&
					node.id.type === 'Identifier' &&
					node.id.name === 'item' &&
					node.init !== null;

				const shadowFound = walk(ast, isShadowItemVar);

				let shadowStart: undefined | number;

				if (shadowFound.length > 0) {
					const [shadow] = shadowFound;
					const [_shadowStart] = getRange(shadow);
					shadowStart = _shadowStart;
				}

				const isDirectAccessToItem = (node: Node) =>
					node.type === 'MemberExpression' &&
					node.object.type === 'Identifier' &&
					node.object.name === itemAlias &&
					node.property.type === 'Identifier' &&
					!['json', 'binary'].includes(node.property.name);

				walk(ast, isDirectAccessToItem).forEach((node) => {
					const [start, end] = getRange(node);

					if (shadowStart && start > shadowStart) return; // skip shadow item

					const varName = getText(editorView, node);

					if (!varName) return;

					lintings.push({
						from: start,
						to: end,
						severity: DEFAULT_LINTER_SEVERITY,
						message: i18n.baseText('codeNodeEditor.linter.bothModes.directAccess.itemProperty'),
						actions: [
							{
								name: 'Fix',
								apply(view, from, to) {
									// prevent second insertion of unknown origin
									if (view.state.doc.toString().slice(from, to).includes('.json')) return;

									view.dispatch({ changes: { from: from + itemAlias.length, insert: '.json' } });
								},
							},
						],
					});
				});
			}
		}

		/**
		 * Lint for direct access to item property (i.e. not using `json`)
		 * in `runOnceForEachItem` mode
		 *
		 * $input.item.myField = 123 -> $input.item.json.myField = 123;
		 * const a = $input.item.myField -> const a = $input.item.json.myField;
		 */

		if (toValue(mode) === 'runOnceForEachItem') {
			type TargetNode = RangeNode & { object: { property: RangeNode } };

			const isDirectAccessToItemSubproperty = (node: Node) =>
				node.type === 'MemberExpression' &&
				node.object.type === 'MemberExpression' &&
				node.object.property.type === 'Identifier' &&
				node.object.property.name === 'item' &&
				node.property.type === 'Identifier' &&
				!['json', 'binary'].includes(node.property.name);

			walk<TargetNode>(ast, isDirectAccessToItemSubproperty).forEach((node) => {
				const varName = getText(editorView, node);

				if (!varName) return;

				const [start, end] = getRange(node);

				const [, fixEnd] = getRange(node.object.property);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: i18n.baseText('codeNodeEditor.linter.bothModes.directAccess.itemProperty'),
					actions: [
						{
							name: 'Fix',
							apply(view, from, to) {
								// prevent second insertion of unknown origin
								if (view.state.doc.toString().slice(from, to).includes('.json')) return;

								view.dispatch({ changes: { from: fixEnd, insert: '.json' } });
							},
						},
					],
				});
			});
		}

		/**
		 * Lint for direct access to `first()` or `last()` output (i.e. not using `json`)
		 *
		 * $input.first().myField -> $input.first().json.myField
		 */

		type TargetNode = RangeNode & { object: RangeNode };

		const isDirectAccessToFirstOrLastCall = (node: Node) =>
			node.type === 'MemberExpression' &&
			node.property.type === 'Identifier' &&
			!['json', 'binary'].includes(node.property.name) &&
			node.object.type === 'CallExpression' &&
			node.object.arguments.length === 0 &&
			node.object.callee.type === 'MemberExpression' &&
			node.object.callee.property.type === 'Identifier' &&
			['first', 'last'].includes(node.object.callee.property.name);

		walk<TargetNode>(ast, isDirectAccessToFirstOrLastCall).forEach((node) => {
			const [start, end] = getRange(node);

			const [, fixEnd] = getRange(node.object);

			lintings.push({
				from: start,
				to: end,
				severity: DEFAULT_LINTER_SEVERITY,
				message: i18n.baseText('codeNodeEditor.linter.bothModes.directAccess.firstOrLastCall'),
				actions: [
					{
						name: 'Fix',
						apply(view, from, to) {
							// prevent second insertion of unknown origin
							if (view.state.doc.toString().slice(from, to).includes('.json')) return;

							view.dispatch({ changes: { from: fixEnd, insert: '.json' } });
						},
					},
				],
			});
		});

		/**
		 * Lint for `$(variable)` usage where variable is not a string, in both modes.
		 *
		 * $(nodeName) -> <no autofix>
		 */
		const isDollarSignWithVariable = (node: Node) =>
			node.type === 'CallExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === '$' &&
			node.arguments.length === 1 &&
			((node.arguments[0].type !== 'Literal' && node.arguments[0].type !== 'TemplateLiteral') ||
				(node.arguments[0].type === 'TemplateLiteral' && node.arguments[0].expressions.length > 0));

		type TargetCallNode = RangeNode & {
			callee: { name: string };
			arguments: Array<{ type: string }>;
		};

		walk<TargetCallNode>(ast, isDollarSignWithVariable).forEach((node) => {
			const [start, end] = getRange(node);

			lintings.push({
				from: start,
				to: end,
				severity: 'warning',
				message: i18n.baseText('codeNodeEditor.linter.bothModes.dollarSignVariable'),
			});
		});

		/**
		 * Lint for $("myNode").item access in runOnceForAllItems mode
		 *
		 * $("myNode").item -> $("myNode").first()
		 */
		if (toValue(mode) === 'runOnceForEachItem') {
			type DollarItemNode = RangeNode & {
				property: { name: string; type: string } & RangeNode;
			};

			const isDollarNodeItemAccess = (node: Node) =>
				node.type === 'MemberExpression' &&
				!node.computed &&
				node.object.type === 'CallExpression' &&
				node.object.callee.type === 'Identifier' &&
				node.object.callee.name === '$' &&
				node.object.arguments.length === 1 &&
				node.object.arguments[0].type === 'Literal' &&
				node.property.type === 'Identifier' &&
				node.property.name === 'item';

			walk<DollarItemNode>(ast, isDollarNodeItemAccess).forEach((node) => {
				const [start, end] = getRange(node.property);

				lintings.push({
					from: start,
					to: end,
					severity: 'warning',
					message: i18n.baseText('codeNodeEditor.linter.eachItem.preferFirst'),
					actions: [
						{
							name: 'Fix',
							apply(view) {
								view.dispatch({ changes: { from: start, to: end, insert: 'first()' } });
							},
						},
					],
				});
			});
		}

		return lintings;
	}

	// ----------------------------------
	//            helpers
	// ----------------------------------

	function getText(editorView: EditorView, node: RangeNode) {
		const [start, end] = getRange(node);

		return editorView.state.doc.toString().slice(start, end);
	}

	function getRange(node: RangeNode) {
		return node.range.map((loc) => loc - OFFSET_FOR_SCRIPT_WRAPPER);
	}

	return linter;
};
