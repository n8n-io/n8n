import * as LangchainMessages from '@langchain/core/messages';

import type * as N8nMessages from '../types/message';

function fromLcRole(role: LangchainMessages.MessageType): N8nMessages.MessageRole {
	switch (role) {
		case 'system':
			return 'system';
		case 'human':
			return 'human';
		case 'ai':
			return 'ai';
		case 'tool':
			return 'tool';
		default:
			return 'human';
	}
}
function isTextBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Text {
	return block.type === 'text';
}
function isReasoningBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Reasoning {
	return block.type === 'reasoning';
}
function isFileBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Multimodal.Standard {
	return (
		block.type === 'file' ||
		block.type === 'audio' ||
		block.type === 'video' ||
		block.type === 'image' ||
		block.type === 'text-plain'
	);
}
function isToolCallBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.ToolCall {
	return block.type === 'tool_call';
}
function isInvalidToolCallBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.InvalidToolCall {
	return block.type === 'invalid_tool_call';
}
function isToolResultBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.Tools.ServerToolCallResult {
	return block.type === 'tool-result';
}
function isCitationBlock(block: unknown): block is LangchainMessages.ContentBlock.Citation {
	return (
		typeof block === 'object' && block !== null && 'type' in block && block.type === 'citation'
	);
}
function isNonStandardBlock(
	block: LangchainMessages.ContentBlock,
): block is LangchainMessages.ContentBlock.NonStandard {
	return block.type === 'non_standard';
}

function fromLcContent(
	content: string | LangchainMessages.ContentBlock | LangchainMessages.ContentBlock[],
): N8nMessages.MessageContent[] {
	if (typeof content === 'string') {
		return [
			{
				type: 'text',
				text: content,
			},
		];
	}
	const blocks = Array.isArray(content) ? content : [content];
	return blocks
		.map((block) => {
			let content: N8nMessages.MessageContent | null = null;

			if (isTextBlock(block)) {
				content = {
					type: 'text',
					text: block.text,
				};
			}
			if (isReasoningBlock(block)) {
				content = {
					type: 'reasoning',
					text: block.reasoning,
				};
			}
			if (isFileBlock(block)) {
				let metadata: Record<string, unknown> = {};
				if (block.metadata) {
					metadata = block.metadata;
				}
				if ('url' in block) {
					metadata.url = block.url;
				}
				if ('fileId' in block) {
					metadata.fileId = block.fileId;
				}
				content = {
					type: 'file',
					mediaType: block.mimeType!,
					data: block.data!,
					providerMetadata: Object.keys(metadata).length > 0 ? metadata : undefined,
				};
			}
			if (isToolCallBlock(block)) {
				content = {
					type: 'tool-call',
					toolCallId: block.id!,
					toolName: block.name,
					input: JSON.stringify(block.args),
				};
			}
			if (isInvalidToolCallBlock(block)) {
				content = {
					type: 'tool-result',
					toolCallId: block.id!,
					result: block.error,
					isError: true,
				};
			}
			if (isToolResultBlock(block)) {
				content = {
					type: 'tool-result',
					toolCallId: block.toolCallId,
					result: block.output,
					isError: block.status === 'error',
				};
			}
			if (isCitationBlock(block)) {
				content = {
					type: 'citation',
					source: block.source,
					url: block.url,
					title: block.title,
					startIndex: block.startIndex,
					endIndex: block.endIndex,
					text: block.citedText,
				};
			}
			if (isNonStandardBlock(block)) {
				content = {
					type: 'provider',
					value: block.value,
				};
			}
			if (!content) {
				return null;
			}
			return content;
		})
		.filter((content): content is N8nMessages.MessageContent => content !== null);
}

export function fromLcMessage(msg: LangchainMessages.BaseMessage): N8nMessages.Message {
	if (LangchainMessages.ToolMessage.isInstance(msg)) {
		return {
			role: 'tool',
			content: [
				{
					type: 'tool-result',
					toolCallId: msg.tool_call_id,
					result: fromLcContent(msg.content),
					isError: false,
					providerMetadata: msg.metadata,
				},
			],
		};
	}
	if (LangchainMessages.AIMessage.isInstance(msg)) {
		const content = fromLcContent(msg.content);
		const toolsCalls = msg.tool_calls;
		if (toolsCalls?.length) {
			const mappedToolsCalls = toolsCalls.map<N8nMessages.ContentToolCall>((toolCall) => ({
				type: 'tool-call',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: JSON.stringify(toolCall.args),
				providerMetadata: msg.response_metadata,
			}));
			content.push(...mappedToolsCalls);
		}
		return {
			role: 'ai',
			content,
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.SystemMessage.isInstance(msg)) {
		return {
			role: 'system',
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.HumanMessage.isInstance(msg)) {
		return {
			role: 'human',
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	if (LangchainMessages.BaseMessage.isInstance(msg)) {
		return {
			role: fromLcRole(msg.type),
			content: fromLcContent(msg.content),
			id: msg.id,
			name: msg.name,
		};
	}
	throw new Error(`Provided message is not a valid Langchain message: ${JSON.stringify(msg)}`);
}
