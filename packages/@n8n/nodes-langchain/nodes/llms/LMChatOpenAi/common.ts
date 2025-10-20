import type { OpenAIClient } from '@langchain/openai';
import type { ChatOpenAIToolType } from '@langchain/openai/dist/utils/tools';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import { isObjectEmpty, jsonParse, type IDataObject } from 'n8n-workflow';

export type ChatResponseRequest = OpenAIClient.Responses.ResponseCreateParamsNonStreaming & {
	conversation?: { id: string } | string;
	top_logprobs?: number;
};

const removeEmptyProperties = <T>(rest: { [key: string]: any }): T => {
	return Object.keys(rest)
		.filter(
			(k) =>
				rest[k] !== '' && rest[k] !== undefined && !(isObject(rest[k]) && isObjectEmpty(rest[k])),
		)
		.reduce((a, k) => ({ ...a, [k]: rest[k] }), {}) as unknown as T;
};

const toArray = (str: string) =>
	str
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);

export const formatBuiltInTools = (builtInTools: IDataObject) => {
	const tools: ChatOpenAIToolType[] = [];
	if (builtInTools) {
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

			tools.push({
				type: 'web_search_preview',
				search_context_size: get(webSearchOptions, 'searchContextSize', 'medium') as
					| 'low'
					| 'medium'
					| 'high',
				user_location: userLocation,
				...(allowedDomains && { filters: { allowed_domains: allowedDomains } }),
			});
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

				tools.push(
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
			tools.push({
				type: 'code_interpreter',
				container: {
					type: 'auto',
				},
			});
		}

		if (builtInTools.fileSearch) {
			const vectorStoreIds = get(builtInTools.fileSearch, 'vectorStoreIds', '[]') as string;
			const filters = get(builtInTools.fileSearch, 'filters', '{}') as string;
			tools.push({
				type: 'file_search',
				vector_store_ids: jsonParse(vectorStoreIds, {
					errorMessage: 'Failed to parse vector store IDs',
				}),
				filters: filters
					? jsonParse(filters, { errorMessage: 'Failed to parse filters' })
					: undefined,
				max_num_results: get(builtInTools.fileSearch, 'maxResults') as number,
			});
		}
	}
	return tools;
};

export const prepareAdditionalResponsesParams = (options: IDataObject) => {
	const body: Partial<ChatResponseRequest> = {
		previous_response_id: options.previousResponseId as string,
		prompt_cache_key: options.promptCacheKey as string,
		safety_identifier: options.safetyIdentifier as string,
		service_tier: options.serviceTier as ChatResponseRequest['service_tier'],
		top_logprobs: options.topLogprobs as number,
	};

	if (options.conversationId) {
		body.conversation = options.conversationId as string;
	}

	if (options.metadata) {
		body.metadata = jsonParse(options.metadata as string, {
			errorMessage: 'Failed to parse metadata',
		});
	}

	if (options.promptConfig) {
		const prompt = get(options, 'promptConfig.promptOptions', {}) as IDataObject;
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

	if (options.textFormat) {
		const textOptions = get(options, 'textFormat.textOptions', {}) as IDataObject;
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
		} else {
			textConfig.format = {
				type: textOptions.type as 'json_object' | 'text',
			};
		}

		if (textConfig.format) {
			textConfig.format = removeEmptyProperties(textConfig.format);
		}

		body.text = textConfig;
	}

	return body;
};
