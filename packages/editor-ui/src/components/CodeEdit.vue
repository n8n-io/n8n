<template>
	<el-dialog
		visible
		append-to-body
		:close-on-click-modal="false"
		width="80%"
		:title="`${$locale.baseText('codeEdit.edit')} ${$locale.nodeText().topParameterDisplayName(parameter)}`"
		:before-close="closeDialog"
	>
		<div class="text-editor-wrapper ignore-key-press">
			<div ref="code" class="text-editor" @keydown.stop></div>
		</div>
	</el-dialog>
</template>

<script lang="ts">
// @ts-ignore
// import PrismEditor from 'vue-prism-editor';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';
import { IExecutionResponse } from '@/Interface';
import { INodeExecutionData } from 'n8n-workflow';

export default mixins(genericHelpers).extend({
	name: 'CodeEdit',
	props: ['dialogVisible', 'parameter', 'value'],
	data() {
		return {
			monacoInstance: null as monaco.editor.IStandaloneCodeEditor | null,
			monacoLibrary: null as monaco.IDisposable | null,
		};
	},
	mounted() {
		setTimeout(this.loadEditor);
	},
	destroyed() {
		this.monacoLibrary!.dispose();
	},
	methods: {
		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},

		loadEditor() {
			if (!this.$refs.code) return;

			this.monacoInstance = monaco.editor.create(this.$refs.code as HTMLElement, {
				value: this.value,
				language: 'javascript',
				tabSize: 2,
				readOnly: this.isReadOnly,
			});

			this.monacoInstance.onDidChangeModelContent(() => {
				const model = this.monacoInstance!.getModel();

				if (model) {
					this.$emit('valueChanged', model.getValue());
				}
			});

			this.loadAutocompleteData();
		},

		loadAutocompleteData(): void {
			const executedWorkflow: IExecutionResponse | null = this.$store.getters.getWorkflowExecution;

			let autocompleteData: INodeExecutionData[] = [];

			if (executedWorkflow) {
				const lastNodeExecuted = executedWorkflow.data.resultData.lastNodeExecuted;

				if (lastNodeExecuted) {
					const data = executedWorkflow.data.resultData.runData[lastNodeExecuted];

					// @ts-ignore
					autocompleteData = data[0].data!.main[0];
				}
			}

			this.monacoLibrary = monaco.languages.typescript.javascriptDefaults.addExtraLib(
				[
					`/**\n\`\`\`\nconst items = ${JSON.stringify(autocompleteData, null, 2)}\n\`\`\`\n*/`,
					`const items = ${JSON.stringify(autocompleteData)}`,
				].join('\n'),
			);
		},
	},
});
</script>

<style scoped>
.editor-description {
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;
}

.text-editor {
	min-height: 30rem;
}
</style>
