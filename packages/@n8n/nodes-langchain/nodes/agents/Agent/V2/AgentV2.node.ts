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
function getInputs(hasOutputParser?: boolean): Array<NodeConnectionType | INodeInputConfiguration> {
	interface SpecialInput {
		type: NodeConnectionType;
		filter?: INodeInputFilter;
		required?: boolean;
	}

	const getInputData = (
		inputs: SpecialInput[],
	): Array<NodeConnectionType | INodeInputConfiguration> => {
		const displayNames: { [key: string]: string } = {
			ai_languageModel: 'Model',
			ai_memory: 'Memory',
			ai_tool: 'Tool',
			ai_outputParser: 'Output Parser',
		};

		return inputs.map(({ type, filter }) => {
			const isModelType = type === 'ai_languageModel';
			let displayName = type in displayNames ? displayNames[type] : undefined;
			if (isModelType) {
				displayName = 'Chat Model';
			}
			const input: INodeInputConfiguration = {
				type,
				displayName,
				required: isModelType,
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
			filter: {
				nodes: [
					'@n8n/n8n-nodes-langchain.lmChatAnthropic',
					'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
					'@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
					'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
					'@n8n/n8n-nodes-langchain.lmChatOllama',
					'@n8n/n8n-nodes-langchain.lmChatOpenAi',
					'@n8n/n8n-nodes-langchain.lmChatGroq',
					'@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
					'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					'@n8n/n8n-nodes-langchain.lmChatDeepSeek',
					'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
					'@n8n/n8n-nodes-langchain.lmChatXAiGrok',
					'@n8n/n8n-nodes-langchain.code',
				],
			},
		},
		{
			type: 'ai_memory',
		},
		{
			type: 'ai_tool',
			required: true,
		},
		{
			type: 'ai_outputParser',
		},
	];

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter((input) => input.type !== 'ai_outputParser');
	}
	return ['main', ...getInputData(specialInputs)];
}

// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputsAsTool(
	hasOutputParser?: boolean,
): Array<NodeConnectionType | INodeInputConfiguration> {
	interface SpecialInput {
		type: NodeConnectionType;
		filter?: INodeInputFilter;
		required?: boolean;
	}

	const getInputData = (
		inputs: SpecialInput[],
	): Array<NodeConnectionType | INodeInputConfiguration> => {
		const displayNames: { [key: string]: string } = {
			ai_languageModel: 'Model',
			ai_memory: 'Memory',
			ai_tool: 'Tool',
			ai_outputParser: 'Output Parser',
		};

		return inputs.map(({ type, filter }) => {
			const isModelType = type === 'ai_languageModel';
			let displayName = type in displayNames ? displayNames[type] : undefined;
			if (isModelType) {
				displayName = 'Chat Model';
			}
			const input: INodeInputConfiguration = {
				type,
				displayName,
				required: isModelType,
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
			filter: {
				nodes: [
					'@n8n/n8n-nodes-langchain.lmChatAnthropic',
					'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
					'@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
					'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
					'@n8n/n8n-nodes-langchain.lmChatOllama',
					'@n8n/n8n-nodes-langchain.lmChatOpenAi',
					'@n8n/n8n-nodes-langchain.lmChatGroq',
					'@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
					'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
					'@n8n/n8n-nodes-langchain.lmChatDeepSeek',
					'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
					'@n8n/n8n-nodes-langchain.lmChatXAiGrok',
					'@n8n/n8n-nodes-langchain.code',
				],
			},
		},
		{
			type: 'ai_memory',
		},
		{
			type: 'ai_tool',
			required: true,
		},
		{
			type: 'ai_outputParser',
		},
	];

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter((input) => input.type !== 'ai_outputParser');
	}
	return [...getInputData(specialInputs)];
}

export class AgentV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription, isTool?: boolean) {
		this.description = {
			...baseDescription,
			version: 2,
			defaults: {
				name: 'AI Agent' + (isTool ? ' Tool' : ''),
				color: '#404040',
			},
			// inputs: `={{
			// 	((hasOutputParser) => {
			// 		${(isTool ? getInputsAsTool : getInputs).toString()};
			// 		return getInputs(hasOutputParser)
			// 	})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true)
			// }}`,
			inputs: isTool
				? [
						{
							displayName: 'Chat Model',
							type: 'ai_languageModel',
						},
						{
							displayName: 'Memory',
							type: 'ai_memory',
						},
						{
							displayName: 'Tools',
							type: 'ai_tool',
							required: true,
						},
					]
				: `={{
				((hasOutputParser) => {
					${getInputs.toString()};
					return getInputs(hasOutputParser)
				})($parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true)
			}}`,
			outputs: [isTool ? NodeConnectionTypes.AiTool : NodeConnectionTypes.Main],
			properties: [
				...(!isTool
					? [
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
								displayOptions: !isTool
									? {
											show: {
												promptType: ['auto'],
											},
										}
									: undefined,
							},
						]
					: [
							{
								displayName: 'Description',
								name: 'toolDescription',
								type: 'string',
								default: 'AI Agent that can call other tools',
								required: true,
								typeOptions: { rows: 2 },
								description:
									'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
							},
						]),
				{
					...textInput,
					displayOptions: !isTool
						? {
								show: {
									promptType: ['define'],
								},
							}
						: undefined,
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
				...toolsAgentProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return await toolsAgentExecute.call(this);
	}
}
