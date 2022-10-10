import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getSandboxContext, Sandbox } from './Sandbox';
import { standardizeOutput } from './utils';
import {
	ALL_ITEMS_PLACEHOLDER,
	EACH_ITEM_PLACEHOLDER,
	JS_CODE_PARAM_DESCRIPTION,
} from './placeholders';
import type { CodeNodeMode } from './utils';

export class Code implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code',
		name: 'code',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'Run custom JavaScript code',
		defaults: {
			name: 'Code',
			color: '#FF9922',
		},
		inputs: ['main'],
		outputs: ['main'],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run Once for All Items',
						value: 'runOnceForAllItems',
						description: 'Run this code only once, no matter how many input items there are',
					},
					{
						name: 'Run Once for Each Item',
						value: 'runOnceForEachItem',
						description: 'Run this code as many times as there are input items',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'JavaScript',
				name: 'jsCodeAllItems',
				typeOptions: {
					editor: 'codeNodeEditor',
				},
				type: 'string',
				default: ALL_ITEMS_PLACEHOLDER,
				description: JS_CODE_PARAM_DESCRIPTION,
				noDataExpression: true,
				displayOptions: {
					show: {
						mode: ['runOnceForAllItems'],
					},
				},
			},
			{
				displayName: 'JavaScript',
				name: 'jsCodeEachItem',
				typeOptions: {
					editor: 'codeNodeEditor',
				},
				type: 'string',
				default: EACH_ITEM_PLACEHOLDER,
				description: JS_CODE_PARAM_DESCRIPTION,
				noDataExpression: true,
				displayOptions: {
					show: {
						mode: ['runOnceForEachItem'],
					},
				},
			},
			{
				displayName:
					'Type <code>$</code> for a list of special vars/functions. Debug using <code>console.log()</code> statements and viewing their output in the browser console. <a>More info</a>',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		let items = this.getInputData();

		const nodeMode = this.getNodeParameter('mode', 0) as CodeNodeMode;
		const workflowMode = this.getMode();

		// ----------------------------------
		//        runOnceForAllItems
		// ----------------------------------

		if (nodeMode === 'runOnceForAllItems') {
			const jsCodeAllItems = this.getNodeParameter('jsCodeAllItems', 0) as string;

			const context = getSandboxContext.call(this);
			const sandbox = new Sandbox(context, workflowMode, nodeMode);

			if (workflowMode === 'manual') {
				sandbox.on('console.log', this.sendMessageToUI);
			}

			try {
				items = await sandbox.runCode(jsCodeAllItems);
			} catch (error) {
				if (!this.continueOnFail()) return Promise.reject(error);
				items = [{ json: { error: error.message } }];
			}

			for (const item of items) {
				standardizeOutput(item.json);
			}

			return this.prepareOutputData(items);
		}

		// ----------------------------------
		//        runOnceForEachItem
		// ----------------------------------

		const returnData: INodeExecutionData[] = [];

		for (let index = 0; index < items.length; index++) {
			let item = items[index];

			const jsCodeEachItem = this.getNodeParameter('jsCodeEachItem', index) as string;

			const context = getSandboxContext.call(this, index);
			const sandbox = new Sandbox(context, workflowMode, nodeMode);

			if (workflowMode === 'manual') {
				sandbox.on('console.log', this.sendMessageToUI);
			}

			try {
				item = await sandbox.runCode(jsCodeEachItem, index);
			} catch (error) {
				if (!this.continueOnFail()) return Promise.reject(error);
				returnData.push({ json: { error: error.message } });
			}

			if (item) {
				returnData.push({
					json: standardizeOutput(item.json),
					pairedItem: { item: index },
					...(item.binary && { binary: item.binary }),
				});
			}
		}

		return this.prepareOutputData(returnData);
	}
}
