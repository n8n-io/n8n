import { NodesConfig, TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import set from 'lodash/set';
import {
	NodeConnectionTypes,
	UserError,
	type CodeExecutionMode,
	type CodeNodeEditorLanguage,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { javascriptCodeDescription } from './descriptions/JavascriptCodeDescription';
import { pythonCodeDescription } from './descriptions/PythonCodeDescription';
import { JavaScriptSandbox } from './JavaScriptSandbox';
import { JsTaskRunnerSandbox } from './JsTaskRunnerSandbox';
import { PythonSandbox } from './PythonSandbox';
import { getSandboxContext } from './Sandbox';
import { addPostExecutionWarning, standardizeOutput } from './utils';

const { CODE_ENABLE_STDOUT } = process.env;

class PythonDisabledError extends UserError {
	constructor() {
		super(
			'This instance disallows Python execution because it has the environment variable `N8N_PYTHON_ENABLED` set to `false`. To restore Python execution, remove this environment variable or set it to `true` and restart the instance.',
		);
	}
}

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
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
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
		const node = this.getNode();
		const language: CodeNodeEditorLanguage =
			node.typeVersion === 2
				? (this.getNodeParameter('language', 0) as CodeNodeEditorLanguage)
				: 'javaScript';

		if (language === 'python' && !Container.get(NodesConfig).pythonEnabled) {
			// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
			throw new PythonDisabledError();
		}

		const runnersConfig = Container.get(TaskRunnersConfig);
		const nodeMode = this.getNodeParameter('mode', 0) as CodeExecutionMode;
		const workflowMode = this.getMode();
		const codeParameterName = language === 'python' ? 'pythonCode' : 'jsCode';

		if (runnersConfig.enabled && language === 'javaScript') {
			const code = this.getNodeParameter(codeParameterName, 0) as string;
			const sandbox = new JsTaskRunnerSandbox(code, nodeMode, workflowMode, this);
			const numInputItems = this.getInputData().length;

			return nodeMode === 'runOnceForAllItems'
				? [await sandbox.runCodeAllItems()]
				: [await sandbox.runCodeForEachItem(numInputItems)];
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
			const sandbox = new Sandbox(context, code, this.helpers);
			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI.bind(this)
					: CODE_ENABLE_STDOUT === 'true'
						? (...args) =>
								console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args)
						: () => {},
			);
			return sandbox;
		};

		const inputDataItems = this.getInputData();

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

			addPostExecutionWarning(this, items, inputDataItems?.length);
			return [items];
		}

		// ----------------------------------
		//        runOnceForEachItem
		// ----------------------------------

		const returnData: INodeExecutionData[] = [];

		for (let index = 0; index < inputDataItems.length; index++) {
			const sandbox = getSandbox(index);
			let result: INodeExecutionData | undefined;
			try {
				result = await sandbox.runCodeEachItem(index);
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

		addPostExecutionWarning(this, returnData, inputDataItems?.length);
		return [returnData];
	}
}
