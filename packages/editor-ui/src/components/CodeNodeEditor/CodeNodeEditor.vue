<template>
	<div ref="codeNodeEditor" :class="{ [$style['max-height']]: true }" class="ph-no-capture"></div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { Compartment, EditorState, EditorStateConfig } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { json } from '@codemirror/lang-json';

import { baseExtensions } from './baseExtensions';
import { linterExtension } from './languages/javaScript/linter';
import { completerExtension } from './languages/javaScript/completer';
import { codeNodeEditorTheme } from './theme';
import { workflowHelpers } from '@/mixins/workflowHelpers'; // for json field completions
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
import { CODE_NODE_TYPE } from '@/constants';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRootStore';

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
		maxHeight: {
			type: Boolean,
			default: false,
		},
		value: {
			type: String,
		},
		defaultValue: {
			type: String,
		},
		language: {
			type: String,
			default: 'javaScript',
			validator: (value: string): boolean => ['javaScript', 'json', 'python'].includes(value),
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			linterCompartment: new Compartment(),
			isDefault: false,
		};
	},
	watch: {
		mode() {
			this.reloadLinter();
			this.refreshPlaceholder();
		},
		language() {
			this.refreshPlaceholder();
		},
	},
	computed: {
		...mapStores(useRootStore),
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
		refreshPlaceholder() {
			if (!this.editor) return;

			if (!this.content.trim() || this.isDefault) {
				this.editor.dispatch({
					changes: { from: 0, to: this.content.length, insert: this.defaultValue },
				});
				this.isDefault = true;
			}
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
				const { fromA, toB } = viewUpdate?.changedRanges[0];
				const full = this.content.slice(fromA, toB);
				const lastDotIndex = full.lastIndexOf('.');

				let context = null;
				let insertedText = null;

				if (lastDotIndex === -1) {
					context = '';
					insertedText = full;
				} else {
					context = full.slice(0, lastDotIndex);
					insertedText = full.slice(lastDotIndex + 1);
				}

				// TODO: Still has to get updated for Python and JSON
				this.$telemetry.track('User autocompleted code', {
					instance_id: this.rootStore.instanceId,
					node_type: CODE_NODE_TYPE,
					field_name: this.mode === 'runOnceForAllItems' ? 'jsCodeAllItems' : 'jsCodeEachItem',
					field_type: 'code',
					context,
					inserted_text: insertedText,
				});
			} catch {}
		},
	},
	destroyed() {
		codeNodeEditorEventBus.$off('error-line-number', this.highlightLine);
	},
	mounted() {
		codeNodeEditorEventBus.$on('error-line-number', this.highlightLine);

		const stateBasedExtensions = [
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.updateListener.of((viewUpdate: ViewUpdate) => {
				if (!viewUpdate.docChanged) return;
				this.trackCompletion(viewUpdate);
				this.$emit('valueChanged', this.content);
				this.isDefault = this.content === this.defaultValue;
			}),
		];

		// empty on first load, default param value
		if (this.value === '') {
			this.$emit('valueChanged', this.defaultValue);
		}

		this.isDefault = this.value === this.defaultValue;

		const value = this.value === '' ? this.defaultValue : this.value;

		let editorSettings: EditorStateConfig;
		if (this.language === 'python') {
			editorSettings = {
				doc: value,
				extensions: [
					...baseExtensions,
					...stateBasedExtensions,
					codeNodeEditorTheme({ maxHeight: this.maxHeight }),
					python(),
				],
			};
		} else if (this.language === 'json') {
			editorSettings = {
				doc: value,
				extensions: [
					...baseExtensions,
					...stateBasedExtensions,
					codeNodeEditorTheme({ maxHeight: this.maxHeight }),
					json(),
				],
			};
		} else {
			editorSettings = {
				doc: value,
				extensions: [
					this.linterCompartment.of(this.linterExtension()),
					...baseExtensions,
					...stateBasedExtensions,
					codeNodeEditorTheme({ maxHeight: this.maxHeight }),
					javascript(),
					this.autocompletionExtension(),
				],
			};
		}

		const state = EditorState.create(editorSettings);

		this.editor = new EditorView({
			parent: this.$refs.codeNodeEditor as HTMLDivElement,
			state,
		});
	},
});
</script>

<style lang="scss" module>
.max-height {
	height: 100%;
}
</style>
