/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type INodeOutputConfiguration,
	type SupplyData,
	NodeConnectionType,
} from 'n8n-workflow';

// TODO: Add support for execute function. Got already started but got commented out

import { getSandboxContext } from 'n8n-nodes-base/dist/nodes/Code/Sandbox';
import { JavaScriptSandbox } from 'n8n-nodes-base/dist/nodes/Code/JavaScriptSandbox';
import { standardizeOutput } from 'n8n-nodes-base/dist/nodes/Code/utils';
import type { Tool } from '@langchain/core/tools';
import { makeResolverFromLegacyOptions } from '@n8n/vm2';
import { logWrapper } from '../../utils/logWrapper';

const { NODE_FUNCTION_ALLOW_BUILTIN: builtIn, NODE_FUNCTION_ALLOW_EXTERNAL: external } =
	process.env;

// TODO: Replace
const connectorTypes = {
	[NodeConnectionType.AiChain]: 'Chain',
	[NodeConnectionType.AiDocument]: 'Document',
	[NodeConnectionType.AiEmbedding]: 'Embedding',
	[NodeConnectionType.AiLanguageModel]: 'Language Model',
	[NodeConnectionType.AiMemory]: 'Memory',
	[NodeConnectionType.AiOutputParser]: 'Output Parser',
	[NodeConnectionType.AiTextSplitter]: 'Text Splitter',
	[NodeConnectionType.AiTool]: 'Tool',
	[NodeConnectionType.AiVectorStore]: 'Vector Store',
	[NodeConnectionType.Main]: 'Main',
};

const defaultCodeExecute = `const { PromptTemplate } = require('@langchain/core/prompts');

const query = 'Tell me a joke';
const prompt = PromptTemplate.fromTemplate(query);
const llm = await this.getInputConnectionData('ai_languageModel', 0);
let chain = prompt.pipe(llm);
const output = await chain.invoke();
return [ {json: { output } } ];`;

const defaultCodeSupplyData = `const { WikipediaQueryRun } = require('langchain/tools');
return new WikipediaQueryRun();`;

const langchainModules = ['langchain', '@langchain/*'];
export const vmResolver = makeResolverFromLegacyOptions({
	external: {
		modules: external ? [...langchainModules, ...external.split(',')] : [...langchainModules],
		transitive: false,
	},
	resolve(moduleName, parentDirname) {
		if (moduleName.match(/^langchain\//) ?? moduleName.match(/^@langchain\//)) {
			return require.resolve(`@n8n/n8n-nodes-langchain/node_modules/${moduleName}.cjs`, {
				paths: [parentDirname],
			});
		}
		return;
	},
	builtin: builtIn?.split(',') ?? [],
});

function getSandbox(
	this: IExecuteFunctions,
	code: string,
	options?: { addItems?: boolean; itemIndex?: number },
) {
	const itemIndex = options?.itemIndex ?? 0;
	const node = this.getNode();
	const workflowMode = this.getMode();

	const context = getSandboxContext.call(this, itemIndex);
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.addInputData = this.addInputData;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.addOutputData = this.addOutputData;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getInputConnectionData = this.getInputConnectionData;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getInputData = this.getInputData;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getNode = this.getNode;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getExecutionCancelSignal = this.getExecutionCancelSignal;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getNodeOutputs = this.getNodeOutputs;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.executeWorkflow = this.executeWorkflow;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.getWorkflowDataProxy = this.getWorkflowDataProxy;
	// eslint-disable-next-line @typescript-eslint/unbound-method
	context.logger = this.logger;

	if (options?.addItems) {
		context.items = context.$input.all();
	}
	// eslint-disable-next-line @typescript-eslint/unbound-method

	const sandbox = new JavaScriptSandbox(context, code, itemIndex, this.helpers, {
		resolver: vmResolver,
	});

	sandbox.on(
		'output',
		workflowMode === 'manual'
			? this.sendMessageToUI.bind(this)
			: (...args: unknown[]) =>
					console.log(`[Workflow "${this.getWorkflow().id}"][Node "${node.name}"]`, ...args),
	);
	return sandbox;
}

export class Code implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain Code',
		name: 'code',
		icon: 'fa:code',
		group: ['transform'],
		version: 1,
		description: 'LangChain Code Node',
		defaults: {
			name: 'LangChain Code',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Miscellaneous'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.code/',
					},
				],
			},
		},
		inputs: `={{ ((values) => { const connectorTypes = ${JSON.stringify(
			connectorTypes,
		)}; return values.map(value => { return { type: value.type, required: value.required, maxConnections: value.maxConnections === -1 ? undefined : value.maxConnections, displayName: connectorTypes[value.type] !== 'Main' ? connectorTypes[value.type] : undefined } } ) })($parameter.inputs.input) }}`,
		outputs: `={{ ((values) => { const connectorTypes = ${JSON.stringify(
			connectorTypes,
		)}; return values.map(value => { return { type: value.type, displayName: connectorTypes[value.type] !== 'Main' ? connectorTypes[value.type] : undefined } } ) })($parameter.outputs.output) }}`,
		properties: [
			{
				displayName: 'Code',
				name: 'code',
				placeholder: 'Add Code',
				type: 'fixedCollection',
				noDataExpression: true,
				default: {},
				options: [
					{
						name: 'execute',
						displayName: 'Execute',
						values: [
							{
								displayName: 'JavaScript - Execute',
								name: 'code',
								type: 'string',
								typeOptions: {
									editor: 'jsEditor',
								},
								default: defaultCodeExecute,
								hint: 'This code will only run and return data if a "Main" input & output got created.',
								noDataExpression: true,
							},
						],
					},
					{
						name: 'supplyData',
						displayName: 'Supply Data',
						values: [
							{
								displayName: 'JavaScript - Supply Data',
								name: 'code',
								type: 'string',
								typeOptions: {
									editor: 'jsEditor',
								},
								default: defaultCodeSupplyData,
								hint: 'This code will only run and return data if an output got created which is not "Main".',
								noDataExpression: true,
							},
						],
					},
				],
			},

			// TODO: Add links to docs which provide additional information regarding functionality
			{
				displayName:
					'You can import LangChain and use all available functionality. Debug by using <code>console.log()</code> statements and viewing their output in the browser console.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Inputs',
				name: 'inputs',
				placeholder: 'Add Input',
				type: 'fixedCollection',
				noDataExpression: true,
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The input to add',
				default: {},
				options: [
					{
						name: 'input',
						displayName: 'Input',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: Object.keys(connectorTypes).map((key) => ({
									name: connectorTypes[key as keyof typeof connectorTypes],
									value: key,
								})),
								noDataExpression: true,
								default: '',
								required: true,
								description: 'The type of the input',
							},
							{
								displayName: 'Max Connections',
								name: 'maxConnections',
								type: 'number',
								noDataExpression: true,
								default: -1,
								required: true,
								description:
									'How many nodes of this type are allowed to be connected. Set it to -1 for unlimited.',
							},
							{
								displayName: 'Required',
								name: 'required',
								type: 'boolean',
								noDataExpression: true,
								default: false,
								required: true,
								description: 'Whether the input needs a connection',
							},
						],
					},
				],
			},
			{
				displayName: 'Outputs',
				name: 'outputs',
				placeholder: 'Add Output',
				type: 'fixedCollection',
				noDataExpression: true,
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The output to add',
				default: {},
				options: [
					{
						name: 'output',
						displayName: 'Output',
						values: [
							{
								displayName: 'Type',
								name: 'type',
								type: 'options',
								options: Object.keys(connectorTypes).map((key) => ({
									name: connectorTypes[key as keyof typeof connectorTypes],
									value: key,
								})),
								noDataExpression: true,
								default: '',
								required: true,
								description: 'The type of the input',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const itemIndex = 0;

		const code = this.getNodeParameter('code', itemIndex) as { execute?: { code: string } };

		if (!code.execute?.code) {
			throw new NodeOperationError(
				this.getNode(),
				`No code for "Execute" set on node "${this.getNode().name}`,
				{
					itemIndex,
				},
			);
		}

		const sandbox = getSandbox.call(this, code.execute.code, { addItems: true, itemIndex });

		const outputs = this.getNodeOutputs();
		const mainOutputs: INodeOutputConfiguration[] = outputs.filter(
			(output) => output.type === NodeConnectionType.Main,
		);

		const options = { multiOutput: mainOutputs.length !== 1 };

		let items: INodeExecutionData[] | INodeExecutionData[][];
		try {
			items = await sandbox.runCodeAllItems(options);
		} catch (error) {
			if (!this.continueOnFail()) throw error;
			items = [{ json: { error: (error as Error).message } }];
			if (options.multiOutput) {
				items = [items];
			}
		}

		if (mainOutputs.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'The node does not have a "Main" output set. Please add one.',
				{
					itemIndex,
				},
			);
		} else if (!options.multiOutput) {
			for (const item of items as INodeExecutionData[]) {
				standardizeOutput(item.json);
			}
			return [items as INodeExecutionData[]];
		} else {
			items.forEach((data) => {
				for (const item of data as INodeExecutionData[]) {
					standardizeOutput(item.json);
				}
			});
			return items as INodeExecutionData[][];
		}
	}

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const code = this.getNodeParameter('code', itemIndex) as { supplyData?: { code: string } };

		if (!code.supplyData?.code) {
			throw new NodeOperationError(
				this.getNode(),
				`No code for "Supply Data" set on node "${this.getNode().name}`,
				{
					itemIndex,
				},
			);
		}

		const sandbox = getSandbox.call(this, code.supplyData.code, { itemIndex });
		const response = (await sandbox.runCode()) as Tool;

		return {
			response: logWrapper(response, this),
		};
	}
}
