<template>
	<div ref="root" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { history } from '@codemirror/commands';
import { syntaxTree } from '@codemirror/language';
import { mapStores } from 'pinia';

import { workflowHelpers } from '@/mixins/workflowHelpers';
import { useNDVStore } from '@/stores/ndv';
import { n8nLanguageSupport } from './n8nLanguageSupport';
import { braceHandler } from './braceHandler';
import { EXPRESSION_EDITOR_THEME } from './inputTheme';
import { addColor, removeColor } from './colorDecorations';

// import type { IVariableItemSelected } from '@/Interface'; // removed
import type { RawSegment, Segment, Resolvable, Plaintext } from './types';
import type { TargetItem } from '@/Interface';
import type { PropType } from 'vue';

const EVALUATION_DELAY = 300; // ms

export default mixins(workflowHelpers).extend({
	name: 'InlineExpressionEditorInput',
	props: {
		value: {
			type: String,
		},
		targetItem: {
			type: Object as PropType<TargetItem | null>,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			errorsInSuccession: 0,
			cursor: 0,
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
		value(newValue) {
			try {
				this.editor?.dispatch({
					changes: {
						from: 0,
						to: this.editor.state.doc.length,
						insert: newValue,
					},
					selection: { anchor: this.cursor, head: this.cursor },
				});
			} catch (_) {} // ignore range error from dropping on prepopulated field
		},
	},
	mounted() {
		const extensions = [
			EXPRESSION_EDITOR_THEME,
			n8nLanguageSupport(),
			history(),
			braceHandler(),
			EditorView.lineWrapping,

			// new ---------
			EditorView.editable.of(!this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.$emit('focus');
				},
			}),
			// this.editor.focus() removed once below
			// itemSelected removed below
			// new -----------
			EditorView.updateListener.of((viewUpdate) => {
				if (!this.editor || !viewUpdate.docChanged) return;

				removeColor(this.editor, this.plaintextSegments);

				addColor(this.editor, this.resolvableSegments);

				const prevErrorsInSuccession = this.errorsInSuccession;

				if (this.resolvableSegments.filter((s) => s.error).length > 0) {
					this.errorsInSuccession += 1;
				} else {
					this.errorsInSuccession = 0;
				}

				const addsNewError = this.errorsInSuccession > prevErrorsInSuccession;

				let delay = EVALUATION_DELAY;

				if (addsNewError && this.errorsInSuccession > 1 && this.errorsInSuccession < 5) {
					delay = EVALUATION_DELAY * this.errorsInSuccession;
				} else if (addsNewError && this.errorsInSuccession >= 5) {
					delay = 0;
				}

				// @TODO: Remove logging after review
				// console.log(`content: ${this.unresolvedExpression} // delay: ${delay} // errorsInSuccession: ${this.errorsInSuccession}`);

				this.cursor = viewUpdate.view.state.selection.ranges[0].from;

				setTimeout(() => {
					this.editor?.focus();
				});

				setTimeout(() => {
					this.$emit('change', {
						value: this.unresolvedExpression,
						segments: this.displayableSegments,
					});
				}, delay);
			}),
		];

		this.editor = new EditorView({
			parent: this.$refs.root as HTMLDivElement,
			state: EditorState.create({
				doc: this.value.startsWith('=') ? this.value.slice(1) : this.value,
				extensions,
			}),
		});

		addColor(this.editor, this.resolvableSegments);

		this.editor.dispatch({
			selection: { anchor: this.editor.state.doc.length },
		});

		this.$emit('change', { value: this.unresolvedExpression, segments: this.displayableSegments });
	},
	destroyed() {
		this.editor?.destroy();
	},
	computed: {
		...mapStores(useNDVStore),
		unresolvedExpression(): string {
			return this.segments.reduce((acc, segment) => {
				acc += segment.kind === 'resolvable' ? segment.resolvable : segment.plaintext;

				return acc;
			}, '=');
		},
		resolvableSegments(): Resolvable[] {
			return this.segments.filter((s): s is Resolvable => s.kind === 'resolvable');
		},
		plaintextSegments(): Plaintext[] {
			return this.segments.filter((s): s is Plaintext => s.kind === 'plaintext');
		},

		/**
		 * Some segments are conditionally displayed, i.e. not displayed when part of the
		 * expression result but displayed when the entire result.
		 *
		 * Example:
		 * - Expression `This is a {{ null }} test` is displayed as `This is a test`.
		 * - Expression `{{ null }}` is displayed as `[Object: null]`.
		 *
		 * Conditionally displayed segments:
		 * - `[Object: null]`
		 * - `[Array: []]`
		 * - `[empty]` (from `''`, not from `undefined`)
		 * - `null` (from `NaN`)
		 *
		 * For these two segments, display differs based on context:
		 * - Date displayed as
		 *   - `Mon Nov 14 2022 17:26:13 GMT+0100 (CST)` when part of the result
		 *   - `[Object: "2022-11-14T17:26:13.130Z"]` when the entire result
		 * - Non-empty array displayed as
		 *   - `1,2,3` when part of the result
		 *   - `[Array: [1, 2, 3]]` when the entire result
		 *
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
						(['[Object: null]', '[Array: []]'].includes(s.resolved) ||
							s.resolved === '[empty]' ||
							s.resolved === 'null')
					) {
						return false;
					}

					return true;
				});
		},
		segments(): Segment[] {
			if (!this.editor) return [];

			const rawInputSegments: RawSegment[] = [];

			syntaxTree(this.editor.state)
				.cursor()
				.iterate((node) => {
					if (!this.editor || node.type.name === 'Program') return;

					rawInputSegments.push({
						from: node.from,
						to: node.to,
						text: this.editor.state.sliceDoc(node.from, node.to),
						type: node.type.name,
					});
				});

			return rawInputSegments.reduce<Segment[]>((acc, segment) => {
				const { from, to, text, type } = segment;

				if (type === 'Resolvable') {
					const { resolved, error } = this.resolve(text);

					acc.push({ kind: 'resolvable', from, to, resolvable: text, resolved, error });

					return acc;
				}

				// broken resolvable included in plaintext

				acc.push({ kind: 'plaintext', from, to, plaintext: text });

				return acc;
			}, []);
		},
	},
	methods: {
		focus() {
			this.editor?.focus();
		},
		isEmptyExpression(resolvable: string) {
			return /\{\{\s*\}\}/.test(resolvable);
		},
		resolve(resolvable: string) {
			const result: { resolved: unknown; error: boolean } = { resolved: undefined, error: false };

			try {
				result.resolved = this.resolveExpression('=' + resolvable, undefined, {
					targetItem: this.targetItem ?? undefined,
					inputNodeName: this.ndvStore.ndvInputNodeName,
					inputRunIndex: this.ndvStore.ndvInputRunIndex,
					inputBranchIndex: this.ndvStore.ndvInputBranchIndex,
				});
			} catch (error) {
				result.resolved = `[${error.message}]`;
				result.error = true;
			}

			if (result.resolved === '') {
				result.resolved = '[empty]';
			}

			if (result.resolved === undefined && this.isEmptyExpression(resolvable)) {
				result.resolved = '[empty]';
			}

			if (result.resolved === undefined) {
				result.resolved = '[undefined]';
				result.error = true;
			}

			if (typeof result.resolved === 'number' && isNaN(result.resolved)) {
				result.resolved = 'null';
			}

			return result;
		},
	},
});
</script>

<style lang="scss"></style>
