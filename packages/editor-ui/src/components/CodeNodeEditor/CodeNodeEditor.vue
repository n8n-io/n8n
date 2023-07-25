<template>
	<div
		:class="['code-node-editor', $style['code-node-editor-container'], language]"
		@mouseover="onMouseOver"
		@mouseout="onMouseOut"
		ref="codeNodeEditorContainer"
	>
		<el-tabs
			type="card"
			ref="tabs"
			v-model="activeTab"
			v-if="aiEnabled && language === 'javaScript'"
		>
			<el-tab-pane :label="$locale.baseText('codeNodeEditor.tabs.code')" name="code">
				<div ref="codeNodeEditor" class="code-node-editor-input ph-no-capture code-editor-tabs" />
			</el-tab-pane>
			<el-tab-pane :label="$locale.baseText('codeNodeEditor.tabs.askAi')" name="ask-ai">
				<AskAI @replaceCode="onReplaceCode" />
			</el-tab-pane>
		</el-tabs>
		<!-- If AskAi not enabled, there's no point in rendering tabs -->
		<div v-else ref="codeNodeEditor" class="code-node-editor-input ph-no-capture" />
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import jsParser from 'prettier/parser-babel';
import prettier from 'prettier/standalone';
import { mapStores } from 'pinia';
import type { LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { Compartment, EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import type { CodeExecutionMode, CodeNodeEditorLanguage } from 'n8n-workflow';
import { CODE_EXECUTION_MODES, CODE_LANGUAGES } from 'n8n-workflow';

import { workflowHelpers } from '@/mixins/workflowHelpers'; // for json field completions
import { ASK_AI_MODAL_KEY, CODE_NODE_TYPE } from '@/constants';
import { codeNodeEditorEventBus } from '@/event-bus';
import { useRootStore } from '@/stores/n8nRoot.store';

import { readOnlyEditorExtensions, writableEditorExtensions } from './baseExtensions';
import { CODE_PLACEHOLDERS } from './constants';
import { linterExtension } from './linter';
import { completerExtension } from './completer';
import { codeNodeEditorTheme } from './theme';
import AskAI from './AskAI.vue';

export default defineComponent({
	name: 'code-node-editor',
	mixins: [linterExtension, completerExtension, workflowHelpers],
	components: {
		AskAI,
	},
	props: {
		aiButtonEnabled: {
			type: Boolean,
			default: false,
		},
		mode: {
			type: String as PropType<CodeExecutionMode>,
			validator: (value: CodeExecutionMode): boolean => CODE_EXECUTION_MODES.includes(value),
		},
		language: {
			type: String as PropType<CodeNodeEditorLanguage>,
			default: 'javaScript' as CodeNodeEditorLanguage,
			validator: (value: CodeNodeEditorLanguage): boolean => CODE_LANGUAGES.includes(value),
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
			languageCompartment: new Compartment(),
			linterCompartment: new Compartment(),
			isEditorHovered: false,
			isEditorFocused: false,
			tabs: ['code', 'ask-ai'],
			activeTab: 'code',
			initialValue: this.value,
		};
	},
	watch: {
		mode(newMode, previousMode: CodeExecutionMode) {
			this.reloadLinter();

			if (this.content.trim() === CODE_PLACEHOLDERS[this.language]?.[previousMode]) {
				this.refreshPlaceholder();
			}
		},
		language(newLanguage, previousLanguage: CodeNodeEditorLanguage) {
			if (this.content.trim() === CODE_PLACEHOLDERS[previousLanguage]?.[this.mode]) {
				this.refreshPlaceholder();
			}

			const [languageSupport] = this.languageExtensions;
			this.editor?.dispatch({
				effects: this.languageCompartment.reconfigure(languageSupport),
			});
		},
	},
	computed: {
		...mapStores(useRootStore),
		content(): string {
			if (!this.editor) return '';

			return this.editor.state.doc.toString();
		},
		aiEnabled(): boolean {
			return this.settingsStore.settings.ai.enabled === true;
		},
		placeholder(): string {
			return CODE_PLACEHOLDERS[this.language]?.[this.mode] ?? '';
		},
		// eslint-disable-next-line vue/return-in-computed-property
		languageExtensions(): [LanguageSupport, ...Extension[]] {
			switch (this.language) {
				case 'json':
					return [json()];
				case 'javaScript':
					return [javascript(), this.autocompletionExtension('javaScript')];
				case 'python':
					return [python(), this.autocompletionExtension('python')];
			}
		},
	},
	methods: {
		async onReplaceCode({ code, mode }: { code: string; mode: CodeExecutionMode }) {
			const hasChanges = this.initialValue !== this.content;

			if (hasChanges) {
				const confirmModal = await this.alert(
					this.$locale.baseText('codeNodeEditor.askAi.areYouSureToReplace'),
					{
						title: this.$locale.baseText('codeNodeEditor.askAi.replaceCurrentCode'),
						confirmButtonText: this.$locale.baseText('codeNodeEditor.askAi.generateCodeAndReplace'),
						showClose: true,
					},
				);

				if (confirmModal === 'cancel') {
					this.activeTab = 'code';
					return;
				}
			}

			this.workflowsStore.updateNodeProperties({
				name: this.ndvStore.activeNode.name,
				properties: { parameters: { mode } },
			});

			this.editor?.dispatch({
				changes: { from: 0, to: this.content.length, insert: code },
			});

			this.initialValue = this.content;
			this.activeTab = 'code';
			this.formatCode();
		},
		switchMode(mode: string) {
			this.workflowsStore.updateNodeProperties({
				name: this.ndvStore.activeNode.name,
				properties: { parameters: { mode } },
			});
		},
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
		formatCode() {
			const formattedCode = prettier.format(this.content, {
				parser: 'babel',
				plugins: [jsParser],
			});

			this.editor?.dispatch({
				changes: { from: 0, to: this.content.length, insert: formattedCode },
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

		const [languageSupport, ...otherExtensions] = this.languageExtensions;
		extensions.push(this.languageCompartment.of(languageSupport), ...otherExtensions);

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
:global(.el-tabs) {
	:global(.el-tabs__content) {
		border: 1px solid var(--color-foreground-base);
		border-radius: 0px var(--border-radius-base) var(--border-radius-base);
	}
	:global(.el-tabs__header) {
		border-bottom: 0;
	}
	:global(.el-tabs__nav) {
		padding: 0;
	}
	:global(.el-tabs__item) {
		padding: var(--spacing-5xs) var(--spacing-2xs);
		height: auto;
		line-height: var(--font-line-height-xloose);

		&:not([aria-selected='true']) {
			background-color: var(--color-background-base);
			border-bottom: 1px solid var(--color-foreground-base) !important;
		}
	}
	:global(.code-editor-tabs .cm-editor) {
		border: 0;
	}
}
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
