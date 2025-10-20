import type { OpenAIClient } from '@langchain/openai';
import get from 'lodash/get';
import isObject from 'lodash/isObject';
import type { IDataObject } from 'n8n-workflow';
import { isObjectEmpty, jsonParse } from 'n8n-workflow';

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
