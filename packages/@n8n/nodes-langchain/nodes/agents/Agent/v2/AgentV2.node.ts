import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	HumanMessage,
	SystemMessage,
	type AIMessage,
	type BaseMessage,
	trimMessages,
} from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';
import { tool } from '@langchain/core/tools';
import { StateGraph, Annotation, END, MemorySaver } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import type {
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { promptTypeOptions, textFromPreviousNode, textInput } from '../../../../utils/descriptions';
import { getConnectedTools, getPromptInputByType, isChatInstance } from '../../../../utils/helpers';

const versionDescription: INodeTypeDescription = {
	displayName: 'AI Agent',
	name: 'agent',
	icon: 'fa:robot',
	group: ['transform'],
	version: 2,
	description: 'Generates an action plan and executes it. Can use external tools.',
	defaults: {
		name: 'AI Agent',
		color: '#404040',
	},
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	inputs: [
		NodeConnectionType.Main,
		{
			type: NodeConnectionType.AiLanguageModel,
			displayName: 'Chat Model',
			required: true,
			maxConnections: 1,
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
			displayName: 'Memory',
			required: false,
			maxConnections: 1,
		},
		{
			type: NodeConnectionType.AiTool,
			displayName: 'Tools',
			required: false,
		},
	],
	outputs: [NodeConnectionType.Main],
	properties: [
		promptTypeOptions,
		{ ...textInput, displayOptions: { show: { promptType: ['define'] } } },
		{ ...textFromPreviousNode, displayOptions: { show: { promptType: ['auto'] } } },
		{
			displayName: 'System Message',
			name: 'systemMessage',
			type: 'string',
			default: 'You are a helpful assistant',
			description: 'The message that will be sent to the agent before the conversation starts',
			typeOptions: {
				rows: 10,
			},
		},
		{
			displayName: 'Conversation Routes',
			name: 'routes',
			placeholder: 'Add Route',
			type: 'fixedCollection',
			typeOptions: {
				multipleValues: true,
				sortable: true,
			},
			default: {},
			options: [
				{
					name: 'values',
					displayName: 'Route',
					values: [
						{
							displayName: 'Name',
							name: 'name',
							type: 'string',
							default: '',
							placeholder: 'e.g. Technical Support',
							description: 'Name of this conversation route',
						},
						{
							displayName: 'Description',
							name: 'description',
							type: 'string',
							default: '',
							placeholder: 'e.g. Handle technical questions about our product',
							description: 'Description of when this route should be used',
						},
						{
							displayName: 'Conditions',
							name: 'conditions',
							placeholder: 'Add Condition',
							type: 'fixedCollection',
							typeOptions: {
								multipleValues: true,
							},
							default: {},
							options: [
								{
									name: 'conditions',
									displayName: 'Conditions',
									values: [
										{
											displayName: 'Value',
											name: 'value',
											type: 'string',
											default: '={{ $json.text }}',
											description: 'The value to evaluate',
										},
										{
											displayName: 'Operation',
											name: 'operation',
											type: 'options',
											noDataExpression: true,
											options: [
												{
													name: 'Contains',
													value: 'contains',
												},
												{
													name: 'Ends With',
													value: 'endsWith',
												},
												{
													name: 'Equals',
													value: 'equals',
												},
												{
													name: 'Not Contains',
													value: 'notContains',
												},
												{
													name: 'Not Equals',
													value: 'notEquals',
												},
												{
													name: 'Regex',
													value: 'regex',
												},
												{
													name: 'Starts With',
													value: 'startsWith',
												},
											],
											default: 'contains',
										},
										{
											displayName: 'Match',
											name: 'match',
											type: 'string',
											default: '',
											placeholder: 'e.g. technical',
											description: 'The value to match against',
										},
									],
								},
							],
						},
					],
				},
			],
		},
		{
			displayName: 'Options',
			name: 'options',
			type: 'collection',
			default: {},
			placeholder: 'Add Option',
			options: [
				{
					displayName: 'Max Iterations',
					name: 'maxIterations',
					type: 'number',
					default: 10,
					description: 'The maximum number of iterations the agent will run before stopping',
				},
				{
					displayName: 'Return Intermediate Steps',
					name: 'returnIntermediateSteps',
					type: 'boolean',
					default: false,
					description: 'Whether or not the output should include intermediate steps the agent took',
				},
				{
					displayName: 'Automatically Passthrough Binary Images',
					name: 'passthroughBinaryImages',
					type: 'boolean',
					default: true,
					description:
						'Whether or not binary images should be automatically passed through to the agent as image type messages',
				},
			],
		},
	],
};

export class AgentV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...versionDescription,
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseChatModel;

		if (!isChatInstance(model) || !model.bindTools) {
			throw new NodeOperationError(
				this.getNode(),
				'Langraph Agent requires Chat Model which supports Tools calling',
			);
		}

		const memory = (await this.getInputConnectionData(NodeConnectionType.AiMemory, 0)) as
			| BaseChatMemory
			| undefined;

		const tools = (await getConnectedTools(this, true, false)) as Array<
			DynamicStructuredTool | Tool
		>;
		const responseSchema = z.object({
			regular_answer: z.string().describe('Regular answer'),
			pirate_voice_answer: z.string().describe('Answer as pirate'),
		});
		const finalResponseTool = tool(async () => 'mocked value', {
			name: 'format_final_response',
			description: 'Always respond to the user using this tool.',
			schema: responseSchema,
		});

		const StateAnnotation = Annotation.Root({
			input: Annotation<{
				prompt: string;
				workflowName?: string;
			}>({
				reducer: (x, y) => y ?? x ?? { prompt: '' },
			}),
			messages: Annotation<BaseMessage[]>({
				reducer: (x, y) => x.concat(y),
			}),
			parsedOutput: Annotation<Record<string, unknown>>({
				reducer: (x, y) => y ?? x ?? { output: {} },
			}),
		});

		const toolNode = new ToolNode(tools);

		const modelWithTools = model.bindTools(tools);

		const stateModifier = async (messages: BaseMessage[]): Promise<BaseMessage[]> => {
			return await trimMessages(messages, {
				tokenCounter: (msgs) => msgs.length,
				maxTokens: 10, // Adjust this number based on needs
				strategy: 'last',
				startOn: 'human',
				includeSystem: false,
				allowPartial: false,
			});
		};

		const memorySaver = new MemorySaver();

		async function shouldContinue(state: typeof StateAnnotation.State) {
			const { messages } = state;
			const lastMessage = messages[messages.length - 1] as AIMessage;

			if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
				if (memory) {
					const processedMessages = await stateModifier(messages);
					const lastHumanMsg = processedMessages.find((m) => m.getType() === 'human');
					const lastAIMsg = processedMessages.find((m) => m.getType() === 'ai');

					if (lastHumanMsg && lastAIMsg) {
						await memory.saveContext(
							{ input: lastHumanMsg.content },
							{ output: lastAIMsg.content },
						);
					}
				}
				return END;
			}
			return 'tools';
		}

		async function callModel(state: typeof StateAnnotation.State, config?: RunnableConfig) {
			// console.log('Calling model with state: ', state)
			const messages = state.messages;
			const response = await modelWithTools.invoke(messages, config);
			// console.log('Response from model: ', JSON.stringify(response, null, 2))
			// We return a list, because this will get added to the existing list
			return { messages: [response] };
		}

		const workflow = new StateGraph(StateAnnotation)
			.addNode('agent', callModel)
			// .addNode('formatResponse', formatResponse)
			.addNode('tools', toolNode)
			.addEdge('__start__', 'agent')
			.addConditionalEdges(
				// First, we define the start node. We use `agent`.
				// This means these are the edges taken after the `agent` node is called.
				'agent',
				// Next, we pass in the function that will determine which node is called next.
				shouldContinue,
				// We supply a map of possible response values to the conditional edge
				// to make it possible to draw a visualization of the graph.
				{
					[END]: END,
					tools: 'tools',
					// formatResponse: 'formatResponse',
				},
			)
			// We now add a normal edge from `tools` to `agent`.
			// This means that after `tools` is called, `agent` node is called next.
			.addEdge('tools', 'agent');

		const app = workflow.compile({
			checkpointer: memorySaver,
		});

		const returnData: INodeExecutionData[] = [];
		const items = this.getInputData();

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const systemMessage = this.getNodeParameter('systemMessage', itemIndex, '') as string;
				const options = this.getNodeParameter('options', itemIndex, {}) as {
					maxIterations?: number;
					returnIntermediateSteps?: boolean;
				};
				const input = getPromptInputByType({
					ctx: this,
					i: itemIndex,
					inputKey: 'text',
					promptTypeKey: 'promptType',
				});

				if (input === undefined) {
					throw new NodeOperationError(this.getNode(), 'The text parameter is empty.');
				}

				const chatHistory = (await memory?.chatHistory.getMessages()) ?? [];
				const threadId = uuidv4();

				const processedHistory = await stateModifier(chatHistory);

				const response = await app.invoke(
					{
						messages: [
							new SystemMessage(systemMessage),
							...processedHistory,
							new HumanMessage(input),
						],
					},
					{
						configurable: {
							thread_id: threadId,
							maxIterations: options.maxIterations ?? 10,
						},
					},
				);

				// Get the final AI message from the response
				const messages = response.messages ?? [];
				const lastAIMessage = messages[messages.length - 1] as AIMessage;

				returnData.push({
					json: {
						output: lastAIMessage?.content ?? '',
						threadId,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
