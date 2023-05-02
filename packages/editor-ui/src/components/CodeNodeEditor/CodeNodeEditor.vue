<template>
	<div
		:class="['code-node-editor', $style['code-node-editor-container']]"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
		ref="codeNodeEditorContainer"
	>
		<div ref="codeNodeEditor" class="code-node-editor-input ph-no-capture"></div>
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
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import mixins from 'vue-typed-mixins';

import type { Extension } from '@codemirror/state';
import { Compartment, EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';

import { readOnlyEditorExtensions, writableEditorExtensions } from './baseExtensions';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import { codeNodeEditorTheme } from './theme';
import { workflowHelpers } from '@/mixins/workflowHelpers'; // for json field completions
import { ASK_AI_MODAL_KEY, CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import {
	ALL_ITEMS_PLACEHOLDER,
	CODE_LANGUAGES,
	CODE_MODES,
	EACH_ITEM_PLACEHOLDER,
} from './constants';
import { useRootStore } from '@/stores/n8nRootStore';
import Modal from '../Modal.vue';
import { useSettingsStore } from '@/stores/settings';
import type { CodeLanguage, CodeMode } from './types';

const placeholders: Partial<Record<CodeLanguage, Record<CodeMode, string>>> = {
	javaScript: {
		runOnceForAllItems: ALL_ITEMS_PLACEHOLDER,
		runOnceForEachItem: EACH_ITEM_PLACEHOLDER,
	},
};

export default mixins(linterExtension, completerExtension, workflowHelpers).extend({
	name: 'code-node-editor',
	components: { Modal },
	props: {
		mode: {
			type: String as PropType<CodeMode>,
			validator: (value: CodeMode): boolean => CODE_MODES.includes(value),
		},
		language: {
			type: String as PropType<CodeLanguage>,
			default: 'javaScript' as CodeLanguage,
			validator: (value: CodeLanguage): boolean => CODE_LANGUAGES.includes(value),
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		value: {
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
		mode(newMode, previousMode: CodeMode) {
			this.reloadLinter();

			if (this.content.trim() === placeholders[this.language]?.[previousMode]) {
				this.refreshPlaceholder();
			}
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
			return placeholders[this.language]?.[this.mode] ?? '';
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

			const linter = this.createLinter(this.language);
			if (linter) {
				this.editor.dispatch({
					effects: this.linterCompartment.reconfigure(linter),
				});
			}
		},
		refreshPlaceholder() {
			if (!this.editor) return;

			this.editor.dispatch({
				changes: { from: 0, to: this.content.length, insert: this.placeholder },
			});
		},
		highlightLine(line: number | 'final') {
			if (!this.editor) return;

			if (line === 'final') {
				this.editor.dispatch({
					selection: { anchor: this.content.length },
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
		if (!this.isReadOnly) codeNodeEditorEventBus.off('error-line-number', this.highlightLine);
	},
	mounted() {
		if (!this.isReadOnly) codeNodeEditorEventBus.on('error-line-number', this.highlightLine);

		// empty on first load, default param value
		if (!this.value) {
			this.$emit('valueChanged', this.placeholder);
		}

		const { isReadOnly, language } = this;
		const extensions: Extension[] = [
			...readOnlyEditorExtensions,
			EditorState.readOnly.of(isReadOnly),
			EditorView.editable.of(!isReadOnly),
			codeNodeEditorTheme({ isReadOnly }),
		];

		if (!isReadOnly) {
			const linter = this.createLinter(language);
			if (linter) {
				extensions.push(this.linterCompartment.of(linter));
			}

			extensions.push(
				...writableEditorExtensions,
				EditorView.domEventHandlers({
					focus: () => {
						this.isEditorFocused = true;
					},
					blur: () => {
						this.isEditorFocused = false;
					},
				}),
				EditorView.updateListener.of((viewUpdate) => {
					if (!viewUpdate.docChanged) return;

					this.trackCompletion(viewUpdate);

					this.$emit('valueChanged', this.editor?.state.doc.toString());
				}),
			);
		}

		switch (language) {
			case 'json':
				extensions.push(json());
				break;
			case 'javaScript':
				extensions.push(javascript(), this.autocompletionExtension());
				break;
		}

		const state = EditorState.create({
			doc: this.value || this.placeholder,
			extensions,
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
