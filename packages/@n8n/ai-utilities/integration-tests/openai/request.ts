import { getParametersJsonSchema, type ChatModelConfig, type Message, type Tool } from 'src';

import type { OpenAITool, ResponsesInputItem } from './types';

function assistantInput(content: Message['content']): ResponsesInputItem[] {
	const items: ResponsesInputItem[] = [];
	for (const contentPart of content) {
		if (contentPart.type === 'text') {
			items.push({
				type: 'message',
				role: 'assistant',
				content: [{ type: 'output_text', text: contentPart.text }],
			});
		} else if (contentPart.type === 'tool-call') {
			if (!contentPart.toolCallId) {
				throw new Error('Tool call ID is required');
			}
			items.push({
				type: 'function_call',
				call_id: contentPart.toolCallId,
				name: contentPart.toolName,
				arguments: contentPart.input,
			});
		} else if (contentPart.type === 'reasoning') {
			const encryptedContent = contentPart.providerMetadata?.encryptedContent;
			// OpenAI only reuses reasoning that carries its encrypted payload.
			// Reasoning without it, for example from another provider, is left out.
			if (typeof encryptedContent === 'string') {
				items.push({
					type: 'reasoning',
					summary: [{ type: 'summary_text', text: contentPart.text }],
					encrypted_content: encryptedContent,
				});
			}
		}
	}
	return items;
}

function messageInput(message: Message): ResponsesInputItem[] {
	switch (message.role) {
		case 'user':
			return message.content.flatMap((part) =>
				part.type === 'text' ? [{ role: 'user' as const, content: part.text }] : [],
			);
		case 'assistant':
			return assistantInput(message.content);
		case 'tool':
			return message.content.flatMap((part) =>
				part.type === 'tool-result'
					? [
							{
								type: 'function_call_output' as const,
								call_id: part.toolCallId,
								output: typeof part.result === 'string' ? part.result : JSON.stringify(part.result),
							},
						]
					: [],
			);
		default:
			return [];
	}
}

function isUserText(item: ResponsesInputItem): item is { role: 'user'; content: string } {
	return 'role' in item && item.role === 'user' && typeof item.content === 'string';
}

export function genericMessagesToResponsesInput(messages: Message[]): {
	instructions?: string;
	input: string | ResponsesInputItem[];
} {
	const instructionsParts = messages
		.filter((message) => message.role === 'system')
		.flatMap((message) => message.content)
		.flatMap((part) => (part.type === 'text' ? [part.text] : []));
	const inputItems = messages.flatMap(messageInput);

	const instructions = instructionsParts.length > 0 ? instructionsParts.join('\n\n') : undefined;

	const single = inputItems[0];
	if (inputItems.length === 1 && single && isUserText(single)) {
		return { instructions, input: single.content };
	}
	return { instructions, input: inputItems };
}

export function genericToolToResponsesTool(tool: Tool): OpenAITool {
	if (tool.type === 'provider') {
		if (tool.name === 'web_search') {
			return {
				type: 'web_search',
				...tool.args,
			};
		}
		throw new Error(`Unsupported provider tool: ${tool.name}`);
	}
	const parameters = getParametersJsonSchema(tool);
	return {
		type: 'function',
		name: tool.name,
		description: tool.description,
		parameters,
		strict: tool.strict,
	};
}

export function isReasoningInput(
	item: ResponsesInputItem,
): item is Extract<ResponsesInputItem, { type: 'reasoning' }> {
	return 'type' in item && item.type === 'reasoning';
}

export function definedHeaders(
	headers: Readonly<ChatModelConfig['headers']>,
): Record<string, string> | undefined {
	if (!headers) return undefined;
	const result: Record<string, string> = {};
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined) result[name] = value;
	}
	return result;
}
