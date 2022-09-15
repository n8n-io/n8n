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
										from: node.from,
										to: methodNode.to,
										severity: 'warning',
										message: this.$locale.baseText(
											'codeNodeEditor.lintings.allItems.$inputDotItem',
										),
									});
								}
							}

							/**
							 * Lint for incorrect `.all` in `runOnceForEachItem` mode
							 */
							if (varText === '$input' && this.mode === 'runOnceForEachItem') {
								if (!node.node.nextSibling) return;

								// current: $input, next: . (period), next: method
								const methodNode = node.node.nextSibling.node.nextSibling;

								if (!methodNode) return;

								const method = this.editor.state.doc
									.toString()
									.slice(methodNode.from, methodNode.to);

								if (method === 'all') {
									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.eachItem.$inputDotAll'),
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
										: this.$locale.baseText('codeNodeEditor.lintings.eachItem.noOutput');

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
											: this.$locale.baseText('codeNodeEditor.lintings.eachItem.noOutput');

									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message,
									});
								}

								/**
								 * Lint for incorrect `[]` in final line.
								 */
								if (returnValueText === '[]' && this.mode === 'runOnceForEachItem') {
									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.eachItem.arrayOutput'),
									});
								}

								/**
								 * Lint for incorrect `{}` in final line.
								 */
								if (returnValueText === '{}' && this.mode === 'runOnceForAllItems') {
									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.allItems.objectOutput'),
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
