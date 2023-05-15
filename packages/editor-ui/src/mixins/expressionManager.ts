import mixins from 'vue-typed-mixins';
import { Expression, ExpressionExtensions } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { ensureSyntaxTree } from '@codemirror/language';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useNDVStore } from '@/stores/ndv.store';
import { EXPRESSION_EDITOR_PARSER_TIMEOUT } from '@/constants';

import type { PropType } from 'vue';
import type { EditorView } from '@codemirror/view';
import type { TargetItem } from '@/Interface';
import type { Html, Plaintext, RawSegment, Resolvable, Segment } from '@/types/expressions';

export const expressionManager = mixins(workflowHelpers).extend({
	props: {
		targetItem: {
			type: Object as PropType<TargetItem | null>,
		},
	},
	data() {
		return {
			editor: {} as EditorView,
		};
	},
	watch: {
		targetItem() {
			setTimeout(() => {
				this.$emit('change', {
					value: this.unresolvedExpression,
					segments: this.displayableSegments,
				});
			});
		},
	},
	computed: {
		...mapStores(useNDVStore),

		unresolvedExpression(): string {
			return this.segments.reduce((acc, segment) => {
				acc += segment.kind === 'resolvable' ? segment.resolvable : segment.plaintext;

				return acc;
			}, '=');
		},

		hoveringItem(): TargetItem | undefined {
			return this.ndvStore.hoveringItem ?? undefined;
		},

		resolvableSegments(): Resolvable[] {
			return this.segments.filter((s): s is Resolvable => s.kind === 'resolvable');
		},

		plaintextSegments(): Plaintext[] {
			return this.segments.filter((s): s is Plaintext => s.kind === 'plaintext');
		},

		expressionExtensionNames(): Set<string> {
			return new Set(
				ExpressionExtensions.reduce<string[]>((acc, cur) => {
					return [...acc, ...Object.keys(cur.functions)];
				}, []),
			);
		},

		htmlSegments(): Html[] {
			return this.segments.filter((s): s is Html => s.kind !== 'resolvable');
		},

		segments(): Segment[] {
			const rawSegments: RawSegment[] = [];

			const fullTree = ensureSyntaxTree(
				this.editor.state,
				this.editor.state.doc.length,
				EXPRESSION_EDITOR_PARSER_TIMEOUT,
			);

			if (fullTree === null) {
				throw new Error(`Failed to parse expression: ${this.editor.state.doc.toString()}`);
			}

			fullTree.cursor().iterate((node) => {
				if (node.type.name === 'Program') return;

				rawSegments.push({
					from: node.from,
					to: node.to,
					text: this.editor.state.sliceDoc(node.from, node.to),
					token: node.type.name,
				});
			});

			return rawSegments.reduce<Segment[]>((acc, segment) => {
				const { from, to, text, token } = segment;

				if (token === 'Resolvable') {
					const { resolved, error, fullError } = this.resolve(text, this.hoveringItem);

					acc.push({ kind: 'resolvable', from, to, resolvable: text, resolved, error, fullError });

					return acc;
				}

				acc.push({ kind: 'plaintext', from, to, plaintext: text });

				return acc;
			}, []);
		},

		/**
		 * Segments to display in the output of an expression editor.
		 *
		 * Some segments are not displayed when they are _part_ of the result,
		 * but displayed when they are the _entire_ result:
		 *
		 * - `This is a {{ [] }} test` displays as `This is a test`.
		 * - `{{ [] }}` displays as `[Array: []]`.
		 *
		 * Some segments display differently based on context:
		 *
		 * Date displays as
		 * - `Mon Nov 14 2022 17:26:13 GMT+0100 (CST)` when part of the result
		 * - `[Object: "2022-11-14T17:26:13.130Z"]` when the entire result
		 *
		 * Only needed in order to mimic behavior of `ParameterInputHint`.
		 */
		displayableSegments(): Segment[] {
			return this.segments
				.map((s) => {
					if (this.segments.length <= 1 || s.kind !== 'resolvable') return s;

					if (typeof s.resolved === 'string' && /\[Object: "\d{4}-\d{2}-\d{2}T/.test(s.resolved)) {
						const utcDateString = s.resolved.replace(/(\[Object: "|\"\])/g, '');
						s.resolved = new Date(utcDateString).toString();
					}

					if (typeof s.resolved === 'string' && /\[Array:\s\[.+\]\]/.test(s.resolved)) {
						s.resolved = s.resolved.replace(/(\[Array: \[|\])/g, '');
					}

					return s;
				})
				.filter((s) => {
					if (
						this.segments.length > 1 &&
						s.kind === 'resolvable' &&
						typeof s.resolved === 'string' &&
						(s.resolved === '[Array: []]' ||
							s.resolved === this.$locale.baseText('expressionModalInput.empty'))
					) {
						return false;
					}

					return true;
				});
		},
	},
	methods: {
		isEmptyExpression(resolvable: string) {
			return /\{\{\s*\}\}/.test(resolvable);
		},

		resolve(resolvable: string, targetItem?: TargetItem) {
			const result: { resolved: unknown; error: boolean; fullError: Error | null } = {
				resolved: undefined,
				error: false,
				fullError: null,
			};

			try {
				const ndvStore = useNDVStore();
				if (!ndvStore.activeNode) {
					// e.g. credential modal
					result.resolved = Expression.resolveWithoutWorkflow(resolvable);
				} else {
					let opts;
					if (ndvStore.isInputParentOfActiveNode) {
						opts = {
							targetItem: targetItem ?? undefined,
							inputNodeName: this.ndvStore.ndvInputNodeName,
							inputRunIndex: this.ndvStore.ndvInputRunIndex,
							inputBranchIndex: this.ndvStore.ndvInputBranchIndex,
						};
					}
					result.resolved = this.resolveExpression('=' + resolvable, undefined, opts);
				}
			} catch (error) {
				result.resolved = `[${error.message}]`;
				result.error = true;
				result.fullError = error;
			}

			if (result.resolved === '') {
				result.resolved = this.$locale.baseText('expressionModalInput.empty');
			}

			if (result.resolved === undefined && this.isEmptyExpression(resolvable)) {
				result.resolved = this.$locale.baseText('expressionModalInput.empty');
			}

			if (result.resolved === undefined) {
				result.resolved = this.isUncalledExpressionExtension(resolvable)
					? this.$locale.baseText('expressionEditor.uncalledFunction')
					: this.$locale.baseText('expressionModalInput.undefined');

				result.error = true;
			}

			if (typeof result.resolved === 'number' && isNaN(result.resolved)) {
				result.resolved = this.$locale.baseText('expressionModalInput.null');
			}

			return result;
		},

		isUncalledExpressionExtension(resolvable: string) {
			const end = resolvable
				.replace(/^{{|}}$/g, '')
				.trim()
				.split('.')
				.pop();

			return end !== undefined && this.expressionExtensionNames.has(end);
		},
	},
});
