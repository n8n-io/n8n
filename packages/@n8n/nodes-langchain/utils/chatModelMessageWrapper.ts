import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { ChatGenerationChunk, ChatResult } from '@langchain/core/outputs';

const wrappedChatModelMessageInput = Symbol('wrappedChatModelMessageInput');

type GenerateMethod = (
	messages: BaseMessage[],
	options: unknown,
	runManager?: CallbackManagerForLLMRun,
) => Promise<ChatResult>;

type StreamMethod = (
	messages: BaseMessage[],
	options: unknown,
	runManager?: CallbackManagerForLLMRun,
) => AsyncGenerator<ChatGenerationChunk>;

type PatchableChatModel = {
	_generate: GenerateMethod;
	_streamResponseChunks: StreamMethod;
	[wrappedChatModelMessageInput]?: true;
};

export type ChatModelMessageWrapper = (messages: BaseMessage[]) => BaseMessage[];

export function normalizeEmptyToolCallContent(messages: BaseMessage[]): BaseMessage[] {
	return messages.map((message) => {
		if (
			AIMessage.isInstance(message) &&
			Array.isArray(message.content) &&
			message.content.length === 0 &&
			message.tool_calls?.length
		) {
			return new AIMessage({
				id: message.id,
				name: message.name,
				content: '',
				additional_kwargs: message.additional_kwargs,
				response_metadata: message.response_metadata,
				tool_calls: message.tool_calls,
				invalid_tool_calls: message.invalid_tool_calls,
				usage_metadata: message.usage_metadata,
			});
		}

		return message;
	});
}

/**
 * A method that wraps langchain chat model to convert incoming messages to a format that is compatible with the model.
 * By default, it normalizes messages with tool calls and content:[] to have content:''. Some old models expect to have some content alongside the tool calls.
 */
export function wrapChatModelMessageInput<TModel extends BaseChatModel>(
	model: TModel,
	wrapMessages: ChatModelMessageWrapper = normalizeEmptyToolCallContent,
): TModel {
	const patchableModel = model as TModel & PatchableChatModel;

	if (patchableModel[wrappedChatModelMessageInput]) return model;

	const originalGenerate = patchableModel._generate.bind(model);
	const originalStreamResponseChunks = patchableModel._streamResponseChunks.bind(model);

	patchableModel._generate = async (messages, options, runManager) =>
		await originalGenerate(wrapMessages(messages), options, runManager);

	patchableModel._streamResponseChunks = async function* (messages, options, runManager) {
		yield* originalStreamResponseChunks(wrapMessages(messages), options, runManager);
	};

	patchableModel[wrappedChatModelMessageInput] = true;

	return model;
}
