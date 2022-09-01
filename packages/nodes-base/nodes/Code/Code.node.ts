/* eslint-disable n8n-nodes-base/node-param-description-line-break-html-tag */
import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { EndScriptError, MidScriptError } from './errors';
import { getSandboxContext, Sandbox } from './Sandbox';
import { deepCopy, standardizeOutput } from './utils';
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
						description: 'Run this code as many times as input items there are',
					},
				],
				default: 'runOnceForAllItems',
			},
			{
				displayName: 'JavaScript Code',
				name: 'jsCode',
				typeOptions: {
					editor: 'codeNodeEditor',
				},
				type: 'string',
				default: '', // set by component
				description:
					'JavaScript code to execute.<br><br>Tip: You can use luxon vars like <strong>$today</strong> for dates and <strong>$jmespath</strong> for querying JSON structures. <a href="https://docs.n8n.io/nodes/n8n-nodes-base.function">Learn more</a>.',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		let items = this.getInputData();

		const nodeMode = this.getNodeParameter('mode', 0) as CodeNodeMode;
		const workflowMode = this.getMode();

		const context = getSandboxContext.call(this, items, nodeMode);
		const sandbox = new Sandbox(context, workflowMode, nodeMode);

		if (workflowMode === 'manual') {
			sandbox.on('console.log', this.sendMessageToUI);
		}

		// ----------------------------------
		//        runOnceForAllItems
		// ----------------------------------

		if (nodeMode === 'runOnceForAllItems') {
			items = deepCopy(items);

			const jsCode = this.getNodeParameter('jsCode', 0) as string;

			try {
				items = await sandbox.runCode(jsCode);
			} catch (error) {
				if (!this.continueOnFail()) {
					if (error instanceof EndScriptError) return Promise.reject(error);

					return Promise.reject(new MidScriptError(error.stack));
				}

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
			let item = deepCopy(items[index]);

			const jsCode = this.getNodeParameter('jsCode', index) as string;

			try {
				item = await sandbox.runCode(jsCode, index);
			} catch (error) {
				if (!this.continueOnFail()) {
					error.index = index;

					if (error instanceof EndScriptError) return Promise.reject(error);

					return Promise.reject(new MidScriptError(error.stack));
				}

				returnData.push({ json: { error: error.message } });
			}

			returnData.push({
				json: standardizeOutput(item.json),
				pairedItem: { item: index },
				...(item.binary && { binary: item.binary }),
			});
		}

		return this.prepareOutputData(returnData);
	}
}
