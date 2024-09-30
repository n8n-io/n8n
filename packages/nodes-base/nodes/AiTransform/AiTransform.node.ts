import {
	NodeOperationError,
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import set from 'lodash/set';

import { JavaScriptSandbox } from '../Code/JavaScriptSandbox';
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
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		parameterPane: 'wide',
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
							target: 'jsCode',
						},
					},
				},
			},
			{
				displayName: 'Transformation Code',
				name: 'jsCode',
				type: 'string',
				typeOptions: {
					editor: 'jsEditor',
					editorIsReadOnly: true,
				},
				default: '',
				description:
					'Read-only. To edit this code, adjust the prompt or copy and paste it into a Code node.',
				noDataExpression: true,
			},
			{
				displayName:
					"Click on 'Test step' to run the transformation code. Further executions will use the generated code (and not invoke AI again).",
				name: 'hint',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						jsCode: [{ _cnd: { exists: true } }],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions) {
		const workflowMode = this.getMode();

		const node = this.getNode();

		const codeParameterName = 'jsCode';

		const getSandbox = (index = 0) => {
			let code = '';
			try {
				code = this.getNodeParameter(codeParameterName, index) as string;

				if (!code) {
					const instructions = this.getNodeParameter('instructions', index) as string;
					if (!instructions) {
						throw new NodeOperationError(node, 'Missing instructions to generate code', {
							description:
								"Enter your prompt in the 'Instructions' parameter and click 'Generate code'",
						});
					}
					throw new NodeOperationError(node, 'Missing code for data transformation', {
						description: "Click the 'Generate code' button to create the code",
					});
				}
			} catch (error) {
				if (error instanceof NodeOperationError) throw error;

				throw new NodeOperationError(node, error);
			}

			const context = getSandboxContext.call(this, index);

			context.items = context.$input.all();

			const Sandbox = JavaScriptSandbox;
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
}
