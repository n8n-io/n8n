import mixins from 'vue-typed-mixins';
import { mapStores } from 'pinia';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useNDVStore } from '@/stores/ndv';
import { EXPRESSION_EDITOR_PARSER_TIMEOUT } from '@/constants';

import type { PropType } from 'vue';
import type { EditorView } from '@codemirror/view';
import type { TargetItem } from '@/Interface';
import type { Plaintext, RawSegment, Resolvable, Segment } from '@/types/expressions';

export const expressionManager = mixins(workflowHelpers).extend({
	props: {
		targetItem: {
			type: Object as PropType<TargetItem | null>,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			errorsInSuccession: 0,
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

		segments(): Segment[] {
			if (!this.editor) return [];

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
				if (!this.editor || node.type.name === 'Program') return;

				rawSegments.push({
					from: node.from,
					to: node.to,
					text: this.editor.state.sliceDoc(node.from, node.to),
					type: node.type.name,
				});
			});

			return rawSegments.reduce<Segment[]>((acc, segment) => {
				const { from, to, text, type } = segment;

				if (type === 'Resolvable') {
					const { resolved, error, fullError } = this.resolve(text, this.hoveringItem);

					acc.push({ kind: 'resolvable', from, to, resolvable: text, resolved, error, fullError });

					return acc;
				}

				acc.push({ kind: 'plaintext', from, to, plaintext: text });

				return acc;
			}, []);
		},

		evaluationDelay() {
			const DEFAULT_EVALUATION_DELAY = 300; // ms

			const prevErrorsInSuccession = this.errorsInSuccession;

			if (this.resolvableSegments.filter((s) => s.error).length > 0) {
				this.errorsInSuccession += 1;
			} else {
				this.errorsInSuccession = 0;
			}

			const addsNewError = this.errorsInSuccession > prevErrorsInSuccession;

			let delay = DEFAULT_EVALUATION_DELAY;

			if (addsNewError && this.errorsInSuccession > 1 && this.errorsInSuccession < 5) {
				delay = DEFAULT_EVALUATION_DELAY * this.errorsInSuccession;
			} else if (addsNewError && this.errorsInSuccession >= 5) {
				delay = 0;
			}

			return delay;
		},

		/**
		 * Some segments are conditionally displayed, i.e. not displayed when they are
		 * _part_ of the result, but displayed when they are the _entire_ result.
		 *
		 * Example:
		 * - Expression `This is a {{ [] }} test` is displayed as `This is a test`.
		 * - Expression `{{ [] }}` is displayed as `[Array: []]`.
		 *
		 * Conditionally displayed segments:
		 * - `[Array: []]`
		 * - `[empty]` (from `''`, not from `undefined`)
		 *
		 * Exceptionally, for two segments, display differs based on context:
		 * - Date is displayed as
		 *   - `Mon Nov 14 2022 17:26:13 GMT+0100 (CST)` when part of the result
		 *   - `[Object: "2022-11-14T17:26:13.130Z"]` when the entire result
		 * - Non-empty array is displayed as
		 *   - `1,2,3` when part of the result
		 *   - `[Array: [1, 2, 3]]` when the entire result
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
				result.resolved = this.resolveExpression('=' + resolvable, undefined, {
					targetItem: targetItem ?? undefined,
					inputNodeName: this.ndvStore.ndvInputNodeName,
					inputRunIndex: this.ndvStore.ndvInputRunIndex,
					inputBranchIndex: this.ndvStore.ndvInputBranchIndex,
				});
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
				result.resolved = this.$locale.baseText('expressionModalInput.undefined');
				result.error = true;
			}

			if (typeof result.resolved === 'number' && isNaN(result.resolved)) {
				result.resolved = this.$locale.baseText('expressionModalInput.null');
			}

			return result;
		},
	},
});
