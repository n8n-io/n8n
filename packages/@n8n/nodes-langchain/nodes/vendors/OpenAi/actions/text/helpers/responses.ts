import { jsonParse, type IDataObject } from 'n8n-workflow';
import type { ChatInputItem, ChatContent, ChatResponseRequest } from '../../../helpers/interfaces';
import type { OpenAIClient } from '@langchain/openai';
import get from 'lodash/get';

function removeEmptyProperties<T>(rest: { [key: string]: any }): T {
	return Object.keys(rest)
		.filter((k) => rest[k] !== '' && rest[k] !== undefined)
		.reduce((a, k) => ({ ...a, [k]: rest[k] }), {}) as unknown as T;
}

const formatInput = (messages: IDataObject[]) => {
	return messages.map<ChatInputItem>((message) => {
		const role = message.role as ChatInputItem['role'];
		let content: ChatContent = [];
		if (message.type === 'text') {
			content = [{ type: 'input_text', text: message.content as string }];
		}
		if (message.type === 'image') {
			content = [
				{
					type: 'input_image',
					detail: (message.imageDetail as any) || 'auto',
					...(message.imageType === 'url' && { image_url: message.imageUrl as string }),
					...(message.imageType === 'base64' && { image_url: message.imageData as string }),
					...(message.fileId && { file_id: message.fileId as string }),
				},
			];
		}
		if (message.type === 'file') {
			content = [
				{
					type: 'input_file',
					...(message.fileName && { file_name: message.fileName as string }),
					...(message.fileType === 'url' && { file_url: message.fileUrl as string }),
					...(message.fileType === 'fileId' && { file_id: message.fileId as string }),
					...(message.fileType === 'base64' && { file_data: message.fileData as string }),
				},
			];
		}
		return { role, content };
	});
};

export const createRequest = (
	model: string,
	messages: IDataObject[],
	options: IDataObject,
	tools?: OpenAIClient.Responses.FunctionTool[],
): ChatResponseRequest => {
	const body: ChatResponseRequest = {
		model,
		input: formatInput(messages),
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
	};

	if (options.truncation !== undefined) {
		body.truncation = !!options.truncation ? 'auto' : 'disabled';
	}

	if (options.conversationId) {
		body.conversation = {
			id: options.conversationId as string,
		};
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

	return removeEmptyProperties(body);
};
