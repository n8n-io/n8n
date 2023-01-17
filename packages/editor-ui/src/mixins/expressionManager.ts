import mixins from 'vue-typed-mixins';
import { EXPRESSION_RESOLUTION_ERROR_CODES as ERROR_CODES } from 'n8n-workflow';
import { mapStores } from 'pinia';
import { ensureSyntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { Completion } from '@codemirror/autocomplete';

import { i18n } from '@/plugins/i18n';
import { workflowHelpers } from '@/mixins/workflowHelpers';
import { n8nLang } from '@/plugins/codemirror/n8nLang';
import { useNDVStore } from '@/stores/ndv';
import { EXPRESSION_EDITOR_PARSER_TIMEOUT } from '@/constants';
import { completionPreviewEventBus } from '@/event-bus/completion-preview-event-bus';

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
			errorsInSuccession: 0, // @TODO: No longer used?
		};
	},
	watch: {
		isCursorAtCompletablePrefix() {
			// @TODO: Overrides output but is not a preview, so improve naming
			completionPreviewEventBus.$emit('preview-completion', this.segments);
		},
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

			return this.toSegments(this.editor.state);
		},

		cursorPosition(): number {
			if (!this.editor) return -1;

			return this.editor.state.selection.ranges[0].from;
		},

		/**
		 * Whether cursor position is at `{{ $| }}`.
		 */
		isCursorAtCompletablePrefix(): boolean {
			if (!this.editor) return false;

			return (
				this.editor.state.doc
					.slice(this.cursorPosition - '{{ $'.length, this.cursorPosition + ' }}'.length)
					.toString() === '{{ $ }}'
			);
		},

		// @TODO: No longer used?
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
		toSegments(state: EditorState, { isPreview } = { isPreview: false }) {
			const rawSegments: RawSegment[] = [];

			const fullTree = ensureSyntaxTree(state, state.doc.length, EXPRESSION_EDITOR_PARSER_TIMEOUT);

			if (fullTree === null) {
				throw new Error(`Failed to parse expression: ${state.doc.toString()}`);
			}

			fullTree.cursor().iterate((node) => {
				if (!this.editor || node.type.name === 'Program') return;

				rawSegments.push({
					from: node.from,
					to: node.to,
					text: state.sliceDoc(node.from, node.to),
					token: node.type.name,
				});
			});

			return rawSegments.reduce<Segment[]>((acc, segment) => {
				const { from, to, text, token } = segment;

				if (token === 'Plaintext') {
					return acc.push({ kind: 'plaintext', from, to, plaintext: text }), acc;
				}

				let { resolved, error, fullError } = this.resolve(text, this.hoveringItem);

				/**
				 * If this is a preview of an uncalled function, call it and display it
				 * with a hint `[if called:] [result]` if the call succeeds
				 */
				if (
					isPreview &&
					hasErrorCode(fullError) &&
					fullError.cause.code === ERROR_CODES.UNCALLED_FUNCTION
				) {
					const textWithCall = text.replace(/\s{1}}}$/, '() }}'); // @TODO: Improve this replacement
					const resultWithCall = this.resolve(textWithCall, this.hoveringItem);

					const hint = this.$locale.baseText('expressionEditor.previewHint');

					if (!resultWithCall.error) {
						resolved = [hint, resultWithCall.resolved].join(' ');
						error = false;
						fullError = null;
					} else {
						fullError = new Error(i18n.expressionEditor.previewUnavailable);
						resolved = fullError.message;
					}
				}

				if (
					this.isCursorAtCompletablePrefix &&
					hasErrorCode(fullError) &&
					fullError.cause.code === ERROR_CODES.N8N_PREFIX
				) {
					fullError = new Error(i18n.expressionEditor.completablePrefix);
					resolved = fullError.message;
				}

				acc.push({ kind: 'resolvable', from, to, resolvable: text, resolved, error, fullError });

				return acc;
			}, []);
		},

		toPreviewSegments(completion: Completion, state: EditorState) {
			if (!this.editor) return [];

			const cursorPosition = state.selection.ranges[0].from;

			const firstHalf = state.doc.slice(0, cursorPosition).toString();
			const secondHalf = state.doc.slice(cursorPosition, state.doc.length).toString();

			const previewDoc = [
				firstHalf,
				firstHalf.endsWith('$') ? completion.label.slice(1) : completion.label,
				secondHalf,
			].join('');

			const previewState = EditorState.create({
				doc: previewDoc,
				extensions: [n8nLang()],
			});

			return this.toSegments(previewState, { isPreview: true });
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

			if (result.resolved === undefined && /\{\{\s*\}\}/.test(resolvable)) {
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

function hasErrorCode(error: Error | null): error is Error & { cause: { code: number } } {
	return (
		error instanceof Error &&
		typeof error.cause === 'object' &&
		error.cause !== null &&
		'code' in error.cause
	);
}
