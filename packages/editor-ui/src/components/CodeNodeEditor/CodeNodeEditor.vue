<template>
	<div
		:class="$style['code-node-editor-container']"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
		ref="codeNodeEditorContainer"
	>
		<div ref="codeNodeEditor" class="ph-no-capture" :class="{ [$style['max-height']]: true }"></div>
		<n8n-button
			v-if="isCloud && (isEditorHovered || isEditorFocused)"
			size="small"
			type="tertiary"
			:class="$style['ask-ai-button']"
			@mousedown="onAskAiButtonClick"
		>
			{{ $locale.baseText('codeNodeEditor.askAi') }}
		</n8n-button>
	</div>
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
import { ASK_AI_MODAL_KEY, CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRootStore';
import Modal from '../Modal.vue';
import { useSettingsStore } from '@/stores/settings';

export default mixins(linterExtension, completerExtension, workflowHelpers).extend({
	name: 'code-node-editor',
	components: { Modal },
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
			isEditorHovered: false,
			isEditorFocused: false,
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
		isCloud() {
			return useSettingsStore().deploymentType === 'cloud';
		},
		content(): string {
			if (!this.editor) return '';

			return this.editor.state.doc.toString();
		},
	},
	methods: {
		onMouseOver(event: MouseEvent) {
			const fromElement = event.relatedTarget as HTMLElement;
			const ref = this.$refs.codeNodeEditorContainer as HTMLDivElement;

			if (!ref.contains(fromElement)) this.isEditorHovered = true;
		},
		onMouseOut(event: MouseEvent) {
			const fromElement = event.relatedTarget as HTMLElement;
			const ref = this.$refs.codeNodeEditorContainer as HTMLDivElement;

			if (!ref.contains(fromElement)) this.isEditorHovered = false;
		},
		onAskAiButtonClick() {
			this.$telemetry.track('User clicked ask ai button', { source: 'code' });

			this.uiStore.openModal(ASK_AI_MODAL_KEY);
		},
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
		codeNodeEditorEventBus.off('error-line-number', this.highlightLine);
	},
	mounted() {
		codeNodeEditorEventBus.on('error-line-number', this.highlightLine);

		const stateBasedExtensions = [
			EditorState.readOnly.of(this.isReadOnly),
			EditorView.domEventHandlers({
				focus: () => {
					this.isEditorFocused = true;
				},
				blur: () => {
					this.isEditorFocused = false;
				},
			}),
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

		const resolvedValue = this.value === '' ? this.defaultValue : this.value;

		let editorSettings: EditorStateConfig;
		if (this.language === 'python') {
			editorSettings = {
				doc: resolvedValue,
				extensions: [
					...baseExtensions,
					...stateBasedExtensions,
					codeNodeEditorTheme({ maxHeight: this.maxHeight }),
					python(),
				],
			};
		} else if (this.language === 'json') {
			editorSettings = {
				doc: resolvedValue,
				extensions: [
					...baseExtensions,
					...stateBasedExtensions,
					codeNodeEditorTheme({ maxHeight: this.maxHeight }),
					json(),
				],
			};
		} else {
			editorSettings = {
				doc: resolvedValue,
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
.code-node-editor-container {
	position: relative;

	& > div {
		height: 100%;
	}
}

.ask-ai-button {
	position: absolute;
	top: var(--spacing-2xs);
	right: var(--spacing-2xs);
}
</style>
