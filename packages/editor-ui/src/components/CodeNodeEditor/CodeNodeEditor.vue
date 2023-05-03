<template>
	<div>
		<n8n-info-accordion ref="help" :title="'🤖 Ask AI'">
			<template #customContent>
				<div :class="$style.accordionContent">
					<div :class="$style.aiContent">
						<!-- <n8n-select
							defaultFirstOption
							placeholder="GPT Model"
							size="medium"
							ref="select"
							v-model="selectedModel"
						>
							<n8n-option value="gpt-4" key="gpt-4" label="GPT 4 ($0.03 / 1K tokens)" />
							<n8n-option
								value="gpt-3.5-turbo"
								key="gpt-3.5-turbo"
								label="GPT 3.5 ($0.002 / 1K tokens)"
							/>
						</n8n-select> -->
						<n8n-input
							v-model="apiKey"
							type="password"
							:rows="5"
							ref="input"
							placeholder="API Key"
						/>
						<n8n-input v-model="userPrompt" type="textarea" :rows="5" ref="input" />
						<!-- <div v-if="lastQueryUsage" :class="$style.apiUsage">
							<p>Last query tokens:</p>
							<p>Completion: {{ lastQueryUsage?.completion_tokens }}</p>
							<p>Prompt: {{ lastQueryUsage?.prompt_tokens }}</p>
							<p>Total: {{ lastQueryUsage?.total_tokens }}</p>
							<p>Cost: {{ calculateApiCost(lastQueryUsage?.total_tokens) }}$</p>
						</div> -->

						<div :class="$style.controls">
							<n8n-button
								:loading="isGenerating"
								label="Generate"
								@click="generateCode"
								:disabled="!apiKey"
							/>
						</div>
					</div>
					<div v-if="explanation" :class="$style.explanation"></div>
				</div>
			</template>
		</n8n-info-accordion>
		<div ref="codeNodeEditor" class="ph-no-capture" />
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
			apiKey: '',
			selectedModel: 'gpt-4',
			explanation: '',
			lastQueryUsage: null,
			isGenerating: false,
		};
	},
	watch: {
		mode() {
			this.reloadLinter();
			this.refreshPlaceholder();
		},
		apiKey(key) {
			if (key) {
				console.log('🚀 ~ file: CodeNodeEditor.vue:125 ~ apiKey ~ key:', key);
				window.localStorage.setItem('openai-api-key', key);
			}
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
		calculateApiCost(totalTokens: number) {
			const tokenPrice = this.selectedModel === 'gpt-4' ? 0.03 : 0.002;

			return ((totalTokens / 1000) * tokenPrice).toFixed(6);
		},
		async generateCode() {
			this.isGenerating = true;
			const completion = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: 'Bearer ' + this.apiKey,
				},
				body: JSON.stringify({
					model: this.selectedModel,
					temperature: 0.8,
					messages: [
						{
							role: 'system',
							content:
								"You're coding assistant for n8n function node. I will provide you with a prompt and you will provide me with Javascript code in Markdown format. Do not include any additional text besides the code and included commented explanation. Return an array of objects, one for each item you would like to output",
						},
						{
							role: 'system',
							content: `The input follows following schema. You can reference the properties if it's required for the generation. You can reference the data via \`$input.all()\` which will return array of all the items. To access individual item you would use for example, \`$input.all()[0].json\` notation to get the zeroth index-item in the array. You always need to return the result. Schema: \n ${
								window.__schema
									? JSON.stringify(window.__schema.value)
									: 'No schema, this is a first node in the workflow.'
							}`,
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
			this.lastQueryUsage = completionJSON?.usage;
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
		const localStorageKey = window.localStorage.getItem('openai-api-key');
		if (localStorageKey) {
			this.apiKey = localStorageKey;
		}
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
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.apiUsage {
	font-size: 12px;
}
</style>
