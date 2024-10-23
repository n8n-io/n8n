import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	INodeInputConfiguration,
	INodeInputFilter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';

import { conversationalAgentProperties } from './agents/ConversationalAgent/description';
import { conversationalAgentExecute } from './agents/ConversationalAgent/execute';
import { openAiFunctionsAgentProperties } from './agents/OpenAiFunctionsAgent/description';
import { openAiFunctionsAgentExecute } from './agents/OpenAiFunctionsAgent/execute';
import { planAndExecuteAgentProperties } from './agents/PlanAndExecuteAgent/description';
import { planAndExecuteAgentExecute } from './agents/PlanAndExecuteAgent/execute';
import { reActAgentAgentProperties } from './agents/ReActAgent/description';
import { reActAgentAgentExecute } from './agents/ReActAgent/execute';
import { sqlAgentAgentProperties } from './agents/SqlAgent/description';
import { sqlAgentAgentExecute } from './agents/SqlAgent/execute';
import { toolsAgentProperties } from './agents/ToolsAgent/description';
import { toolsAgentExecute } from './agents/ToolsAgent/execute';
import { promptTypeOptions, textInput } from '../../../utils/descriptions';

// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputs(
	agent: 'toolsAgent' | 'conversationalAgent' | 'openAiFunctionsAgent' | 'reActAgent' | 'sqlAgent',
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
			[NodeConnectionType.AiLanguageModel]: 'Model',
			[NodeConnectionType.AiMemory]: 'Memory',
			[NodeConnectionType.AiTool]: 'Tool',
			[NodeConnectionType.AiOutputParser]: 'Output Parser',
		};

		return inputs.map(({ type, filter }) => {
			const isModelType = type === NodeConnectionType.AiLanguageModel;
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
				maxConnections: [NodeConnectionType.AiLanguageModel, NodeConnectionType.AiMemory].includes(
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

	let specialInputs: SpecialInput[] = [];

	if (agent === 'conversationalAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
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
					],
				},
			},
			{
				type: NodeConnectionType.AiMemory,
			},
			{
				type: NodeConnectionType.AiTool,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		];
	} else if (agent === 'toolsAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
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
					],
				},
			},
			{
				type: NodeConnectionType.AiMemory,
			},
			{
				type: NodeConnectionType.AiTool,
				required: true,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		];
	} else if (agent === 'openAiFunctionsAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
				filter: {
					nodes: [
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
					],
				},
			},
			{
				type: NodeConnectionType.AiMemory,
			},
			{
				type: NodeConnectionType.AiTool,
				required: true,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		];
	} else if (agent === 'reActAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
			},
			{
				type: NodeConnectionType.AiTool,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		];
	} else if (agent === 'sqlAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
			},
			{
				type: NodeConnectionType.AiMemory,
			},
		];
	} else if (agent === 'planAndExecuteAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
			},
			{
				type: NodeConnectionType.AiTool,
			},
			{
				type: NodeConnectionType.AiOutputParser,
			},
		];
	}

	if (hasOutputParser === false) {
		specialInputs = specialInputs.filter(
			(input) => input.type !== NodeConnectionType.AiOutputParser,
		);
	}
	return [NodeConnectionType.Main, ...getInputData(specialInputs)];
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

export class Agent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Agent',
		name: 'agent',
		icon: 'fa:robot',
		iconColor: 'black',
		group: ['transform'],
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7],
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle:
			"={{ {	toolsAgent: 'Tools Agent', conversationalAgent: 'Conversational Agent', openAiFunctionsAgent: 'OpenAI Functions Agent', reActAgent: 'ReAct Agent', sqlAgent: 'SQL Agent', planAndExecuteAgent: 'Plan and Execute Agent' }[$parameter.agent] }}",
		defaults: {
			name: 'AI Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents', 'Root Nodes'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
					},
				],
			},
		},
		inputs: `={{
			((agent, hasOutputParser) => {
				${getInputs.toString()};
				return getInputs(agent, hasOutputParser)
			})($parameter.agent, $parameter.hasOutputParser === undefined || $parameter.hasOutputParser === true)
		}}`,
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
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
				name: 'notice_tip',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {
						agent: ['conversationalAgent', 'toolsAgent'],
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
			// Make Tools Agent the default agent for versions 1.6 and above
			{
				...agentTypeProperty,
				displayOptions: { show: { '@version': [{ _cnd: { gte: 1.6 } }] } },
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
				displayName: 'For more reliable structured output parsing, consider using the Tools agent',
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
				displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='${NodeConnectionType.AiOutputParser}'>output parser</a> on the canvas to specify the output format you require`,
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
