import { AgentExecutor } from 'langchain/agents';
import { OpenAI as OpenAIClient } from 'openai';
import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import { CombiningOutputParser } from 'langchain/output_parsers';
import { PromptTemplate } from 'langchain/prompts';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import type { Tool } from 'langchain/tools';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { CallbackManager } from 'langchain/callbacks';
import type { BaseChatModel } from 'langchain/chat_models/base';

export class OpenAiAssistant implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Assistant',
		name: 'openAiAssistant',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Generates an action plan and executes it. Can use external tools.',
		subtitle: 'Open AI Assistant',
		defaults: {
			name: 'OpenAI Assistant',
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
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.openaiassistant/',
					},
				],
			},
		},
		inputs: [
			{
				type: NodeConnectionType.AiLanguageModel,
				filter: {
					nodes: ['@n8n/n8n-nodes-langchain.lmChatOpenAi'],
				},
			},
			{ type: NodeConnectionType.Main },
			{ type: NodeConnectionType.AiTool },
			{ type: NodeConnectionType.AiOutputParser },
		],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'openAiApi',
				required: true,
			},
		],
		requestDefaults: {
			ignoreHttpStatusErrors: true,
			baseURL:
				'={{ $parameter.options?.baseURL?.split("/").slice(0,-1).join("/") || "https://api.openai.com" }}',
		},
		properties: [
			{
				displayName: 'Assistant',
				name: 'assistantId',
				type: 'options',
				noDataExpression: true,
				description:
					'The assistant to use. <a href="https://beta.openai.com/docs/assistants/overview">Learn more</a>.',
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								headers: {
									'OpenAI-Beta': 'assistants=v1',
								},
								url: '={{ $parameter.options?.baseURL?.split("/").slice(-1).pop() || "v1"  }}/assistants',
							},
							output: {
								postReceive: [
									{
										type: 'rootProperty',
										properties: {
											property: 'data',
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.name}}',
											value: '={{$responseItem.id}}',
											// eslint-disable-next-line n8n-local-rules/no-interpolation-in-regular-string
											description: '={{$responseItem.model}}',
										},
									},
									{
										type: 'sort',
										properties: {
											key: 'name',
										},
									},
								],
							},
						},
					},
				},
				routing: {
					send: {
						type: 'body',
						property: 'assistant',
					},
				},
				default: '',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '={{ $json.input }}',
			},
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Base URL',
						name: 'baseURL',
						default: 'https://api.openai.com/v1',
						description: 'Override the default base URL for the API',
						type: 'string',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 10000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
					{
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			0,
		)) as BaseChatModel;
		const outputParsers = (await this.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			0,
		)) as BaseOutputParser[];
		const credentials = await this.getCredentials('openAiApi');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let input = this.getNodeParameter('text', itemIndex) as string;
			const assistantId = this.getNodeParameter('assistantId', itemIndex, '') as string;
			console.log(
				'🚀 ~ file: OpenAiAssistant.node.ts:164 ~ OpenAiAssistant ~ execute ~ assistantId:',
				assistantId,
			);
			const options = this.getNodeParameter('options', itemIndex, {}) as {
				baseURL?: string;
				frequencyPenalty?: number;
				maxTokens?: number;
				maxRetries: number;
				timeout: number;
				presencePenalty?: number;
				temperature?: number;
				topP?: number;
			};

			// const runnable = OpenAIAssistantRunnable;
			const client = new OpenAIClient({
				apiKey: credentials.apiKey as string,
				maxRetries: options.maxRetries ?? 2,
				timeout: options.timeout ?? 10000,
				baseURL: options.baseURL,
			});
			const agent = await OpenAIAssistantRunnable.createAssistant({
				model: 'gpt-3.5-turbo-1106',
				client,
				instructions: 'You are a weather bot. Use the provided functions to answer questions.',
				name: 'Weather Assistant',
				tools,
				asAgent: true,
			});
			const agentExecutor = AgentExecutor.fromAgentAndTools({
				agent,
				tools,
				callbacks: CallbackManager.fromHandlers({
					handleLLMEnd: async (...args) => {
						console.log('LLM End', JSON.stringify(args, null, 2));
					},
					handleLLMStart(...args) {
						console.log('LLM Start:', JSON.stringify(args, null, 2));
					},
					handleText(...args) {
						console.log('handleText:', JSON.stringify(args, null, 2));
					},
					handleAgentAction(...args) {
						console.log('handleAgentAction:', JSON.stringify(args, null, 2));
					},
					handleChainEnd(...args) {
						console.log('handleChainEnd:', JSON.stringify(args, null, 2));
					},
					handleChatModelStart(...args) {
						console.log('handleChatModelStart:', JSON.stringify(args, null, 2));
					},
					async handleAgentEnd(action, runId, parentRunId, tags) {
						console.log(
							'🚀 ~ file: OpenAiAssistant.node.ts:219 ~ OpenAiAssistant ~ handleAgentEnd ~ runId:',
							runId,
							action,
						);
						const run = await client.beta.threads.runs.retrieve(
							(action as any).threadId as string,
							(action as any).runId as string,
						);
						console.log('handleAgentEnd:', JSON.stringify(run, null, 2));
					},
					handleChainError(...args) {
						console.log('handleChainError:', JSON.stringify(args, null, 2));
					},
				}),
			});

			let outputParser: BaseOutputParser | undefined;
			let prompt: PromptTemplate | undefined;
			if (outputParsers.length) {
				if (outputParsers.length === 1) {
					outputParser = outputParsers[0];
				} else {
					outputParser = new CombiningOutputParser(...outputParsers);
				}

				if (outputParser) {
					const formatInstructions = outputParser.getFormatInstructions();

					prompt = new PromptTemplate({
						template: '{input}\n{formatInstructions}',
						inputVariables: ['input'],
						partialVariables: { formatInstructions },
					});
				}
			}

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘text parameter is empty.');
			}

			if (prompt) {
				input = (await prompt.invoke({ input })).value;
			}
			console.log(
				'🚀 ~ file: OpenAiAssistant.node.ts:216 ~ OpenAiAssistant ~ execute ~ input:',
				input,
			);

			let response = await agentExecutor.invoke({ content: input, outputParsers });

			if (outputParser) {
				response = { output: await outputParser.parse(response.output as string) };
			}

			returnData.push({ json: response });
		}
		console.log(model);
		this.addOutputData(NodeConnectionType.AiLanguageModel, 0, [[{ json: { response: 'test' } }]]);
		return this.prepareOutputData(returnData);
	}
}
