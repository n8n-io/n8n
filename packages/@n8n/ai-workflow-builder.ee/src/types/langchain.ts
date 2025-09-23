import type { AIMessage, BaseMessage } from '@langchain/core/messages';

export function isAIMessage(msg: BaseMessage): msg is AIMessage {
	return msg.getType() === 'ai';
}
