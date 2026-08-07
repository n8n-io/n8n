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
	const body: Partial<ChatResponseRequest> = {};

	if (options.promptCacheKey) {
		body.prompt_cache_key = options.promptCacheKey;
	}

	if (options.safetyIdentifier) {
		body.safety_identifier = options.safetyIdentifier;
	}

	if (options.serviceTier) {
		body.service_tier = options.serviceTier;
	}

	if (options.topLogprobs !== undefined) {
		body.top_logprobs = options.topLogprobs;
	}

	if (options.conversationId) {
		body.conversation = options.conversationId;
	}

	if (options.metadata) {
		body.metadata = jsonParse(options.metadata, {
			errorMessage: 'Failed to parse metadata',
		});
	}

	const promptOptions = options.promptConfig?.promptOptions as PromptOptions | undefined;
	if (promptOptions?.promptId) {
		body.prompt = removeEmptyProperties({
			id: promptOptions.promptId,
			version: promptOptions.version,
			variables: promptOptions.variables
				? jsonParse(promptOptions.variables, {
						errorMessage: 'Failed to parse prompt variables',
					})
				: undefined,
		});
	}

	const textOptions = options.textFormat?.textOptions as TextOptions | undefined;
	if (textOptions && !isObjectEmpty(textOptions)) {
		const textConfig: OpenAIClient.Responses.ResponseTextConfig = {
			verbosity: textOptions.verbosity as OpenAIClient.Responses.ResponseTextConfig['verbosity'],
		};

		if (textOptions.type === 'json_schema') {
			textConfig.format = {
				type: textOptions.type,
				name: textOptions.name ?? 'response',
				schema: jsonParse(textOptions.schema ?? '{}', {
					errorMessage: 'Failed to parse schema',
				}),
			};
		} else if (textOptions.type) {
			textConfig.format = {
				type: textOptions.type as 'json_object' | 'text',
			};
		}

		body.text = removeEmptyProperties(textConfig);
	}

	if (options.reasoningEffort) {
		body.reasoning = {
			effort: options.reasoningEffort,
		};
	}

	return removeEmptyProperties(body);
};
