import axios from 'axios';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type ILoadOptionsFunctions,
} from 'n8n-workflow';
import { N8nLlmTracing } from '../N8nLlmTracing';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { ChatResult } from '@langchain/core/outputs';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { StructuredTool } from '@langchain/core/tools';
import { Runnable } from '@langchain/core/runnables';
// import { getConnectionHintNoticeField } from '@utils/sharedFields'; // Отключено из-за ошибки разрешения модуля

// Собственная реализация GigaChat Chat Model для LangChain
class GigaChat extends BaseChatModel {
	private clientId: string;
	private clientSecret: string;
	private scope: string;
	private authUrl: string;
	private baseURL: string;
	private model: string;
	private temperature: number;
	private maxTokens: number;
	private tools: any[] = [];

	constructor(options: {
		clientId: string;
		clientSecret: string;
		scope: string;
		authUrl: string;
		baseURL: string;
		model?: string;
		temperature?: number;
		maxTokens?: number;
		max_tokens?: number;
		top_p?: number;
		repetition_penalty?: number;
		stream?: boolean;
		n?: number;
		tools?: any[];
		callbacks?: any[];
	}) {
		super({ callbacks: options.callbacks });
		this.clientId = options.clientId;
		this.clientSecret = options.clientSecret;
		this.scope = options.scope;
		this.authUrl = options.authUrl;
		this.baseURL = options.baseURL;
		this.model = options.model || 'GigaChat';
		this.temperature = options.temperature || 0.7;
		this.maxTokens = options.maxTokens || options.max_tokens || 1024;
		this.tools = options.tools || [];
	}

	_llmType(): string {
		return 'gigachat';
	}

	// Поддержка Tool Calling
	static lc_name() {
		return 'GigaChat';
	}

	supportsToolCalling(): boolean {
		return true;
	}

	bindTools(tools: (StructuredTool | any)[], kwargs?: Record<string, any>): Runnable {
		const gigachatFunctions = this.convertToolsToFunctions(tools);
		return new GigaChat({
			clientId: this.clientId,
			clientSecret: this.clientSecret,
			scope: this.scope,
			authUrl: this.authUrl,
			baseURL: this.baseURL,
			model: this.model,
			temperature: this.temperature,
			maxTokens: this.maxTokens,
			tools: gigachatFunctions,
			...kwargs,
		});
	}

	private convertToolsToFunctions(tools: (StructuredTool | any)[]): any[] {
		return tools.map((tool) => {
			if (typeof tool === 'object' && tool.name && tool.description) {
				return {
					name: tool.name,
					description: tool.description,
					parameters: tool.schema || this.extractParametersFromTool(tool),
				};
			}
			return tool;
		});
	}

	private extractParametersFromTool(tool: any): any {
		// Попытка извлечь параметры из Zod схемы или других форматов
		if (tool.schema && tool.schema.shape) {
			const properties: any = {};
			const required: string[] = [];

			for (const [key, value] of Object.entries(tool.schema.shape)) {
				if (value && typeof value === 'object' && 'description' in value) {
					properties[key] = {
						type: this.getJsonType(value),
						description: (value as any).description || '',
					};
					if (!(value as any).optional) {
						required.push(key);
					}
				}
			}

			return {
				type: 'object',
				properties,
				required,
			};
		}

		return {
			type: 'object',
			properties: {},
			required: [],
		};
	}

	private getJsonType(zodType: any): string {
		const typeName = zodType?.constructor?.name || 'string';
		switch (typeName) {
			case 'ZodNumber':
				return 'number';
			case 'ZodBoolean':
				return 'boolean';
			case 'ZodArray':
				return 'array';
			case 'ZodObject':
				return 'object';
			default:
				return 'string';
		}
	}

	private async getAccessToken(): Promise<string> {
		const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
		const response = await axios.post(
			`${this.authUrl}/oauth`,
			new URLSearchParams({ scope: this.scope }),
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${auth}`,
					RqUID: uuidv4(),
					'User-Agent': 'n8n-gigachat/1.0',
					Accept: 'application/json',
				},
				httpsAgent: new https.Agent({ rejectUnauthorized: false }),
			},
		);
		return response.data.access_token;
	}

	private formatMessages(messages: BaseMessage[]): any[] {
		return messages.map((message) => {
			if (message instanceof HumanMessage) {
				return { role: 'user', content: message.content };
			} else if (message instanceof AIMessage) {
				return { role: 'assistant', content: message.content };
			} else if (message instanceof SystemMessage) {
				return { role: 'system', content: message.content };
			} else {
				return { role: 'user', content: message.content };
			}
		});
	}

	async _generate(
		messages: BaseMessage[],
		options?: any,
		runManager?: CallbackManagerForLLMRun,
	): Promise<ChatResult> {
		const accessToken = await this.getAccessToken();
		const formattedMessages = this.formatMessages(messages);

		const payload: any = {
			model: this.model,
			messages: formattedMessages,
			temperature: this.temperature,
			max_tokens: this.maxTokens,
			...options,
		};

		// Убираем undefined значения
		Object.keys(payload).forEach((key) => {
			if (payload[key] === undefined) {
				delete payload[key];
			}
		});

		// Добавляем functions если есть tools
		if (this.tools && this.tools.length > 0) {
			payload.functions = this.tools;
			payload.function_call = 'auto';
		}

		const response = await axios.post(`${this.baseURL}/chat/completions`, payload, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				'User-Agent': 'n8n-gigachat/1.0',
				RqUID: uuidv4(),
			},
			httpsAgent: new https.Agent({ rejectUnauthorized: false }),
		});

		const choice = response.data.choices[0];
		const messageContent = choice.message.content || '';

		// Обрабатываем function calls если они есть
		const toolCalls: any[] = [];
		if (choice.message.function_call) {
			// Один function call
			let args = choice.message.function_call.arguments;
			// GigaChat возвращает аргументы как объект, а не JSON строку
			if (typeof args === 'string') {
				args = JSON.parse(args);
			}
			toolCalls.push({
				name: choice.message.function_call.name,
				args: args || {},
				id: `call_${Date.now()}`,
				type: 'tool_call',
			});
		} else if (choice.message.tool_calls) {
			// Множественные tool calls (на случай если GigaChat поддерживает это в будущем)
			choice.message.tool_calls.forEach((call: any, index: number) => {
				toolCalls.push({
					name: call.function.name,
					args: JSON.parse(call.function.arguments || '{}'),
					id: call.id || `call_${Date.now()}_${index}`,
					type: 'tool_call',
				});
			});
		}

		const message = new AIMessage({
			content: messageContent,
			tool_calls: toolCalls,
		});

		return {
			generations: [
				{
					text: messageContent,
					message: message,
				},
			],
		};
	}
}

async function getGigaChatAccessToken({
	clientId,
	clientSecret,
	scope,
	authUrl,
}: { clientId: string; clientSecret: string; scope: string; authUrl: string }) {
	const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
	const rqUID = uuidv4();
	const response = await axios.post(
		`${authUrl}/oauth`,
		new URLSearchParams({
			scope,
		}),
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${auth}`,
				RqUID: rqUID,
				'User-Agent': 'n8n-gigachat/1.0',
				Accept: 'application/json',
			},
			httpsAgent: new https.Agent({ rejectUnauthorized: false }),
		},
	);
	return response.data.access_token;
}

async function searchGigaChatModels(this: ILoadOptionsFunctions) {
	const credentials = await this.getCredentials('gigaChatApi');
	const accessToken = await getGigaChatAccessToken({
		clientId: String(credentials.clientId),
		clientSecret: String(credentials.clientSecret),
		scope: String(credentials.scope),
		authUrl: String(credentials.authUrl),
	});
	const apiUrl = String(credentials.apiUrl).replace(/\/$/, '');
	const response = await axios.get(`${apiUrl}/models`, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'User-Agent': 'n8n-gigachat/1.0',
		},
		httpsAgent: new https.Agent({ rejectUnauthorized: false }),
	});
	const models = response.data.data || response.data.models || [];
	return models.map((model: any) => ({
		name: model.id || model.name,
		value: model.id || model.name,
		description: model.description || '',
	}));
}

export class LmChatGigaChat implements INodeType {
	methods = {
		loadOptions: {
			searchGigaChatModels,
		},
	};

	description: INodeTypeDescription = {
		displayName: 'GigaChat Chat Model',
		name: 'lmChatGigaChat',
		icon: {
			light: 'file:ac21ee8f_GC-api-black-green-sphere.svg',
			dark: 'file:ac21ee8f_GC-api-black-green-sphere.svg',
		},
		group: ['transform'],
		version: 1,
		description: 'GigaChat LLM via langchain-gigachat',
		defaults: {
			name: 'GigaChat Chat Model',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://github.com/ai-forever/gigachain',
					},
				],
			},
		},
		inputs: [],
		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'gigaChatApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Model Name or ID',
				name: 'model',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'searchGigaChatModels',
				},
				required: true,
				default: 'GigaChat:latest',
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
						displayName: 'Temperature',
						name: 'temperature',
						type: 'number',
						default: 0.7,
						description: 'Sampling temperature',
					},
					{
						displayName: 'Top P',
						name: 'topP',
						type: 'number',
						default: 1,
						description: 'Nucleus sampling parameter',
					},
					{
						displayName: 'Max Tokens',
						name: 'max_tokens',
						type: 'number',
						default: 1024,
						description: 'Maximum number of tokens in response',
					},
					{
						displayName: 'Repetition Penalty',
						name: 'repetition_penalty',
						type: 'number',
						default: 1,
						description: 'Penalty for repeating tokens',
					},
					{
						displayName: 'N (Number of Completions)',
						name: 'n',
						type: 'number',
						default: 1,
						description: 'How many completions to generate',
					},
					{
						displayName: 'Stream',
						name: 'stream',
						type: 'boolean',
						default: false,
						description: 'Whether to stream responses',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('gigaChatApi');
		const model = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as Record<string, any>;

		// Преобразуем topP в top_p для соответствия API GigaChat
		if (options.topP !== undefined) {
			options.top_p = options.topP;
			delete options.topP;
		}

		const chat = new GigaChat({
			clientId: String(credentials.clientId),
			clientSecret: String(credentials.clientSecret),
			scope: String(credentials.scope),
			authUrl: String(credentials.authUrl),
			baseURL: String(credentials.apiUrl),
			model,
			...options,
			callbacks: [new N8nLlmTracing(this)],
		});
		return { response: chat };
	}
}
