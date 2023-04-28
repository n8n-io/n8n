<template>
	<div
		:class="$style['code-node-editor-container']"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
		ref="codeNodeEditorContainer"
	>
		<div ref="codeNodeEditor" class="ph-no-capture"></div>
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

import { Compartment, EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';

import { baseExtensions } from './baseExtensions';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import { CODE_NODE_EDITOR_THEME } from './theme';
import { workflowHelpers } from '@/mixins/workflowHelpers'; // for json field completions
import { ASK_AI_MODAL_KEY, CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { ALL_ITEMS_PLACEHOLDER, EACH_ITEM_PLACEHOLDER } from './constants';
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
		jsCode: {
			type: String,
		},
	},
	data() {
		return {
			editor: null as EditorView | null,
			linterCompartment: new Compartment(),
			isEditorHovered: false,
			isEditorFocused: false,
		};
	},
	watch: {
		mode() {
			this.reloadLinter();
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
		onMouseOver(event: MouseEvent) {
			const fromElement = event.relatedTarget as HTMLElement;
			const ref = this.$refs.codeNodeEditorContainer as HTMLDivElement | undefined;

			if (!ref?.contains(fromElement)) this.isEditorHovered = true;
		},
		onMouseOut(event: MouseEvent) {
			const fromElement = event.relatedTarget as HTMLElement;
			const ref = this.$refs.codeNodeEditorContainer as HTMLDivElement | undefined;

			if (!ref?.contains(fromElement)) this.isEditorHovered = false;
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

			if (!this.content.trim() || this.content.trim() === this.previousPlaceholder) {
				this.editor.dispatch({
					changes: { from: 0, to: this.content.length, insert: this.placeholder },
				});
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
			this.linterCompartment.of(this.linterExtension()),
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
			}),
		];

		// empty on first load, default param value
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

<style lang="scss" module>
.code-node-editor-container {
	position: relative;
}

.ask-ai-button {
	position: absolute;
	top: var(--spacing-2xs);
	right: var(--spacing-2xs);
}
</style>
