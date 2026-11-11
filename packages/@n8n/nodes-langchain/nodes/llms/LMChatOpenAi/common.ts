import type { OpenAIClient } from '@langchain/openai';
import type { ChatOpenAIToolType } from '@langchain/openai/dist/utils/tools';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import { isObjectEmpty, type DisplayCondition } from 'n8n-workflow';

import { parseJsonParameter } from '@utils/helpers';

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
				vector_store_ids: parseJsonParameter(vectorStoreIds, 'Failed to parse vector store IDs'),
				filters: filters ? parseJsonParameter(filters, 'Failed to parse filters') : undefined,
				max_num_results: get(builtInTools.fileSearch, 'maxResults') as number,
			});
		}
	}
	return tools;
};

/**
 * Reasoning-effort support matrix, last checked 12 Nov 2026.
 * Source: https://developers.openai.com/api/docs/models
 *
 * It lists the model IDs that are verified to accept `reasoning_effort: "none"`.
 * It holds per-model-ID evidence, not family names, because a family shape fails
 * in both directions: gpt-6-sol accepts `none`, gpt-6-astra rejects it.
 *
 * The base pattern covers only the base IDs gpt-5.1, gpt-5.2, gpt-5.4, gpt-5.5
 * and gpt-5.6. It skips gpt-5.3, and it skips every mini and nano tier, because
 * those IDs are unverified. Only gpt-5.4-mini and gpt-5.4-nano are confirmed, so
 * those two stay in the extras list.
 */
const NONE_REASONING_BASE = 'gpt-5\\.(1|2|4|5|6)';

// Variants the base pattern cannot express on its own.
const NONE_REASONING_EXTRAS = [
	'gpt-5.4-mini',
	'gpt-5.4-nano',
	'gpt-5.6-sol',
	'gpt-5.6-terra',
	'gpt-5.6-luna',
	'gpt-6-sol',
	'gpt-6-luna',
	'gpt-6.1-terra',
];

const NONE_REASONING_REGEX_STR = `^(${NONE_REASONING_BASE}|${NONE_REASONING_EXTRAS.map((m) =>
	m.replace(/\./g, '\\.'),
).join('|')})(-\\d{4}-\\d{2}-\\d{2})?$`;

/** Display condition for the dropdown variant that adds `none`. */
export const NONE_REASONING_CONDITION: DisplayCondition = {
	_cnd: { regex: NONE_REASONING_REGEX_STR },
};

// eslint-disable-next-line n8n-local-rules/no-dynamic-regexp -- static pattern derived from a fixed constant; no runtime input
const NONE_REASONING_PATTERN = new RegExp(NONE_REASONING_REGEX_STR);

/**
 * True when the model ID is verified to accept `reasoning_effort: "none"`.
 * Exported so callers and tests share one source of truth.
 */
export function isNoneReasoningSupported(model: string): boolean {
	return NONE_REASONING_PATTERN.test(model);
}

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
		body.metadata = parseJsonParameter(options.metadata, 'Failed to parse metadata');
	}

	if (options.promptConfig) {
		const prompt = get(options, 'promptConfig.promptOptions', {} as PromptOptions);
		body.prompt = removeEmptyProperties({
			id: prompt.promptId,
			version: prompt.version,
			...(prompt.variables && {
				variables: parseJsonParameter(prompt.variables, 'Failed to parse prompt variables'),
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
				schema: parseJsonParameter(textOptions.schema, 'Failed to parse schema'),
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
