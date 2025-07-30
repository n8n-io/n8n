import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	INodeInputConfiguration,
	INodeInputFilter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
	NodeConnectionType,
	INodeTypeBaseDescription,
} from 'n8n-workflow';

import { promptTypeOptions, textFromPreviousNode, textInput } from '@utils/descriptions';

import { conversationalAgentProperties } from '../agents/ConversationalAgent/description';
import { conversationalAgentExecute } from '../agents/ConversationalAgent/execute';
import { openAiFunctionsAgentProperties } from '../agents/OpenAiFunctionsAgent/description';
import { openAiFunctionsAgentExecute } from '../agents/OpenAiFunctionsAgent/execute';
import { planAndExecuteAgentProperties } from '../agents/PlanAndExecuteAgent/description';
import { planAndExecuteAgentExecute } from '../agents/PlanAndExecuteAgent/execute';
import { reActAgentAgentProperties } from '../agents/ReActAgent/description';
import { reActAgentAgentExecute } from '../agents/ReActAgent/execute';
import { sqlAgentAgentProperties } from '../agents/SqlAgent/description';
import { sqlAgentAgentExecute } from '../agents/SqlAgent/execute';
import { toolsAgentProperties } from '../agents/ToolsAgent/V1/description';
import { toolsAgentExecute } from '../agents/ToolsAgent/V1/execute';

// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputs(
	agent:
		| 'toolsAgent'
		| 'conversationalAgent'
		| 'openAiFunctionsAgent'
		| 'planAndExecuteAgent'
		| 'reActAgent'
		| 'sqlAgent',
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
			const isModelType = type === ('ai_languageModel' as NodeConnectionType);
			let displayName = type in displayNames ? displayNames[type] : undefined;
			if (
				isModelType &&
				['openAiFunctionsAgent', 'toolsAgent', 'conversationalAgent'].includes(agent)
			) {
				displayName = 'Chat Model';
			}
			const input: INodeInputConfiguration = {
				type,
				displayName,
				required: isModelType,
				maxConnections: ['ai_languageModel', 'ai_memory', 'ai_outputParser'].includes(type)
					? 1
					: undefined,
			};

			if (filter) {
				input.filter = filter;
			}

			return input;
		});
	};

	let specialInputs: SpecialInput[] = [];

	if (agent === 'conversationalAgent') {
		specialInputs = [
			{
				type: 'ai_languageModel',
				filter: {
					nodes: [
						'@n8n/n8n-nodes-langchain.lmChatAnthropic',
						'@n8n/n8n-nodes-langchain.lmChatAwsBedrock',
						'@n8n/n8n-nodes-langchain.lmChatGroq',
						'@n8n/n8n-nodes-langchain.lmChatOllama',
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						'@n8n/n8n-nodes-langchain.lmChatGoogleVertex',
						'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatDeepSeek',
						'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						'@n8n/n8n-nodes-langchain.lmChatXAiGrok',
						'@n8n/n8n-nodes-langchain.modelSelector',
					],
				},
			},
			{
				type: 'ai_memory',
			},
			{
				type: 'ai_tool',
			},
			{
				type: 'ai_outputParser',
			},
		];
	} else if (agent === 'toolsAgent') {
		specialInputs = [
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
	} else if (agent === 'openAiFunctionsAgent') {
		specialInputs = [
			{
				type: 'ai_languageModel',
				filter: {
					nodes: [
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
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
	} else if (agent === 'reActAgent') {
		specialInputs = [
			{
				type: 'ai_languageModel',
			},
			{
				type: 'ai_tool',
			},
			{
				type: 'ai_outputParser',
			},
		];
	} else if (agent === 'sqlAgent') {
		specialInputs = [
			{
				type: 'ai_languageModel',
			},
			{
				type: 'ai_memory',
			},
		];
	} else if (agent === 'planAndExecuteAgent') {
		specialInputs = [
			{
				type: 'ai_languageModel',
			},
			{
				type: 'ai_tool',
			},
			{
				type: 'ai_outputParser',
			},
		];
	}

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter((input) => input.type !== 'ai_outputParser');
	}
	return ['main', ...getInputData(specialInputs)];
}

const agentTypeProperty: INodeProperties = {
	displayName: 'Agent',
	name: 'agent',
	type: 'options',
	noDataExpression: true,
	// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
	options: [
		{
			name: 'Tools Agent',
			value: 'toolsAgent',
			description:
				'Utilizes structured tool schemas for precise and reliable tool selection and execution. Recommended for complex tasks requiring accurate and consistent tool usage, but only usable with models that support tool calling.',
		},
		{
			name: 'Conversational Agent',
			value: 'conversationalAgent',
			description:
				'Describes tools in the system prompt and parses JSON responses for tool calls. More flexible but potentially less reliable than the Tools Agent. Suitable for simpler interactions or with models not supporting structured schemas.',
		},
		{
			name: 'OpenAI Functions Agent',
			value: 'openAiFunctionsAgent',
			description:
				"Leverages OpenAI's function calling capabilities to precisely select and execute tools. Excellent for tasks requiring structured outputs when working with OpenAI models.",
		},
		{
			name: 'Plan and Execute Agent',
			value: 'planAndExecuteAgent',
			description:
				'Creates a high-level plan for complex tasks and then executes each step. Suitable for multi-stage problems or when a strategic approach is needed.',
		},
		{
			name: 'ReAct Agent',
			value: 'reActAgent',
			description:
				'Combines reasoning and action in an iterative process. Effective for tasks that require careful analysis and step-by-step problem-solving.',
		},
		{
			name: 'SQL Agent',
			value: 'sqlAgent',
			description:
				'Specializes in interacting with SQL databases. Ideal for data analysis tasks, generating queries, or extracting insights from structured data.',
		},
	],
	default: '',
};

export class AgentV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9],
			...baseDescription,
			defaults: {
				name: 'AI Agent',
				color: '#404040',
			},
			inputs: `={{
				((agent, hasOutputParser) => {
					${getInputs.toString()};
					return getInputs(agent, hasOutputParser)
				})($parameter.agent, $parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true)
			}}`,
			outputs: [NodeConnectionTypes.Main],
			credentials: [
				{
					name: 'mySql',
					required: true,
					testedBy: 'mysqlConnectionTest',
					displayOptions: {
						show: {
							agent: ['sqlAgent'],
							'/dataSource': ['mysql'],
						},
					},
				},
				{
					name: 'postgres',
					required: true,
					displayOptions: {
						show: {
							agent: ['sqlAgent'],
							'/dataSource': ['postgres'],
						},
					},
				},
			],
			properties: [
				{
					displayName:
						'Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/templates/1954" target="_blank">example</a> of how this node works',
					name: 'aiAgentStarterCallout',
					type: 'callout',
					default: '',
					displayOptions: {
						show: {
							agent: ['conversationalAgent', 'toolsAgent'],
						},
					},
				},
				{
					displayName:
						"This node is using Agent that has been deprecated. Please switch to using 'Tools Agent' instead.",
					name: 'deprecated',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							agent: [
								'conversationalAgent',
								'openAiFunctionsAgent',
								'planAndExecuteAgent',
								'reActAgent',
								'sqlAgent',
							],
						},
					},
				},
				// Make Conversational Agent the default agent for versions 1.5 and below
				{
					...agentTypeProperty,
					options: agentTypeProperty?.options?.filter(
						(o) => 'value' in o && o.value !== 'toolsAgent',
					),
					displayOptions: { show: { '@version': [{ _cnd: { lte: 1.5 } }] } },
					default: 'conversationalAgent',
				},
				// Make Tools Agent the default agent for versions 1.6 and 1.7
				{
					...agentTypeProperty,
					displayOptions: { show: { '@version': [{ _cnd: { between: { from: 1.6, to: 1.7 } } }] } },
					default: 'toolsAgent',
				},
				// Make Tools Agent the only agent option for versions 1.8 and above
				{
					...agentTypeProperty,
					type: 'hidden',
					displayOptions: { show: { '@version': [{ _cnd: { gte: 1.8 } }] } },
					default: 'toolsAgent',
				},
				{
					...promptTypeOptions,
					displayOptions: {
						hide: {
							'@version': [{ _cnd: { lte: 1.2 } }],
							agent: ['sqlAgent'],
						},
					},
				},
				{
					...textFromPreviousNode,
					displayOptions: {
						show: { promptType: ['auto'], '@version': [{ _cnd: { gte: 1.7 } }] },
						// SQL Agent has data source and credentials parameters so we need to include this input there manually
						// to preserve the order
						hide: {
							agent: ['sqlAgent'],
						},
					},
				},
				{
					...textInput,
					displayOptions: {
						show: {
							promptType: ['define'],
						},
						hide: {
							agent: ['sqlAgent'],
						},
					},
				},
				{
					displayName:
						'For more reliable structured output parsing, consider using the Tools agent',
					name: 'notice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							hasOutputParser: [true],
							agent: [
								'conversationalAgent',
								'reActAgent',
								'planAndExecuteAgent',
								'openAiFunctionsAgent',
							],
						},
					},
				},
				{
					displayName: 'Require Specific Output Format',
					name: 'hasOutputParser',
					type: 'boolean',
					default: false,
					noDataExpression: true,
					displayOptions: {
						hide: {
							'@version': [{ _cnd: { lte: 1.2 } }],
							agent: ['sqlAgent'],
						},
					},
				},
				{
					displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionTypes.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
					name: 'notice',
					type: 'notice',
					default: '',
					displayOptions: {
						show: {
							hasOutputParser: [true],
							agent: ['toolsAgent'],
						},
					},
				},

				...toolsAgentProperties,
				...conversationalAgentProperties,
				...openAiFunctionsAgentProperties,
				...reActAgentAgentProperties,
				...sqlAgentAgentProperties,
				...planAndExecuteAgentProperties,
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const agentType = this.getNodeParameter('agent', 0, '') as string;
		const nodeVersion = this.getNode().typeVersion;

		if (agentType === 'conversationalAgent') {
			return await conversationalAgentExecute.call(this, nodeVersion);
		} else if (agentType === 'toolsAgent') {
			return await toolsAgentExecute.call(this);
		} else if (agentType === 'openAiFunctionsAgent') {
			return await openAiFunctionsAgentExecute.call(this, nodeVersion);
		} else if (agentType === 'reActAgent') {
			return await reActAgentAgentExecute.call(this, nodeVersion);
		} else if (agentType === 'sqlAgent') {
			return await sqlAgentAgentExecute.call(this);
		} else if (agentType === 'planAndExecuteAgent') {
			return await planAndExecuteAgentExecute.call(this, nodeVersion);
		}

		throw new NodeOperationError(this.getNode(), `The agent type "${agentType}" is not supported`);
	}
}
