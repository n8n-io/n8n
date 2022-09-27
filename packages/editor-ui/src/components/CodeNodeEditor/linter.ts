import Vue from 'vue';
import { Diagnostic, linter as createLinter } from '@codemirror/lint';
import * as esprima from 'esprima';

import {
	DEFAULT_LINTER_DELAY_IN_MS,
	DEFAULT_LINTER_SEVERITY,
	OFFSET_FOR_SCRIPT_WRAPPER,
} from './constants';

import type { EditorView } from '@codemirror/view';
import type { Node } from 'estree';
import type { CodeNodeEditorMixin, RangeNode } from './types';

export const linterExtension = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		linterExtension() {
			return createLinter(this.lintSource, { delay: DEFAULT_LINTER_DELAY_IN_MS });
		},

		lintSource(editorView: EditorView): Diagnostic[] {
			const doc = editorView.state.doc.toString();
			const script = `module.exports = async function() {${doc}\n}()`;

			let ast: esprima.Program | null = null;

			try {
				ast = esprima.parseScript(script, { range: true });
			} catch (syntaxError) {
				let line;

				try {
					line = editorView.state.doc.line(syntaxError.lineNumber);

					return [
						{
							from: line.from,
							to: line.to,
							severity: DEFAULT_LINTER_SEVERITY,
							message: this.$locale.baseText('codeNodeEditor.linter.bothModes.syntaxError'),
						},
					];
				} catch (error) {
					/**
					 * When mis-writing n8n syntax, esprima throws an error with an off-by-one line number for the final line. Skipping that esprima error for now. In future, we should add full linting for n8n syntax before parsing JS.
					 */
					return [];
				}
			}

			const lintings: Diagnostic[] = [];

			/**
			 * Lint for incorrect `.item()` instead of `.item` in `runOnceForEachItem` mode
			 *
			 * $input.item() -> $input.item
			 */

			if (this.mode === 'runOnceForEachItem') {
				const isItemCall = (node: Node) =>
					node.type === 'CallExpression' &&
					node.callee.type === 'MemberExpression' &&
					node.callee.property.type === 'Identifier' &&
					node.callee.property.name === 'item';

				this.walk(ast, isItemCall).forEach((node) => {
					const [start, end] = this.getRange(node);

					lintings.push({
						from: start,
						to: end,
						severity: DEFAULT_LINTER_SEVERITY,
						message: this.$locale.baseText('codeNodeEditor.linter.allItems.itemCall'),
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

			if (this.mode === 'runOnceForAllItems') {
				const isUnavailableVarInAllItems = (node: Node) =>
					node.type === 'Identifier' && ['$json', '$binary', '$itemIndex'].includes(node.name);

				this.walk(ast, isUnavailableVarInAllItems).forEach((node) => {
					const [start, end] = this.getRange(node);

					const varName = this.getText(node);

					if (!varName) return;

					const message = [
						varName,
						this.$locale.baseText('codeNodeEditor.linter.allItems.unavailableVar'),
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
			 * Lint for `.item` unavailable in `runOnceForAllItems` mode
			 *
			 * $input.all().item -> $input.all()
			 */

			if (this.mode === 'runOnceForAllItems') {
				type TargetNode = RangeNode & { property: RangeNode & { range: [number, number] } };

				const isUnavailablePropertyinAllItems = (node: Node) =>
					node.type === 'MemberExpression' &&
					node.computed === false &&
					node.property.type === 'Identifier' &&
					node.property.name === 'item';

				this.walk<TargetNode>(ast, isUnavailablePropertyinAllItems).forEach((node) => {
					const [start, end] = this.getRange(node.property);

					lintings.push({
						from: start,
						to: end,
						severity: DEFAULT_LINTER_SEVERITY,
						message: this.$locale.baseText('codeNodeEditor.linter.allItems.unavailableProperty'),
						actions: [
							{
								name: 'Remove',
								apply(view) {
									view.dispatch({ changes: { from: start - '.'.length, to: end } });
								},
							},
						],
					});
				});
			}

			/**
			 * Lint for empty (i.e. no value) return
			 *
			 * return -> <no autofix>
			 */

			const isEmptyReturn = (node: Node) =>
				node.type === 'ReturnStatement' && node.argument === null;

			const emptyReturnMessage =
				this.mode === 'runOnceForAllItems'
					? this.$locale.baseText('codeNodeEditor.linter.allItems.emptyReturn')
					: this.$locale.baseText('codeNodeEditor.linter.eachItem.emptyReturn');

			this.walk<RangeNode>(ast, isEmptyReturn).forEach((node) => {
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

			if (this.mode === 'runOnceForEachItem') {
				const isArrayReturn = (node: Node) =>
					node.type === 'ReturnStatement' &&
					node.argument !== null &&
					node.argument !== undefined &&
					node.argument.type === 'ArrayExpression';

				this.walk<RangeNode>(ast, isArrayReturn).forEach((node) => {
					const [start, end] = this.getRange(node);

					lintings.push({
						from: start,
						to: end,
						severity: DEFAULT_LINTER_SEVERITY,
						message: this.$locale.baseText('codeNodeEditor.linter.eachItem.returnArray'),
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

			if (this.mode === 'runOnceForAllItems') {
				type TargetNode = RangeNode & {
					left: { declarations: Array<{ id: { type: string; name: string } }> };
				};

				const isForOfStatement = (node: Node) =>
					node.type === 'ForOfStatement' &&
					node.left.type === 'VariableDeclaration' &&
					node.left.declarations.length === 1 &&
					node.left.declarations[0].type === 'VariableDeclarator' &&
					node.left.declarations[0].id.type === 'Identifier';

				const found = this.walk<TargetNode>(ast, isForOfStatement);

				if (found.length === 1) {
					const itemAlias = found[0].left.declarations[0].id.name;

					const isDirectAccessToItem = (node: Node) =>
						node.type === 'MemberExpression' &&
						node.object.type === 'Identifier' &&
						node.object.name === itemAlias &&
						node.property.type === 'Identifier' &&
						node.property.name !== 'json';

					this.walk(ast, isDirectAccessToItem).forEach((node) => {
						const varName = this.getText(node);

						if (!varName) return;

						const [start, end] = this.getRange(node);

						lintings.push({
							from: start,
							to: end,
							severity: DEFAULT_LINTER_SEVERITY,
							message: this.$locale.baseText(
								'codeNodeEditor.linter.bothModes.directAccess.itemProperty',
							),
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

      if (this.mode === 'runOnceForEachItem') {
        type TargetNode = RangeNode & { object: { property: RangeNode & { range: [number, number] } } };

        const isDirectAccessToItemSubproperty = (node: Node) =>
          node.type === 'MemberExpression' &&
          node.object.type === 'MemberExpression' &&
          node.object.property.type === 'Identifier' &&
          node.object.property.name === 'item' &&
          node.property.type === 'Identifier' &&
          node.property.name !== 'json';

				this.walk<TargetNode>(ast, isDirectAccessToItemSubproperty).forEach((node) => {
					const varName = this.getText(node);

					if (!varName) return;

					const [start, end] = this.getRange(node);

					const [_, fixEnd] = this.getRange(node.object.property);

					lintings.push({
						from: start,
						to: end,
						severity: DEFAULT_LINTER_SEVERITY,
						message: this.$locale.baseText(
							'codeNodeEditor.linter.bothModes.directAccess.itemProperty',
						),
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
				node.property.name !== 'json' &&
				node.object.type === 'CallExpression' &&
				node.object.arguments.length === 0 &&
				node.object.callee.type === 'MemberExpression' &&
				node.object.callee.property.type === 'Identifier' &&
				['first', 'last'].includes(node.object.callee.property.name);

			this.walk<TargetNode>(ast, isDirectAccessToFirstOrLastCall).forEach((node) => {
				const [start, end] = this.getRange(node);

				const [_, fixEnd] = this.getRange(node.object);

				lintings.push({
					from: start,
					to: end,
					severity: DEFAULT_LINTER_SEVERITY,
					message: this.$locale.baseText(
						'codeNodeEditor.linter.bothModes.directAccess.firstOrLastCall',
					),
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

			return lintings;
		},

		// ----------------------------------
		//            helpers
		// ----------------------------------

		walk<T extends RangeNode>(node: Node, test: (node: Node) => boolean, found: Node[] = []) {
			if (test(node)) found.push(node);

			for (const key in node) {
				if (!(key in node)) continue;

				// @ts-ignore
				const child = node[key];

				if (child === null || typeof child !== 'object') continue;

				if (Array.isArray(child)) {
					child.forEach((node) => this.walk(node, test, found));
				} else {
					this.walk(child, test, found);
				}
			}

			return found as T[];
		},

		getText(node: RangeNode) {
			if (!this.editor) return null;

			const [start, end] = this.getRange(node);

			return this.editor.state.doc.toString().slice(start, end);
		},

		getRange(node: RangeNode) {
			return node.range.map((loc) => loc - OFFSET_FOR_SCRIPT_WRAPPER);
		},
	},
});
