import { AgentExecutor } from 'langchain/agents';
import { OpenAI as OpenAIClient } from 'openai';
import { OpenAIAssistantRunnable } from 'langchain/experimental/openai_assistant';
import { type Tool } from 'langchain/tools';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import type { OpenAIToolType } from 'langchain/dist/experimental/openai_assistant/schema';
import { formatToOpenAIAssistantTool } from './utils';

export class OpenAiAssistant implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OpenAI Assistant',
		name: 'openAiAssistant',
		icon: 'fa:robot',
		group: ['transform'],
		version: 1,
		description: 'Utilizes Assistant API from Open AI.',
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
			{ type: NodeConnectionType.Main },
			{ type: NodeConnectionType.AiTool, displayName: 'Tools' },
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
				displayName: 'Operation',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				default: 'existing',
				options: [
					{
						name: 'Use New Assistant',
						value: 'new',
					},
					{
						name: 'Use Existing Assistant',
						value: 'existing',
					},
				],
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						'/mode': ['new'],
					},
				},
			},
			{
				displayName: 'Instructions',
				name: 'instructions',
				type: 'string',
				description: 'How the Assistant and model should behave or respond',
				default: '',
				typeOptions: {
					rows: 5,
				},
				displayOptions: {
					show: {
						'/mode': ['new'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				description:
					'The model which will be used to power the assistant. <a href="https://beta.openai.com/docs/models/overview">Learn more</a>. The Retrieval tool requires gpt-3.5-turbo-1106 and gpt-4-1106-preview models.',
				required: true,
				displayOptions: {
					show: {
						'/mode': ['new'],
					},
				},
				typeOptions: {
					loadOptions: {
						routing: {
							request: {
								method: 'GET',
								url: '={{ $parameter.options?.baseURL?.split("/").slice(-1).pop() || "v1"  }}/models',
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
										type: 'filter',
										properties: {
											pass: "={{ $responseItem.id.startsWith('gpt-') && !$responseItem.id.includes('instruct') }}",
										},
									},
									{
										type: 'setKeyValue',
										properties: {
											name: '={{$responseItem.id}}',
											value: '={{$responseItem.id}}',
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
						property: 'model',
					},
				},
				default: 'gpt-3.5-turbo-1106',
			},
			{
				displayName: 'Assistant',
				name: 'assistantId',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						'/mode': ['existing'],
					},
				},
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
				required: true,
				default: '',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '={{ $json.chat_input }}',
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				required: true,
				default: '={{ $json.chatInput }}',
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
			},
			{
				displayName: 'OpenAI Tools',
				name: 'nativeTools',
				type: 'multiOptions',
				default: [],
				options: [
					{
						name: 'Code Interpreter',
						value: 'code_interpreter',
					},
					{
						name: 'Knowledge Retrieval',
						value: 'retrieval',
					},
				],
			},
			{
				displayName: 'Connect your own custom tools to this node on the canvas',
				name: 'noticeTools',
				type: 'notice',
				default: '',
			},
			{
				displayName:
					'Upload files for retrieval using the <a href="https://platform.openai.com/playground" target="_blank">OpenAI website<a/>',
				name: 'noticeTools',
				type: 'notice',
				typeOptions: {
					noticeTheme: 'info',
				},
				displayOptions: { show: { '/nativeTools': ['retrieval'] } },
				default: '',
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
						displayName: 'Max Retries',
						name: 'maxRetries',
						default: 2,
						description: 'Maximum number of retries to attempt',
						type: 'number',
					},
					{
						displayName: 'Timeout',
						name: 'timeout',
						default: 10000,
						description: 'Maximum amount of time a request is allowed to take in milliseconds',
						type: 'number',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tools = (await this.getInputConnectionData(NodeConnectionType.AiTool, 0)) as Tool[];
		const credentials = await this.getCredentials('openAiApi');

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const input = this.getNodeParameter('text', itemIndex) as string;
			const assistantId = this.getNodeParameter('assistantId', itemIndex, '') as string;
			const nativeTools = this.getNodeParameter('nativeTools', itemIndex, []) as Array<
				'code_interpreter' | 'retrieval'
			>;

			const options = this.getNodeParameter('options', itemIndex, {}) as {
				baseURL?: string;
				maxRetries: number;
				timeout: number;
			};

			if (input === undefined) {
				throw new NodeOperationError(this.getNode(), 'The ‘text‘ parameter is empty.');
			}

			const client = new OpenAIClient({
				apiKey: credentials.apiKey as string,
				maxRetries: options.maxRetries ?? 2,
				timeout: options.timeout ?? 10000,
				baseURL: options.baseURL,
			});
			let agent;
			const nativeToolsParsed: OpenAIToolType = nativeTools.map((tool) => ({ type: tool }));
			const transformedConnectedTools = tools?.map(formatToOpenAIAssistantTool) ?? [];
			const newTools = [...transformedConnectedTools, ...nativeToolsParsed];

			// Existing agent, update tools with currently assigned
			if (assistantId) {
				agent = new OpenAIAssistantRunnable({ assistantId, client, asAgent: true });

				await client.beta.assistants.update(assistantId, {
					tools: newTools,
				});
			} else {
				const name = this.getNodeParameter('name', itemIndex, '') as string;
				const instructions = this.getNodeParameter('instructions', itemIndex, '') as string;
				const model = this.getNodeParameter('model', itemIndex, 'gpt-3.5-turbo-1106') as string;

				agent = await OpenAIAssistantRunnable.createAssistant({
					model,
					client,
					instructions,
					name,
					tools: newTools,
					asAgent: true,
				});
			}

			const agentExecutor = AgentExecutor.fromAgentAndTools({
				agent,
				tools,
			});

			const response = await agentExecutor.call({
				content: input,
				signal: this.getExecutionCancelSignal(),
				timeout: options.timeout ?? 10000,
			});

			returnData.push({ json: response });
		}

		return this.prepareOutputData(returnData);
	}
}
