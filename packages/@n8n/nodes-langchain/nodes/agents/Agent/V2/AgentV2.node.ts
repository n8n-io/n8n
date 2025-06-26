import { NodeConnectionTypes } from 'n8n-workflow';
import type {
	INodeInputConfiguration,
	INodeInputFilter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode, textInput } from '@utils/descriptions';

import { toolsAgentProperties } from '../agents/ToolsAgent/V2/description';
import { toolsAgentExecute } from '../agents/ToolsAgent/V2/execute';

// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputs(
	hasOutputParser?: boolean,
	needsFallback?: boolean,
): Array<NodeConnectionType | INodeInputConfiguration> {
	interface SpecialInput {
		type: NodeConnectionType;
		filter?: INodeInputFilter;
		displayName: string;
		required?: boolean;
	}

	const getInputData = (
		inputs: SpecialInput[],
	): Array<NodeConnectionType | INodeInputConfiguration> => {
		return inputs.map(({ type, filter, displayName, required }) => {
			const input: INodeInputConfiguration = {
				type,
				displayName,
				required,
				maxConnections: ['ai_languageModel', 'ai_memory', 'ai_outputParser'].includes(
					type as NodeConnectionType,
				)
					? 1
					: undefined,
			};

			if (filter) {
				input.filter = filter;
			}

			return input;
		});
	};

	let specialInputs: SpecialInput[] = [
		{
			type: 'ai_languageModel',
			displayName: 'Chat Model',
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
		{
			type: 'ai_languageModel',
			displayName: 'Fallback Model',
			required: true,
			filter: {
				excludedNodes: [
					'@n8n/n8n-nodes-langchain.lmCohere',
					'@n8n/n8n-nodes-langchain.lmOllama',
					'n8n/n8n-nodes-langchain.lmOpenAi',
					'@n8n/n8n-nodes-langchain.lmOpenHuggingFaceInference',
				],
			},
		},
		{
			displayName: 'Memory',
			type: 'ai_memory',
		},
		{
			displayName: 'Tool',
			type: 'ai_tool',
		},
		{
			displayName: 'Output Parser',
			type: 'ai_outputParser',
		},
	];

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter((input) => input.type !== 'ai_outputParser');
	}
	if (needsFallback === false) {
		specialInputs = specialInputs.filter((input) => input.displayName !== 'Fallback Model');
	}
	return ['main', ...getInputData(specialInputs)];
}

export class AgentV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'AI Agent',
				color: '#404040',
			},
			inputs: `={{
				((hasOutputParser, needsFallback) => {
					${getInputs.toString()};
					return getInputs(hasOutputParser, needsFallback)
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true, $parameter.needsFallback === undefined || $parameter.needsFallback === true)
			}}`,
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName:
						'Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/workflows/templates/1954" target="_blank">example</a> of how this node works',
					name: 'aiAgentStarterCallout',
					type: 'callout',
					default: '',
				},
				promptTypeOptions,
				{
					...textFromPreviousNode,
					displayOptions: {
						show: {
							promptType: ['auto'],
						},
					},
				},
				{
					...textInput,
					displayOptions: {
						show: {
							promptType: ['define'],
						},
					},
				},
				{
					displayName: 'Require Specific Output Format',
					name: 'hasOutputParser',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
					name: 'notice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							hasOutputParser: [true],
						},
					},
				},
				{
					displayName: 'Enable Fallback Model',
					name: 'needsFallback',
					type: 'boolean',
					default: false,
					noDataExpression: true,
				},
				{
					displayName:
						'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
					name: 'fallbackNotice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							needsFallback: [true],
						},
					},
				},
				...toolsAgentProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await toolsAgentExecute.call(this);
	}
}
