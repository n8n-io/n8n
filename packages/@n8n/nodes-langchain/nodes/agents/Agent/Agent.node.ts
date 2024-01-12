import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	ConnectionTypes,
	INodeInputConfiguration,
	INodeInputFilter,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { getTemplateNoticeField } from '../../../utils/sharedFields';
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
// Function used in the inputs expression to figure out which inputs to
// display based on the agent type
function getInputs(
	agent: 'conversationalAgent' | 'openAiFunctionsAgent' | 'reActAgent' | 'sqlAgent',
): Array<ConnectionTypes | INodeInputConfiguration> {
	interface SpecialInput {
		type: ConnectionTypes;
		filter?: INodeInputFilter;
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
						'@n8n/n8n-nodes-langchain.lmChatOllama',
						'@n8n/n8n-nodes-langchain.lmChatOpenAi',
						'@n8n/n8n-nodes-langchain.lmChatGooglePalm',
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
	} else if (agent === 'openAiFunctionsAgent') {
		specialInputs = [
			{
				type: NodeConnectionType.AiLanguageModel,
				filter: {
					nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
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

	return [NodeConnectionType.Main, ...getInputData(specialInputs)];
}

export class Agent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AI Agent',
		name: 'agent',
		icon: 'fa:robot',
		group: ['transform'],
		version: [1, 1.1, 1.2],
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle:
			"={{ {	conversationalAgent: 'Conversational Agent', openAiFunctionsAgent: 'OpenAI Functions Agent', reactAgent: 'ReAct Agent', sqlAgent: 'SQL Agent' }[$parameter.agent] }}",
		defaults: {
			name: 'AI Agent',
			color: '#404040',
		},
		codex: {
			alias: ['LangChain'],
			categories: ['AI'],
			subcategories: {
				AI: ['Agents'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
					},
				],
			},
		},
		inputs: `={{ ((agent) => { ${getInputs.toString()}; return getInputs(agent) })($parameter.agent) }}`,
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
			{
				displayName: 'Agent',
				name: 'agent',
				type: 'options',
				noDataExpression: true,
				options: [
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
				default: 'conversationalAgent',
			},

			...conversationalAgentProperties,
			...openAiFunctionsAgentProperties,
			...reActAgentAgentProperties,
			...sqlAgentAgentProperties,
			...planAndExecuteAgentProperties,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const agentType = this.getNodeParameter('agent', 0, '') as string;

		if (agentType === 'conversationalAgent') {
			return conversationalAgentExecute.call(this);
		} else if (agentType === 'openAiFunctionsAgent') {
			return openAiFunctionsAgentExecute.call(this);
		} else if (agentType === 'reActAgent') {
			return reActAgentAgentExecute.call(this);
		} else if (agentType === 'sqlAgent') {
			return sqlAgentAgentExecute.call(this);
		} else if (agentType === 'planAndExecuteAgent') {
			return planAndExecuteAgentExecute.call(this);
		}

		throw new NodeOperationError(this.getNode(), `The agent type "${agentType}" is not supported`);
	}
}
