import Vue from 'vue';

import { syntaxTree } from '@codemirror/language';
import { Diagnostic, linter } from '@codemirror/lint';

import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import type { CodeNodeEditorMixin } from './types';

export const linterExtension = (Vue as CodeNodeEditorMixin).extend({
	methods: {
		isFinalReturn(node: { to: number }): boolean {
			if (!this.editor) return false;

			return node.to === this.editor.state.doc.toString().trim().length;
		},

		linterExtension(): Extension {
			const lintSource = (editorView: EditorView) => {
				const lintings: Diagnostic[] = [];

				syntaxTree(editorView.state)
					.cursor()
					.iterate((node) => {
						if (!this.editor) return;

						/**
						 * Lint for incorrect `.item()` instead of `.item`
						 */
						if (node.name === 'MemberExpression') {
							const [varText] = this.editor.state.doc.slice(node.from, node.to);

							if (varText.endsWith('.item')) {
								if (!node.node.nextSibling) return;

								const potentialCallNode = node.node.nextSibling;

								if (!potentialCallNode) return;

								const potentialCall = this.editor.state.doc
									.toString()
									.slice(potentialCallNode.from, potentialCallNode.to);

								if (potentialCall === '()') {
									lintings.push({
										from: potentialCallNode.from,
										to: potentialCallNode.to,
										severity: 'warning',
										message: this.$locale.baseText(
											'codeNodeEditor.lintings.allItems.$inputDotItemAsCall',
										),
									});
								}
							}
						}

						if (node.name === 'VariableName') {
							const [varText] = this.editor.state.doc.slice(node.from, node.to);

							/**
							 * Lint for incorrect `$json`, `$binary` and `$itemIndex` in `runOnceForAllItems` mode
							 */
							 if (/(\$json|\$binary|\$itemIndex)/.test(varText) && this.mode === 'runOnceForAllItems') {
								lintings.push({
									from: node.from,
									to: node.to,
									severity: 'warning',
									message: this.$locale.baseText('codeNodeEditor.lintings.allItems.globalVarFromEachItemMode'),
								});
							}

							/**
							 * Lint for incorrect `.item` in `runOnceForAllItems` mode
							 */
							if (varText === '$input' && this.mode === 'runOnceForAllItems') {
								if (!node.node.nextSibling) return;

								// current: $input,	next: ., next: method
								const methodNode = node.node.nextSibling.node.nextSibling;

								if (!methodNode) return;

								const method = this.editor.state.doc
									.toString()
									.slice(methodNode.from, methodNode.to);

								if (method === 'item') {
									lintings.push({
										from: methodNode.from,
										to: methodNode.to,
										severity: 'warning',
										message: this.$locale.baseText(
											'codeNodeEditor.lintings.allItems.$inputDotItem',
										),
									});
								}
							}

							/**
							 * Lint for incorrect setting of item in loop using `$input.all()`
							 */
							if (varText === '$input') {
								const maybeFor = node.node.parent && node.node.parent.parent && node.node.parent.parent.parent;

								if (!maybeFor || maybeFor.type.name !== 'ForOfSpec') return;

								const contentOfFor = this.editor.state.doc
									.toString()
									.slice(maybeFor.node.from, maybeFor.node.to);

								const match = contentOfFor.match(/\s(?<itemVarName>\w+)\sof/);

								if (!match || !match.groups || !match.groups.itemVarName) return;

								const { itemVarName } = match.groups;

								const forBlock = maybeFor.node.nextSibling;

								if (!forBlock) return;

								const contentOfForBlock = this.editor.state.doc
									.toString()
									.slice(forBlock.node.from, forBlock.node.to);

								const blockMatch = contentOfForBlock.match(
									new RegExp(`${itemVarName}\.(\\w+)(\\s*)=(\\s*)`),
								);

								if (blockMatch) {
									lintings.push({
										from: forBlock.from,
										to: forBlock.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.allItems.$inputDotAll.improperlySet'),
									});
								}
							}
						}

						if (node.name === 'ReturnStatement' && this.isFinalReturn(node)) {
							const returnNode = node.node.getChild('return');

							if (!returnNode) return;

							/**
							 * Lint for incorrect `return` (no return value) in final line.
							 */
							if (!returnNode.nextSibling) {
								const message =
									this.mode === 'runOnceForAllItems'
										? this.$locale.baseText('codeNodeEditor.lintings.allItems.noOutput')
										: this.$locale.baseText('codeNodeEditor.lintings.eachItem.notObject');

								lintings.push({
									from: node.from,
									to: node.to,
									severity: 'warning',
									message,
								});
							} else {
								const [returnValueText] = this.editor.state.doc.slice(
									returnNode.nextSibling.from,
									returnNode.nextSibling.to,
								);

								/**
								 * Lint for incorrect `return;` (no return value, with semicolon) in final line.
								 */
								if (!returnValueText || returnValueText === ';') {
									const message =
										this.mode === 'runOnceForAllItems'
											? this.$locale.baseText('codeNodeEditor.lintings.allItems.noOutput')
											: this.$locale.baseText('codeNodeEditor.lintings.eachItem.notObject');

									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message,
									});
								}

								/**
								 * Lint for incorrect array in final line.
								 */
								if (returnValueText.startsWith('[') && this.mode === 'runOnceForEachItem') {
									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.eachItem.notObject'),
									});
								}
							}
						}
					});

				return lintings;
			};

			return linter(lintSource);
		},
	},
});
