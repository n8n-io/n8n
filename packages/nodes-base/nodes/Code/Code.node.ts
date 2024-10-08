import {
	NodeConnectionType,
	type CodeExecutionMode,
	type CodeNodeEditorLanguage,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';
import set from 'lodash/set';
import Container from 'typedi';
import { TaskRunnersConfig } from '@n8n/config';

import { javascriptCodeDescription } from './descriptions/JavascriptCodeDescription';
import { pythonCodeDescription } from './descriptions/PythonCodeDescription';
import { JavaScriptSandbox } from './JavaScriptSandbox';
import { PythonSandbox } from './PythonSandbox';
import { getSandboxContext } from './Sandbox';
import { standardizeOutput } from './utils';

const { CODE_ENABLE_STDOUT } = process.env;

export class Code implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Code',
		name: 'code',
		icon: 'file:code.svg',
		group: ['transform'],
		version: [1, 2],
		defaultVersion: 2,
		description: 'Run custom JavaScript or Python code',
		defaults: {
			name: 'Code',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
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
				displayName: 'Language',
				name: 'language',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: 'JavaScript',
						value: 'javaScript',
					},
					{
						name: 'Python (Beta)',
						value: 'python',
					},
				],
				default: 'javaScript',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'hidden',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				default: 'javaScript',
			},

			...javascriptCodeDescription,
			...pythonCodeDescription,
		],
	};

	async execute(this: IExecuteFunctions) {
		const runnersConfig = Container.get(TaskRunnersConfig);

		const nodeMode = this.getNodeParameter('mode', 0) as CodeExecutionMode;
		const workflowMode = this.getMode();

		const node = this.getNode();
		const language: CodeNodeEditorLanguage =
			node.typeVersion === 2
				? (this.getNodeParameter('language', 0) as CodeNodeEditorLanguage)
				: 'javaScript';
		const codeParameterName = language === 'python' ? 'pythonCode' : 'jsCode';

		if (!runnersConfig.disabled && language === 'javaScript') {
			// TODO: once per item
			const code = this.getNodeParameter(codeParameterName, 0) as string;
			const items = await this.startJob<INodeExecutionData[]>(
				{ javaScript: 'javascript', python: 'python' }[language] ?? language,
				{
					code,
					nodeMode,
					workflowMode,
				},
				0,
			);

			return [items];
		}

		const getSandbox = (index = 0) => {
			const code = this.getNodeParameter(codeParameterName, index) as string;
			const context = getSandboxContext.call(this, index);
			if (nodeMode === 'runOnceForAllItems') {
				context.items = context.$input.all();
			} else {
				context.item = context.$input.item;
			}

			const Sandbox = language === 'python' ? PythonSandbox : JavaScriptSandbox;
			const sandbox = new Sandbox(context, code, index, this.helpers);
			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI
					: CODE_ENABLE_STDOUT === 'true'
						? (...args) =>
								console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args)
						: () => {},
			);
			return sandbox;
		};

		// ----------------------------------
		//        runOnceForAllItems
		// ----------------------------------

		if (nodeMode === 'runOnceForAllItems') {
			const sandbox = getSandbox();
			let items: INodeExecutionData[];
			try {
				items = (await sandbox.runCodeAllItems()) as INodeExecutionData[];
			} catch (error) {
				if (!this.continueOnFail()) {
					set(error, 'node', node);
					throw error;
				}
				items = [{ json: { error: error.message } }];
			}

			for (const item of items) {
				standardizeOutput(item.json);
			}

			return [items];
		}

		// ----------------------------------
		//        runOnceForEachItem
		// ----------------------------------

		const returnData: INodeExecutionData[] = [];

		const items = this.getInputData();

		for (let index = 0; index < items.length; index++) {
			const sandbox = getSandbox(index);
			let result: INodeExecutionData | undefined;
			try {
				result = await sandbox.runCodeEachItem();
			} catch (error) {
				if (!this.continueOnFail()) {
					set(error, 'node', node);
					throw error;
				}
				returnData.push({
					json: { error: error.message },
					pairedItem: {
						item: index,
					},
				});
			}

			if (result) {
				returnData.push({
					json: standardizeOutput(result.json),
					pairedItem: { item: index },
					...(result.binary && { binary: result.binary }),
				});
			}
		}

		return [returnData];
	}
}
