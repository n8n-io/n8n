import type { OpenAIClient } from '@langchain/openai';
import type { ChatOpenAIToolType } from '@langchain/openai/dist/utils/tools';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import { isObjectEmpty, jsonParse } from 'n8n-workflow';

import type {
	BuiltInTools,
	ChatResponseRequest,
	ModelOptions,
	PromptOptions,
	TextOptions,
} from './types';

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

export const formatBuiltInTools = (builtInTools: BuiltInTools) => {
	const tools: ChatOpenAIToolType[] = [];
	if (builtInTools) {
		const webSearchOptions = get(builtInTools, 'webSearch');
		if (webSearchOptions) {
			let allowedDomains: string[] | undefined;
			const allowedDomainsRaw = get(webSearchOptions, 'allowedDomains', '');
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
				type: 'web_search',
				search_context_size: get(webSearchOptions, 'searchContextSize', 'medium'),
				user_location: userLocation,
				...(allowedDomains && { filters: { allowed_domains: allowedDomains } }),
			});
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
			const vectorStoreIds = get(builtInTools.fileSearch, 'vectorStoreIds', '[]');
			const filters = get(builtInTools.fileSearch, 'filters', '{}');
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

export const prepareAdditionalResponsesParams = (options: ModelOptions) => {
	const body: Partial<ChatResponseRequest> = {
		prompt_cache_key: options.promptCacheKey,
		safety_identifier: options.safetyIdentifier,
		service_tier: options.serviceTier,
		top_logprobs: options.topLogprobs,
	};

	if (options.conversationId) {
		body.conversation = options.conversationId;
	}

	if (options.metadata) {
		body.metadata = jsonParse(options.metadata, {
			errorMessage: 'Failed to parse metadata',
		});
	}

	if (options.promptConfig) {
		const prompt = get(options, 'promptConfig.promptOptions', {} as PromptOptions);
		body.prompt = removeEmptyProperties({
			id: prompt.promptId,
			version: prompt.version,
			...(prompt.variables && {
				variables: jsonParse(prompt.variables, {
					errorMessage: 'Failed to parse prompt variables',
				}),
			}),
		});
	}

	if (options.textFormat) {
		const textOptions = get(options, 'textFormat.textOptions', {} as TextOptions);
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

	if (options.reasoningEffort) {
		body.reasoning = {
			effort: options.reasoningEffort,
		};
	}

	return body;
};
