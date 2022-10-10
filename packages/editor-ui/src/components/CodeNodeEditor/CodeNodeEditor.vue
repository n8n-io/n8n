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
import { CODE_NODE_EDITOR_THEME } from './theme';
import { workflowHelpers } from '../mixins/workflowHelpers'; // for json field completions
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
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
		jsCodeAllItems: {
			type: String,
		},
		jsCodeEachItem: {
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
			this.reloadLinter();
		},
	},
	computed: {
		content(): string {
			if (!this.editor) return '';

			return this.editor.state.doc.toString();
		},
	},
	methods: {
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
		trackCompletion(viewUpdate: ViewUpdate) {
			const completionTx = viewUpdate.transactions.find((tx) => tx.isUserEvent('input.complete'));

			if (!completionTx) return;

			try {
				// @ts-ignore - undocumented fields
				const { fromA, toA, toB } = viewUpdate?.changedRanges[0];
				const context = this.content.slice(fromA, toA);
				const insertedText = this.content.slice(toA, toB);
				const fieldName = this.mode === 'runOnceForAllItems' ? 'jsCodeAllItems' : 'jsCodeEachItem';

				this.$telemetry.track('User autocompleted code', {
					instance_id: this.$store.getters.instanceId,
					node_type: CODE_NODE_TYPE,
					field_name: fieldName,
					field_type: 'code',
					context,
					inserted_text: insertedText,
				});
			} catch (_) {}
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

				this.trackCompletion(viewUpdate);

				this.$emit('valueChanged', this.content);
			}),
		];

		const doc = this.mode === 'runOnceForAllItems' ? this.jsCodeAllItems : this.jsCodeEachItem;

		const state = EditorState.create({
			doc,
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
