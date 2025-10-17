import type { OpenAIClient } from '@langchain/openai';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import { isObjectEmpty, jsonParse, type IDataObject, type IExecuteFunctions } from 'n8n-workflow';
import type { ResponseInputImage } from 'openai/resources/responses/responses';

import { getBinaryDataFile } from '../../../../helpers/binary-data';
import type {
	ChatContent,
	ChatInputItem,
	ChatResponseRequest,
} from '../../../../helpers/interfaces';

const toArray = (str: string) => str.split(',').map((e) => e.trim());

const removeEmptyProperties = <T>(rest: { [key: string]: any }): T => {
	return Object.keys(rest)
		.filter(
			(k) =>
				rest[k] !== '' && rest[k] !== undefined && !(isObject(rest[k]) && isObjectEmpty(rest[k])),
		)
		.reduce((a, k) => ({ ...a, [k]: rest[k] }), {}) as unknown as T;
};

export async function formatInputMessages(
	this: IExecuteFunctions,
	i: number,
	messages: IDataObject[],
) {
	return await Promise.all(
		messages.map<Promise<ChatInputItem>>(async (message) => {
			const role = message.role as ChatInputItem['role'];
			let content: ChatContent = [];
			if (message.type === 'text' || !message.type) {
				content = [{ type: 'input_text', text: message.content as string }];
			} else if (message.type === 'image') {
				const detail = (message.imageDetail as ResponseInputImage['detail']) || ('auto' as const);

				if (message.imageType === 'base64') {
					const { fileContent, contentType } = await getBinaryDataFile(
						this,
						i,
						message.binaryPropertyName as string,
					);
					const buffer = await this.helpers.binaryToBuffer(fileContent);
					content = [
						{
							type: 'input_image',
							detail,
							image_url: `data:${contentType};base64,${buffer.toString('base64')}`,
						},
					];
				} else {
					content = [
						{
							type: 'input_image',
							detail,
							...(message.imageType === 'url' && { image_url: message.imageUrl as string }),
							...(message.imageType === 'fileId' && { file_id: message.fileId as string }),
						},
					];
				}
			} else if (message.type === 'file') {
				if (message.fileType === 'base64') {
					const { fileContent, contentType } = await getBinaryDataFile(
						this,
						i,
						message.binaryPropertyName as string,
					);
					const buffer = await this.helpers.binaryToBuffer(fileContent);
					content = [
						{
							type: 'input_file',
							filename: message.fileName as string,
							file_data: `data:${contentType};base64,${buffer.toString('base64')}`,
						},
					];
				} else {
					content = [
						{
							type: 'input_file',
							...(message.fileType === 'url' && { file_url: message.fileUrl as string }),
							...(message.fileType === 'fileId' && { file_id: message.fileId as string }),
						},
					];
				}
			}
			return { role, content };
		}),
	);
}

interface CreateRequestOptions {
	model: string;
	messages: IDataObject[];
	options: IDataObject;
	builtInTools?: IDataObject;
	tools?: OpenAIClient.Responses.FunctionTool[];
}

export async function createRequest(
	this: IExecuteFunctions,
	i: number,
	{ model, messages, options, builtInTools, tools }: CreateRequestOptions,
): Promise<ChatResponseRequest> {
	const body: ChatResponseRequest = {
		model,
		input: await formatInputMessages.call(this, i, messages),
		parallel_tool_calls: get(options, 'parallelToolCalls', true) as boolean,
		store: get(options, 'store', true) as boolean,
		instructions: options.instructions as string,
		max_output_tokens: options.maxTokens as number,
		previous_response_id: options.previousResponseId as string,
		prompt_cache_key: options.promptCacheKey as string,
		safety_identifier: options.safetyIdentifier as string,
		service_tier: options.serviceTier as ChatResponseRequest['service_tier'],
		temperature: options.temperature as number,
		top_p: options.topP as number,
		top_logprobs: options.topLogprobs as number,
		tools,
		max_tool_calls: options.maxToolCalls as number,
		background: get(options, 'backgroundMode.values.enabled', false) as boolean,
	};

	if (options.truncation !== undefined) {
		body.truncation = !!options.truncation ? 'auto' : 'disabled';
	}

	if (options.conversationId) {
		body.conversation = options.conversationId as string;
	}

	if (Array.isArray(options.include) && options.include?.length) {
		body.include = options.include as ChatResponseRequest['include'];
	}

	if (options.metadata) {
		body.metadata = jsonParse(options.metadata as string, {
			errorMessage: 'Failed to parse metadata',
		});
	}

	if (options.promptConfig) {
		const prompt = get(options, 'promptConfig.promptOptions') as IDataObject;
		body.prompt = removeEmptyProperties({
			id: prompt.promptId,
			version: prompt.version,
			...(prompt.variables && {
				variables: jsonParse(prompt.variables as string, {
					errorMessage: 'Failed to parse prompt variables',
				}),
			}),
		});
	}

	if (options.reasoning) {
		const reasoning = get(options, 'reasoning.reasoningOptions') as IDataObject;
		body.reasoning = removeEmptyProperties({
			effort: reasoning.effort,
			summary: reasoning.summary && reasoning.summary !== 'none' ? reasoning.summary : undefined,
		});
	}

	if (options.textFormat) {
		const textOptions = get(options, 'textFormat.textOptions') as IDataObject;
		const textConfig: OpenAIClient.Responses.ResponseTextConfig = {
			verbosity: textOptions.verbosity as OpenAIClient.Responses.ResponseTextConfig['verbosity'],
		};
		if (textOptions.type === 'json_schema') {
			textConfig.format = {
				type: textOptions.type,
				name: textOptions.name as string,
				schema: jsonParse(textOptions.schema as string, {
					errorMessage: 'Failed to parse schema',
				}),
			};
		} else if (textOptions.type === 'json_object') {
			textConfig.format = {
				type: textOptions.type,
			};
			body.input = [
				{
					role: 'system',
					content: [
						{ type: 'input_text', text: 'You are a helpful assistant designed to output JSON.' },
					],
				},
				...body.input,
			];
		} else if (textOptions.type === 'text') {
			textConfig.format = {
				type: textOptions.type,
			};
		}

		if (textConfig.format) {
			textConfig.format = removeEmptyProperties(textConfig.format);
		}

		body.text = textConfig;
	}

	if (builtInTools) {
		const newTools = body.tools ?? [];

		const webSearchOptions = get(builtInTools, 'webSearch') as IDataObject | undefined;
		if (webSearchOptions) {
			let allowedDomains: string[] | undefined;
			const allowedDomainsRaw = get(webSearchOptions, 'allowedDomains', '') as string;
			if (allowedDomainsRaw) {
				allowedDomains = toArray(allowedDomainsRaw);
			}

			let userLocation: OpenAIClient.Responses.WebSearchTool.UserLocation | undefined;
			if (webSearchOptions.country || webSearchOptions.city || webSearchOptions.region) {
				userLocation = {
					type: 'approximate',
					country: webSearchOptions.country as string,
					city: webSearchOptions.city as string,
					region: webSearchOptions.region as string,
				};
			}

			newTools.push(
				removeEmptyProperties({
					type: 'web_search',
					search_context_size: get(webSearchOptions, 'searchContextSize', 'medium') as
						| 'low'
						| 'medium'
						| 'high',
					user_location: userLocation,
					...(allowedDomains && { filters: { allowed_domains: allowedDomains } }),
				}),
			);
		}

		const mcpServers = get(builtInTools.mcpServers, 'mcpServerOptions') as
			| IDataObject[]
			| undefined;
		if (Array.isArray(mcpServers) && mcpServers.length) {
			for (const mcpServer of mcpServers) {
				let allowedTools: string[] | undefined;
				const allowedToolsRaw = get(mcpServer, 'allowedTools', '') as string;
				if (allowedToolsRaw) {
					allowedTools = toArray(allowedToolsRaw);
				}

				const headersRaw = get(mcpServer, 'headers', '') as string;

				newTools.push(
					removeEmptyProperties({
						type: 'mcp',
						server_label: mcpServer.serverLabel as string,
						server_url: mcpServer.serverUrl as string,
						connector_id: mcpServer.connectorId as string,
						authorization: mcpServer.authorization as string,
						allowed_tools: allowedTools,
						headers: headersRaw
							? jsonParse(headersRaw, { errorMessage: 'Failed to parse headers' })
							: undefined,
						require_approval: 'never',
						server_description: mcpServer.serverDescription as string,
					}),
				);
			}
		}

		if (builtInTools.codeInterpreter) {
			newTools.push({
				type: 'code_interpreter',
				container: {
					type: 'auto',
				},
			});
		}

		if (builtInTools.localShell) {
			newTools.push({
				type: 'local_shell',
			});
		}

		if (builtInTools.fileSearch) {
			const vectorStoreIds = get(builtInTools.fileSearch, 'vectorStoreIds', '[]') as string;
			const filters = get(builtInTools.fileSearch, 'filters', '{}') as string;
			newTools.push(
				removeEmptyProperties({
					type: 'file_search',
					vector_store_ids: jsonParse(vectorStoreIds, {
						errorMessage: 'Failed to parse vector store IDs',
					}),
					filters: filters
						? jsonParse(filters, { errorMessage: 'Failed to parse filters' })
						: undefined,
					max_num_results: get(builtInTools.fileSearch, 'maxResults') as number,
				}),
			);
		}

		body.tools = newTools;
	}

	return await removeEmptyProperties(body);
}
