<template>
	<div>
		<n8n-info-accordion ref="help" :title="'🤖 Ask AI'">
			<template #customContent>
				<div :class="$style.accordionContent">
					<div :class="$style.aiContent">
						<n8n-input v-model="userPrompt" type="textarea" :rows="5" ref="input" />
						<div :class="$style.controls">
							<n8n-button :loading="isGenerating" label="Generate" @click="generateCode" />
							<n8n-button
								:loading="isModifying"
								label="Modify"
								type="secondary"
								@click="modifyCode"
							/>
							<n8n-button
								:loading="isExplaining"
								label="Explain"
								type="secondary"
								@click="explainCode"
							/>
						</div>
					</div>
					<div v-if="explanation" :class="$style.explanation"></div>
				</div>
			</template>
		</n8n-info-accordion>
		<div ref="codeNodeEditor" class="ph-no-capture" />
		<el-dialog
			:visible="explainModalVisible && explanation.length > 0"
			append-to-body
			@close="explainModalVisible = false"
		>
			<n8n-markdown :content="explanation" :class="$style.explanation" />
			<!-- <template #title v-else-if="title">
			<div :class="centerTitle ? $style.centerTitle : ''">
				<div v-if="title">
					<n8n-heading tag="h1" size="xlarge">{{ title }}</n8n-heading>
				</div>
				<div v-if="subtitle" :class="$style.subtitle">
					<n8n-heading tag="h3" size="small" color="text-light">{{ subtitle }}</n8n-heading>
				</div>
			</div>
		</template> -->
		</el-dialog>
	</div>
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
import { workflowHelpers } from '@/mixins/workflowHelpers'; // for json field completions
import { codeNodeEditorEventBus } from '@/event-bus/code-node-editor-event-bus';
import { CODE_NODE_TYPE } from '@/constants';
import { ALL_ITEMS_PLACEHOLDER, EACH_ITEM_PLACEHOLDER } from './constants';
import { mapStores } from 'pinia';
import { useRootStore } from '@/stores/n8nRootStore';
import { useNDVStore } from '@/stores/ndv';

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
			userPrompt: '',
			explanation: '',
			explainModalVisible: false,
			isGenerating: false,
			isExplaining: false,
			isModifying: false,
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
		...mapStores(useNDVStore),
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
		async modifyCode() {
			// Get the current selection
			const selection = this.editor?.state.selection;

			if (!selection) return;
			// Iterate through the selection ranges
			for (const range of selection.ranges) {
				// Get the selected text
				const selectedText = this.editor?.state.doc.sliceString(range.from, range.to);
				console.log('Selected text:', selectedText);

				// Get the range
				console.log('Selection range:', range);

				this.isModifying = true;
				// const runData = this.ndvStore
				const completion = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						// Please do not check-in api keys into the repo
						// Authorization: 'Bearer REDACTED',
					},
					body: JSON.stringify({
						model: 'gpt-4',
						temperature: 0.8,
						messages: [
							{
								role: 'system',
								content:
									"You're coding assistant for n8n function node. I will provide you with a prompt and you will provide me with Javascript code in Markdown format. Do not include any additional text besides the code and included commented explanation. Return an array of objects, one for each item you would like to output. I only want a part of the code replaced. Each reply should start with ```javascript. Only return the modified code, not the whole thing.",
							},
							{
								role: 'system',
								content:
									"The input follows following schema. You can reference the properties if it's required for the generation. You can reference the data via `$input.all()` and the individual item $input.all()[0].json." +
									JSON.stringify(window.__schema.value),
							},
							{
								role: 'user',
								content: 'The code: \n' + this.editor?.state.doc,
							},
							{
								role: 'user',
								content: 'The code to replace: \n' + selectedText,
							},
							{
								role: 'user',
								content: 'The prompt: \n' + this.userPrompt,
							},
						],
					}),
				});

				const completionJSON = await completion.json();
				this.isModifying = false;

				const parseJS = completionJSON?.choices[0]?.message?.content
					.split('```javascript\n')[1]
					.split('```')[0];

				this.editor?.dispatch({
					changes: { from: range.from, to: range.to, insert: parseJS },
				});
			}
		},
		async explainCode() {
			// Get the current selection
			const selection = this.editor?.state.selection;

			if (!selection) return;
			// Iterate through the selection ranges
			for (const range of selection.ranges) {
				// Get the selected text
				const selectedText = this.editor?.state.doc.sliceString(range.from, range.to);
				console.log('Selected text:', selectedText);

				// Get the range
				console.log('Selection range:', range);

				this.isExplaining = true;
				// const runData = this.ndvStore
				const completion = await fetch('https://api.openai.com/v1/chat/completions', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: 'Bearer ' + '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',
					},
					body: JSON.stringify({
						model: 'gpt-3.5-turbo',
						temperature: 0.8,
						messages: [
							{
								role: 'system',
								content:
									"You're coding assistant for n8n function node. I will provide you with a code snippet fro n8n function node and you'll reply with a thorough explanation of what the code does. Also include suggestions on way to improve it",
							},
							{
								role: 'system',
								content:
									"The input follows following schema. You can reference the properties if it's required for the generation. You can reference the data via `$input.all()` and the individual item $input.all()[0].json." +
									JSON.stringify(window.__schema.value),
							},
							{
								role: 'user',
								content: 'The code: \n' + this.editor?.state.doc,
							},
						],
					}),
				});

				const completionJSON = await completion.json();
				this.isExplaining = false;
				this.explanation = completionJSON?.choices[0]?.message?.content;
				this.explainModalVisible = true;
			}
		},
		async generateCode() {
			this.isGenerating = true;
			const completion = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + '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',
				},
				body: JSON.stringify({
					model: 'gpt-4',
					temperature: 0.8,
					messages: [
						{
							role: 'system',
							content:
								"You're coding assistant for n8n function node. I will provide you with a prompt and you will provide me with Javascript code in Markdown format. Do not include any additional text besides the code and included commented explanation. Return an array of objects, one for each item you would like to output",
						},
						{
							role: 'system',
							content:
								"The input follows following schema. You can reference the properties if it's required for the generation. You can reference the data via `$input.all()` and the individual item $input.all()[0].json." +
								JSON.stringify(window.__schema.value),
						},
						{
							role: 'user',
							content: 'The prompt: ' + this.userPrompt,
						},
					],
				}),
			});

			const completionJSON = await completion.json();
			this.isGenerating = false;
			const docLength = this.editor?.state.doc.length;

			const parseJS = completionJSON?.choices[0]?.message?.content
				.split('```javascript\n')[1]
				.split('```')[0];
			// Create a transaction that replaces the whole content with "test"
			this.editor?.dispatch({
				changes: { from: 0, to: docLength, insert: parseJS },
			});
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
		const preserveSelectionOnBlur = EditorView.updateListener.of((update: ViewUpdate) => {
			if (update.focusChanged && !update.view.hasFocus) {
				console.log('Focus changed');
				// Preserve the current selection
				const selection = update.state.selection;

				// Set the preserved selection back to the editor
				update.view.dispatch({
					selection,
					scrollIntoView: false,
				});
			}
		});
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
			extensions: [preserveSelectionOnBlur],
		});
	},
});
</script>

<style lang="scss" module>
.explanation {
	display: block;
	max-height: 500px;
	overflow: auto;
}
.controls {
	display: flex;
	justify-content: flex-start;
	gap: 0.5rem;
	margin-top: 1rem;
}
.accordionContent {
	width: 100%;
}
.aiContent {
	width: 100%;
}
</style>
