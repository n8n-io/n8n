import type { INodeTypeData, INodeTypeDescription } from 'n8n-workflow';
import {
	AGENT_NODE_TYPE,
	MANUAL_CHAT_TRIGGER_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
} from '@/constants';
import { NodeConnectionType } from 'n8n-workflow';

export const testingNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Manual Trigger',
				name: 'manualTrigger',
				icon: 'fa:mouse-pointer',
				group: ['trigger'],
				version: 1,
				description: 'Runs the flow on clicking a button in n8n',
				eventTriggerDescription: '',
				maxNodes: 1,
				defaults: {
					name: 'When clicking "Execute Workflow"',
					color: '#909298',
				},
				inputs: [],
				outputs: ['main'],
				properties: [
					{
						displayName:
							'This node is where a manual workflow execution starts. To make one, go back to the canvas and click ‘execute workflow’',
						name: 'notice',
						type: 'notice',
						default: '',
					},
				],
			},
		},
	},
	[MANUAL_CHAT_TRIGGER_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Manual Chat Trigger',
				name: MANUAL_CHAT_TRIGGER_NODE_TYPE,
				icon: 'fa:comments',
				group: ['trigger'],
				version: 1,
				description: 'Runs the flow on new manual chat message',
				eventTriggerDescription: '',
				maxNodes: 1,
				defaults: {
					name: 'On new manual Chat Message',
					color: '#909298',
				},
				codex: {
					categories: ['Core Nodes'],
					resources: {
						primaryDocumentation: [
							{
								url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.manualchattrigger/',
							},
						],
					},
					subcategories: {
						'Core Nodes': ['Other Trigger Nodes'],
					},
				},
				inputs: [],
				outputs: [NodeConnectionType.Main],
				properties: [
					{
						displayName:
							'This node is where a manual chat workflow execution starts. To make one, go back to the canvas and click ‘Chat’',
						name: 'notice',
						type: 'notice',
						default: '',
					},
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
						displayName: 'Chat and execute workflow',
						name: 'openChat',
						type: 'button',
						typeOptions: {
							action: 'openChat',
						},
						default: '',
					},
				],
			},
		},
	},
	[AGENT_NODE_TYPE]: {
		sourcePath: '',
		type: {
			description: {
				displayName: 'Agent',
				name: AGENT_NODE_TYPE,
				icon: 'fa:robot',
				group: ['transform'],
				version: 1,
				description: 'Seamlessly coordinates LLMs & tools per user input',
				subtitle:
					"={{ {	conversationalAgent: 'Conversational Agent', openAiFunctionsAgent: 'OpenAI Functions Agent', reactAgent: 'ReAct Agent', sqlAgent: 'SQL Agent' }[$parameter.agent] }}",
				defaults: {
					name: 'Agent',
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
				inputs: [],
				outputs: [NodeConnectionType.Main],
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
				],
			},
		},
	},
};

export const defaultMockNodeTypes: INodeTypeData = {
	[MANUAL_TRIGGER_NODE_TYPE]: testingNodeTypes[MANUAL_TRIGGER_NODE_TYPE],
};

export function mockNodeTypesToArray(nodeTypes: INodeTypeData): INodeTypeDescription[] {
	return Object.values(nodeTypes).map(
		(nodeType) => nodeType.type.description as INodeTypeDescription,
	);
}

export const defaultMockNodeTypesArray: INodeTypeDescription[] =
	mockNodeTypesToArray(defaultMockNodeTypes);
