import type { AIMessage, BaseMessage } from '@langchain/core/messages';

export function isAIMessage(msg: BaseMessage): msg is AIMessage {
	return msg.getType() === 'ai';
}

/**
 * Type guard to check if a value is a BaseMessage
 * BaseMessage instances have a getType method and content property
 */
export function isBaseMessage(value: unknown): value is BaseMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		'getType' in value &&
		typeof (value as { getType: unknown }).getType === 'function' &&
		'content' in value
	);
}
