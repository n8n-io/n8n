<template>
	<div ref="codeNodeEditor" />
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

import { baseExtensions } from './baseExtensions';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import { workflowHelpers } from '../mixins/workflowHelpers';
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
import { CODE_NODE_EDITOR_THEME } from './theme';
import { ALL_ITEMS_PLACEHOLDER, EACH_ITEM_PLACEHOLDER } from './constants';
import { CODE_NODE_TYPE } from '@/constants';

export default mixins(linterExtension, completerExtension, workflowHelpers).extend({
	name: 'code-node-editor',
	props: {
		mode: {
			type: String,
			validator: (value: string): boolean =>
				['runOnceForAllItems', 'runOnceForEachItem'].includes(value),
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		jsCode: {
			type: String,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			linterCompartment: new Compartment(),
		};
	},
	watch: {
		mode() {
			this.refreshPlaceholder();
			this.reloadLinter();
		},
	},
	computed: {
		content(): string {
			if (!this.editor) return '';

			return this.editor.state.doc.toString();
		},
		placeholder(): string {
			return {
				runOnceForAllItems: ALL_ITEMS_PLACEHOLDER,
				runOnceForEachItem: EACH_ITEM_PLACEHOLDER,
			}[this.mode];
		},
		previousPlaceholder(): string {
			return {
				runOnceForAllItems: EACH_ITEM_PLACEHOLDER,
				runOnceForEachItem: ALL_ITEMS_PLACEHOLDER,
			}[this.mode];
		},
	},
	methods: {
		refreshPlaceholder() {
			if (!this.editor) return;

			if (!this.content.trim() || this.content.trim() === this.previousPlaceholder) {
				this.editor.dispatch({
					changes: { from: 0, to: this.content.length, insert: this.placeholder },
				});
			}
		},
		reloadLinter() {
			if (!this.editor) return;

			this.editor.dispatch({
				effects: this.linterCompartment.reconfigure(this.linterExtension()),
			});
		},
		highlightLine(line: number | 'final') {
			if (!this.editor) return;

			if (line === 'final') {
				this.editor.dispatch({
					selection: { anchor: this.content.trim().length },
				});
				return;
			}

			this.editor.dispatch({
				selection: { anchor: this.editor.state.doc.line(line).from },
			});
		},
	},
	destroyed() {
		codeNodeEditorEventBus.$off('error-line-number', this.highlightLine);
	},
	mounted() {
		codeNodeEditorEventBus.$on('error-line-number', this.highlightLine);

		const stateBasedExtensions = [
			this.linterCompartment.of(this.linterExtension()),
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (!viewUpdate.docChanged) return;

				const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

				if (completionTx) {
					try {
						// @ts-ignore - undocumented field
						const { fromA, toA, toB } = viewUpdate?.changedRanges[0];
						const context = this.content.slice(fromA, toA);
						const insertedText = this.content.slice(toA, toB);

						this.$telemetry.track('User autocompleted code', {
							instance_id: this.$store.getters.instanceId,
							node_type: CODE_NODE_TYPE,
							field_name: 'jsCode',
							field_type: 'code',
							context,
							inserted_text: insertedText,
						});
					} catch (_) {}
				}

				this.$emit('valueChanged', this.content);
			}),
		];

		if (this.jsCode === '') {
			this.$emit('valueChanged', this.placeholder);
		}

		const state = EditorState.create({
			doc: this.jsCode === '' ? this.placeholder : this.jsCode,
			extensions: [
				...baseExtensions,
				...stateBasedExtensions,
				CODE_NODE_EDITOR_THEME,
				javascript(),
				this.autocompletionExtension(),
			],
		});

		this.editor = new EditorView({
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
			state,
		});
	},
});
</script>

<style lang="scss" scoped></style>
