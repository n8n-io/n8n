<template>
	<el-dialog
		visible
		append-to-body
		:close-on-click-modal="false"
		width="80%"
		:title="`${$locale.baseText('codeEdit.edit')} ${$locale.nodeText().inputLabelDisplayName(parameter, path)}`"
		:before-close="closeDialog"
	>
		<div class="text-editor-wrapper ignore-key-press">
			<code-editor :value="value" :autocomplete="loadAutocompleteData" @input="$emit('valueChanged', $event)" />
		</div>
	</el-dialog>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';
import { IExecutionResponse, INodeUi } from '@/Interface';
import {
	IBinaryKeyData,
	IDataObject,
	INodeExecutionData,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	WorkflowDataProxy,
} from 'n8n-workflow';

import {
	PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
} from '@/constants';
import { CodeEditor } from './forms';

export default mixins(
	genericHelpers,
	workflowHelpers,
).extend({
	name: 'CodeEdit',
	components: {
		CodeEditor,
	},
	props: ['codeAutocomplete', 'parameter', 'path', 'type', 'value'],
	methods: {
		loadAutocompleteData(): string[] {
			if (['function', 'functionItem'].includes(this.codeAutocomplete)) {
				const itemIndex = 0;
				const inputName = 'main';
				const mode = 'manual';
				let runIndex = 0;

				const executedWorkflow: IExecutionResponse | null = this.$store.getters.getWorkflowExecution;
				const workflow = this.getCurrentWorkflow();
				const activeNode: INodeUi | null = this.$store.getters.activeNode;
				const parentNode = workflow.getParentNodes(activeNode!.name, inputName, 1);
				const nodeConnection = workflow.getNodeConnectionIndexes(activeNode!.name, parentNode[0]) || {
					sourceIndex: 0,
					destinationIndex: 0,
				};

				const executionData = this.$store.getters.getWorkflowExecution as IExecutionResponse | null;

				let runExecutionData: IRunExecutionData;
				if (executionData === null) {
					runExecutionData = {
						resultData: {
							runData: {},
						},
					};
				} else {
					runExecutionData = executionData.data;
					if (runExecutionData.resultData.runData[activeNode!.name]) {
						runIndex = runExecutionData.resultData.runData[activeNode!.name].length - 1;
					}
				}

				const connectionInputData = this.connectionInputData(parentNode, activeNode!.name, inputName, runIndex, nodeConnection);

				const additionalProxyKeys: IWorkflowDataProxyAdditionalKeys = {
					$executionId: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
					$resumeWebhookUrl: PLACEHOLDER_FILLED_AT_EXECUTION_TIME,
				};

				const dataProxy = new WorkflowDataProxy(workflow, runExecutionData, runIndex, itemIndex, activeNode!.name, connectionInputData || [], {}, mode, this.$store.getters.timezone, additionalProxyKeys);
				const proxy = dataProxy.getDataProxy();

				const autoCompleteItems = [
					`function $evaluateExpression(expression: string, itemIndex?: number): any {};`,
					`function getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any {};`,
					`function getWorkflowStaticData(type: string): {};`,
					`function $item(itemIndex: number, runIndex?: number): {};`,
					`function $items(nodeName?: string, outputIndex?: number, runIndex?: number): {};`,
				];

				const baseKeys = [
					'$env',
					'$executionId',
					'$mode',
					'$parameter',
					'$resumeWebhookUrl',
					'$workflow',
					'$now',
					'$today',
					'$thisRunIndex',
					'DateTime',
					'Duration',
					'Interval',
				];

				const functionItemKeys = [
					'$json',
					'$binary',
					'$position',
					'$thisItem',
					'$thisItemIndex',
				];

				const additionalKeys: string[] = [];
				if (this.codeAutocomplete === 'functionItem') {
					additionalKeys.push(...functionItemKeys);
				}

				if (executedWorkflow && connectionInputData && connectionInputData.length) {
					baseKeys.push(...additionalKeys);
				} else {
					additionalKeys.forEach(key => {
						autoCompleteItems.push(`const ${key} = {}`);
					});
				}

				for (const key of baseKeys) {
					autoCompleteItems.push(`const ${key} = ${JSON.stringify(this.createSimpleRepresentation(proxy[key]))}`);
				}

				// Add the nodes and their simplified data
				const nodes: {
					[key: string]: INodeExecutionData;
				} = {};
				for (const [nodeName, node] of Object.entries(workflow.nodes)) {
					// To not load to much data create a simple representation.
					nodes[nodeName] = {
						json: {} as IDataObject,
						parameter: this.createSimpleRepresentation(proxy.$node[nodeName].parameter) as IDataObject,
					};

					try {
						nodes[nodeName]!.json = this.createSimpleRepresentation(proxy.$node[nodeName].json) as IDataObject;
						nodes[nodeName]!.context = this.createSimpleRepresentation(proxy.$node[nodeName].context) as IDataObject;
						nodes[nodeName]!.runIndex = proxy.$node[nodeName].runIndex;
						if (Object.keys(proxy.$node[nodeName].binary).length) {
							nodes[nodeName]!.binary = this.createSimpleRepresentation(proxy.$node[nodeName].binary) as IBinaryKeyData;
						}
					} catch(error) {}
				}
				autoCompleteItems.push(`const $node = ${JSON.stringify(nodes)}`);
				autoCompleteItems.push(`function $jmespath(jsonDoc: object, query: string): {};`);

				if (this.codeAutocomplete === 'function') {
					if (connectionInputData) {
						autoCompleteItems.push(`const items = ${JSON.stringify(this.createSimpleRepresentation(connectionInputData))}`);
					} else {
						autoCompleteItems.push(`const items: {json: {[key: string]: any}}[] = []`);
					}
				} else if (this.codeAutocomplete === 'functionItem') {
					if (connectionInputData) {
						autoCompleteItems.push(`const item = $json`);
					} else {
						autoCompleteItems.push(`const item: {[key: string]: any} = {}`);
					}
				}

				return autoCompleteItems;
			}

			return [];
		},
		closeDialog() {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('closeDialog');
			return false;
		},

		createSimpleRepresentation(inputData: object | null | undefined | boolean | string | number | boolean[] | string[] | number[] | object[]): object | null | undefined | boolean | string | number | boolean[] | string[] | number[] | object[] {
			if (inputData === null || inputData === undefined) {
				return inputData;
			} else if (typeof inputData === 'string') {
				return '';
			} else if (typeof inputData === 'boolean') {
				return true;
			} else if (typeof inputData === 'number') {
				return 1;
			} else if (Array.isArray(inputData)) {
				return inputData.map(value => this.createSimpleRepresentation(value));
			} else if (typeof inputData === 'object') {
				const returnData: { [key: string]: object } = {};
				Object.keys(inputData).forEach(key => {
					// @ts-ignore
					returnData[key] = this.createSimpleRepresentation(inputData[key]);
				});
				return returnData;
			}
			return inputData;
		},
	},
});
</script>

<style scoped>
.text-editor {
	min-height: 30rem;
}
</style>
