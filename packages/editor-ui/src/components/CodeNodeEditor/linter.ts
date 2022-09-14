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

				// @TODO: Lint for missing final `ReturnStatement` node

				syntaxTree(editorView.state)
					.cursor()
					.iterate((node) => {
						if (!this.editor) return;

						if (node.name === 'VariableName') {
							const [varText] = this.editor.state.doc.slice(node.from, node.to);

							if (varText === '$input' && this.mode === 'runOnceForAllItems') {
								if (!node.node.nextSibling) return;

								// current: $input
								// next: .
								// next: method
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

								if (returnValueText === '[]' && this.mode === 'runOnceForEachItem') {
									lintings.push({
										from: node.from,
										to: node.to,
										severity: 'warning',
										message: this.$locale.baseText('codeNodeEditor.lintings.eachItem.arrayOutput'),
									});
								}

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
