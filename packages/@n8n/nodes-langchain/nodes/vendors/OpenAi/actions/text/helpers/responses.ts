import { jsonParse, type IDataObject } from 'n8n-workflow';
import type { ChatInputItem, ChatContent, ChatResponseRequest } from '../../../helpers/interfaces';
import type { OpenAIClient } from '@langchain/openai';

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
					...(message.imageType === 'url'
						? { image_url: message.imageUrl as string }
						: { file_id: message.fileId as string }),
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
		parallel_tool_calls: !!options.parallelToolCalls,
		store: !!options.store,
		instructions: options.instructions as string,
		max_output_tokens: options.maxOutputTokens as number,
		previous_response_id: options.previousResponseId as string,
		prompt_cache_key: options.promptCacheKey as string,
		safety_identifier: options.safetyIdentifier as string,
		service_tier: options.serviceTier as ChatResponseRequest['service_tier'],
		temperature: options.temperature as number,
		top_p: options.topP as number,
		truncation: options.truncation as ChatResponseRequest['truncation'],
		top_logprobs: options.topLogprobs as number,
		tools,
	};

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

	if (options.prompt) {
		const prompt = options.prompt as IDataObject;
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
		const reasoning = options.reasoning as IDataObject;
		body.reasoning = removeEmptyProperties({
			effort: reasoning.effort,
			summary: reasoning.summary && reasoning.summary !== 'none' ? reasoning.summary : undefined,
		});
	}

	if (options.textFormat) {
		const textFormat = options.textFormat as IDataObject;
		let text: IDataObject = {
			verbosity: textFormat.verbosity,
		};
		if (textFormat.type === 'json_schema') {
			text = {
				type: textFormat.type,
				name: textFormat.name,
				schema: textFormat.schema,
			};
		} else if (textFormat.type === 'json_object') {
			text = {
				type: textFormat.type,
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
		} else if (textFormat.type === 'text') {
			text = {
				type: textFormat.type,
			};
		}
		body.text = removeEmptyProperties(text);
	}

	return removeEmptyProperties(body);
};
