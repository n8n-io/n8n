import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getSandboxContext, Sandbox } from './Sandbox';
import { standardizeOutput } from './utils';
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
				name: 'jsCode',
				typeOptions: {
					editor: 'codeNodeEditor',
				},
				type: 'string',
				default: '', // set by component
				description:
					'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <code>$today</code> for dates and <code>$jmespath</code> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
				noDataExpression: true,
			},
			{
				displayName:
					'Type <code>$</code> for a list of <a target="_blank" href="https://docs.n8n.io/code-examples/methods-variables-reference/">special vars/methods</a>. Debug by using <code>console.log()</code> statements and viewing their output in the browser console.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const nodeMode = this.getNodeParameter('mode', 0) as CodeNodeMode;
		const workflowMode = this.getMode();

		// ----------------------------------
		//        runOnceForAllItems
		// ----------------------------------

		if (nodeMode === 'runOnceForAllItems') {
			const jsCodeAllItems = this.getNodeParameter('jsCode', 0) as string;

			const context = getSandboxContext.call(this);
			context.items = context.$input.all();
			const sandbox = new Sandbox(context, jsCodeAllItems, workflowMode, this.helpers);

			if (workflowMode === 'manual') {
				sandbox.on('console.log', this.sendMessageToUI);
			}

			let result: INodeExecutionData[];
			try {
				result = await sandbox.runCodeAllItems();
			} catch (error) {
				if (!this.continueOnFail()) return Promise.reject(error);
				result = [{ json: { error: error.message } }];
			}

			for (const item of result) {
				standardizeOutput(item.json);
			}

			return this.prepareOutputData(result);
		}

		// ----------------------------------
		//        runOnceForEachItem
		// ----------------------------------

		const returnData: INodeExecutionData[] = [];

		const items = this.getInputData();

		for (let index = 0; index < items.length; index++) {
			const jsCodeEachItem = this.getNodeParameter('jsCode', index) as string;

			const context = getSandboxContext.call(this, index);
			context.item = context.$input.item;
			const sandbox = new Sandbox(context, jsCodeEachItem, workflowMode, this.helpers);

			if (workflowMode === 'manual') {
				sandbox.on('console.log', this.sendMessageToUI);
			}

			let result: INodeExecutionData | undefined;
			try {
				result = await sandbox.runCodeEachItem(index);
			} catch (error) {
				if (!this.continueOnFail()) return Promise.reject(error);
				returnData.push({ json: { error: error.message } });
			}

			if (result) {
				returnData.push({
					json: standardizeOutput(result.json),
					pairedItem: { item: index },
					...(result.binary && { binary: result.binary }),
				});
			}
		}

		return this.prepareOutputData(returnData);
	}
}
