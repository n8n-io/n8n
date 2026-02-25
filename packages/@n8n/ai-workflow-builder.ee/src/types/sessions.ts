import type { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

export interface Session {
	sessionId: string;
	messages: Array<Record<string, unknown>>;
	lastUpdated?: string;
}

export type LangchainMessage = AIMessage | HumanMessage | ToolMessage;

/**
 * Type guard to validate if a value is a valid Langchain message
 */
function isLangchainMessage(value: unknown): value is LangchainMessage {
	if (!value || typeof value !== 'object') {
		return false;
	}

	// Check for required properties that all message types have
	if (!('content' in value)) {
		return false;
	}

	const content = value.content;
	if (typeof content !== 'string' && !Array.isArray(content)) {
		return false;
	}

	// Check for message type indicators
	const hasValidType =
		'_getType' in value || // Common method in Langchain messages
		('constructor' in value &&
			value.constructor !== null &&
			typeof value.constructor === 'function' &&
			'name' in value.constructor &&
			(value.constructor.name === 'AIMessage' ||
				value.constructor.name === 'HumanMessage' ||
				value.constructor.name === 'ToolMessage')) ||
		('role' in value &&
			typeof value.role === 'string' &&
			['assistant', 'human', 'user', 'tool'].includes(value.role));

	return hasValidType;
}

/**
 * Type guard to validate if a value is an array of Langchain messages
 */
export function isLangchainMessagesArray(value: unknown): value is LangchainMessage[] {
	if (!Array.isArray(value)) {
		return false;
	}

	return value.every(isLangchainMessage);
}
