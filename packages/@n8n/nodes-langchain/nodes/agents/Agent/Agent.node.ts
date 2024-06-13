import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	ConnectionTypes,
	INodeInputConfiguration,
	INodeInputFilter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeProperties,
} from 'n8n-workflow';
import { getTemplateNoticeField } from '../../../utils/sharedFields';
import { promptTypeOptions, textInput } from '../../../utils/descriptions';
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

// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputs(
	agent: 'toolsAgent' | 'conversationalAgent' | 'openAiFunctionsAgent' | 'reActAgent' | 'sqlAgent',
	hasOutputParser?: boolean,
): Array<ConnectionTypes | INodeInputConfiguration> {
	interface SpecialInput {
		type: ConnectionTypes;
		filter?: INodeInputFilter;
		required?: boolean;
	}

	const getInputData = (
		inputs: SpecialInput[],
	): Array<ConnectionTypes | INodeInputConfiguration> => {
		const displayNames: { [key: string]: string } = {
			[NodeConnectionType.AiLanguageModel]: 'Model',
			[NodeConnectionType.AiMemory]: 'Memory',
			[NodeConnectionType.AiTool]: 'Tool',
			[NodeConnectionType.AiOutputParser]: 'Output Parser',
		};

		return inputs.map(({ type, filter }) => {
			const input: INodeInputConfiguration = {
				type,
				displayName: type in displayNames ? displayNames[type] : undefined,
				required: type === NodeConnectionType.AiLanguageModel,
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
						'@n8n/n8n-nodes-langchain.lmChatGroq',
						'@n8n/n8n-nodes-langchain.lmChatOllama',
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatGooglePalm',
						'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
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
						'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatGroq',
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
				'Utilized unified Tool calling interface to select the appropriate tools and argument for execution',
		},
		{
			name: 'Conversational Agent',
			value: 'conversationalAgent',
			description:
				'Selects tools to accomplish its task and uses memory to recall previous conversations',
		},
		{
			name: 'OpenAI Functions Agent',
			value: 'openAiFunctionsAgent',
			description:
				"Utilizes OpenAI's Function Calling feature to select the appropriate tool and arguments for execution",
		},
		{
			name: 'Plan and Execute Agent',
			value: 'planAndExecuteAgent',
			description:
				'Plan and execute agents accomplish an objective by first planning what to do, then executing the sub tasks',
		},
		{
			name: 'ReAct Agent',
			value: 'reActAgent',
			description: 'Strategically select tools to accomplish a given task',
		},
		{
			name: 'SQL Agent',
			value: 'sqlAgent',
			description: 'Answers questions about data in an SQL database',
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
		version: [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle:
			"={{ {	toolsAgent: 'Tools Agent', conversationalAgent: 'Conversational Agent', openAiFunctionsAgent: 'OpenAI Functions Agent', reActAgent: 'ReAct Agent', sqlAgent: 'SQL Agent', planAndExecuteAgent: 'Plan and Execute Agent' }[$parameter.agent] }}",
		defaults: {
			name: 'AI Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain'],
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
				...getTemplateNoticeField(1954),
				displayOptions: {
					show: {
						agent: ['conversationalAgent'],
					},
				},
			},
			// Make Conversational Agent the default agent for versions 1.5 and below
			{
				...agentTypeProperty,
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
