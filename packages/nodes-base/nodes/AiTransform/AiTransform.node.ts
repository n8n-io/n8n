import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import set from 'lodash/set';
import {
	NodeOperationError,
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INode,
	AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
	AI_TRANSFORM_JS_CODE,
	ensureError,
} from 'n8n-workflow';

import { JavaScriptSandbox } from '../Code/JavaScriptSandbox';
import { JsTaskRunnerSandbox } from '../Code/JsTaskRunnerSandbox';
import { getSandboxContext } from '../Code/Sandbox';
import { standardizeOutput } from '../Code/utils';

const { CODE_ENABLE_STDOUT } = process.env;

export class AiTransform implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Transform',
		name: 'aiTransform',
		icon: 'file:aitransform.svg',
		group: ['transform'],
		version: 1,
		description: 'Modify data based on instructions written in plain english',
		defaults: {
			name: 'AI Transform',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		parameterPane: 'wide',
		hints: [
			{
				message:
					"This node doesn't have access to the contents of binary files. To use those contents here, use the 'Extract from File' node first.",
				displayCondition: '={{ $input.all().some(i => i.binary) }}',
				location: 'outputPane',
			},
		],
		properties: [
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'button',
				default: '',
				description:
					"Provide instructions on how you want to transform the data, then click 'Generate code'. Use dot notation to refer to nested fields (e.g. address.street).",
				placeholder:
					"Example: Merge 'firstname' and 'lastname' into a field 'details.name' and sort by 'email'",
				typeOptions: {
					buttonConfig: {
						label: 'Generate code',
						hasInputField: true,
						inputFieldMaxLength: 500,
						action: {
							type: 'askAiCodeGeneration',
							target: AI_TRANSFORM_JS_CODE,
						},
					},
				},
			},
			{
				displayName: 'Code Generated For Prompt',
				name: AI_TRANSFORM_CODE_GENERATED_FOR_PROMPT,
				type: 'hidden',
				default: '',
			},
			{
				displayName: 'Generated JavaScript',
				name: AI_TRANSFORM_JS_CODE,
				type: 'string',
				typeOptions: {
					editor: 'jsEditor',
					editorIsReadOnly: true,
				},
				default: '',
				hint: 'Read-only. To edit this code, adjust the instructions or copy and paste it into a Code node.',
				noDataExpression: true,
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const workflowMode = this.getMode();
		const node = this.getNode();
		const code = getValidatedCode(this, node);

		const runnersConfig = Container.get(TaskRunnersConfig);

		if (runnersConfig.enabled) {
			const sandbox = new JsTaskRunnerSandbox(code, 'runOnceForAllItems', workflowMode, this);
			return [await sandbox.runCodeAllItems()];
		}

		const getSandbox = (index = 0) => {
			const context = getSandboxContext.call(this, index);
			context.items = context.$input.all();

			const Sandbox = JavaScriptSandbox;
			const sandbox = new Sandbox(context, code, this.helpers);
			sandbox.on(
				'output',
				workflowMode === 'manual'
					? this.sendMessageToUI.bind(this)
					: CODE_ENABLE_STDOUT === 'true'
						? (...args: unknown[]) =>
								console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args)
						: () => {},
			);
			return sandbox;
		};

		const sandbox = getSandbox();
		let items: INodeExecutionData[];
		try {
			items = (await sandbox.runCodeAllItems()) as INodeExecutionData[];
		} catch (e) {
			const error = ensureError(e);
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
}

function getValidatedCode(executeFunctions: IExecuteFunctions, node: INode): string {
	try {
		const code = executeFunctions.getNodeParameter(AI_TRANSFORM_JS_CODE, 0) as string;
		if (code) {
			return code;
		}

		const instructions = executeFunctions.getNodeParameter('instructions', 0) as string;
		if (!instructions) {
			throw new NodeOperationError(node, 'Missing instructions to generate code', {
				description: "Enter your prompt in the 'Instructions' parameter and click 'Generate code'",
			});
		}
		throw new NodeOperationError(node, 'Missing code for data transformation', {
			description: "Click the 'Generate code' button to create the code",
		});
	} catch (error: unknown) {
		if (error instanceof NodeOperationError) throw error;

		throw new NodeOperationError(node, ensureError(error));
	}
}
