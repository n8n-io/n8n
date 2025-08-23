import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseChatMemory } from 'langchain/memory';

/**
 * Simple cache for validated messages to improve performance
 * Uses WeakMap to automatically garbage collect when messages are no longer referenced
 */
const validatedMessageCache = new WeakMap<BaseMessage, BaseMessage>();

/**
 * Cache statistics for performance monitoring
 */
let cacheStats = {
	hits: 0,
	misses: 0,
	get hitRate() {
		const total = this.hits + this.misses;
		return total === 0 ? 0 : this.hits / total;
	},
};

/**
 * Extended HumanMessage interface that may contain a messages array
 */
interface HumanMessageWithMessages extends HumanMessage {
	messages?: Array<{ text?: string; content?: string } | string>;
}

/**
 * BaseMessage with optional lc_kwargs for MongoDB compatibility
 */
interface MessageWithLcKwargs {
	lc_kwargs?: Array<{
		role?: string;
		content?: string;
		messages?: Array<{ text?: string; content?: string } | string>;
	}>;
}

/**
 * Extracts text content from various message formats
 * @param messages - Array of message objects or strings
 * @returns Concatenated text content
 */
function extractTextContent(messages: Array<any>): string {
	return messages
		.filter((msg: any) => msg && (typeof msg === 'string' || msg.text || msg.content))
		.map((msg: any) => {
			if (typeof msg === 'string') return msg;
			return msg.text || msg.content || '';
		})
		.join(' ')
		.trim();
}

/**
 * Recovers content from lc_kwargs for MongoDB stored messages
 * @param messageWithKwargs - Message with lc_kwargs property
 * @returns Recovered content string
 */
function recoverContentFromLcKwargs(messageWithKwargs: MessageWithLcKwargs): string {
	const { lc_kwargs } = messageWithKwargs;
	if (!Array.isArray(lc_kwargs)) return '';

	// Look for user messages first
	const userMessages = lc_kwargs.filter(
		(item: any) => item && typeof item === 'object' && item.role === 'user',
	);

	if (userMessages.length > 0) {
		// Get the last user message (most recent)
		const lastUserMessage = userMessages[userMessages.length - 1];
		return lastUserMessage.content || '';
	}

	// Fallback: look for any non-system content
	for (const kwarg of lc_kwargs) {
		if (kwarg && typeof kwarg === 'object') {
			if (kwarg.content !== undefined && kwarg.role !== 'system') {
				return kwarg.content;
			}
			if (kwarg.messages && Array.isArray(kwarg.messages)) {
				const textContent = extractTextContent(kwarg.messages);
				if (textContent) return textContent;
			}
		}
	}

	return '';
}

/**
 * Validates and fixes a HumanMessage with undefined or null content
 * @param message - The message to validate and fix
 * @returns Fixed message or original message if no fix needed
 */
export function validateAndFixHumanMessage(message: BaseMessage): BaseMessage {
	// Skip null or undefined messages
	if (!message || typeof message._getType !== 'function') {
		return message;
	}

	// Check cache first for performance
	if (validatedMessageCache.has(message)) {
		cacheStats.hits++;
		return validatedMessageCache.get(message)!;
	}

	cacheStats.misses++;

	if (message._getType() === 'human') {
		const humanMessage = message as HumanMessageWithMessages;

		// Check if content is undefined or null but messages array exists
		if (
			(humanMessage.content === undefined || humanMessage.content === null) &&
			'messages' in humanMessage &&
			Array.isArray(humanMessage.messages)
		) {
			const content = extractTextContent(humanMessage.messages);

			// Create a new HumanMessage with proper content
			const fixedMessage = new HumanMessage({
				content: content || '',
				additional_kwargs: humanMessage.additional_kwargs || {},
			});

			// Cache the result
			validatedMessageCache.set(message, fixedMessage);
			return fixedMessage;
		}

		// Try to recover from lc_kwargs (MongoDB specific)
		if (humanMessage.content === undefined || humanMessage.content === null) {
			const messageWithKwargs = humanMessage as HumanMessage & MessageWithLcKwargs;
			const recoveredContent = recoverContentFromLcKwargs(messageWithKwargs);

			const fixedMessage = new HumanMessage({
				content: recoveredContent || '',
				additional_kwargs: humanMessage.additional_kwargs || {},
			});

			// Cache the result
			validatedMessageCache.set(message, fixedMessage);
			return fixedMessage;
		}
	}

	// Cache the original message if no changes were needed
	validatedMessageCache.set(message, message);
	return message;
}

/**
 * Validates an array of messages and fixes any HumanMessage content issues
 * @param messages - Array of messages to validate
 * @returns Array of validated messages
 */
export function validateMessages(messages: BaseMessage[]): BaseMessage[] {
	if (!Array.isArray(messages)) {
		return messages;
	}

	return messages.map(validateAndFixHumanMessage);
}

/**
 * Gets cache performance statistics
 * @returns Cache statistics including hit rate
 */
export function getCacheStats() {
	return { ...cacheStats };
}

/**
 * Resets cache statistics
 */
export function resetCacheStats() {
	cacheStats.hits = 0;
	cacheStats.misses = 0;
}

/**
 * Options for memory wrapping
 */
interface WrapMemoryOptions {
	fallbackOnError?: boolean;
}

/**
 * Wraps a BaseChatMemory to ensure messages are validated when retrieved
 * @param memory - The memory instance to wrap
 * @param options - Wrapping options
 * @returns The wrapped memory instance
 */
export function wrapMemoryWithValidation(
	memory: BaseChatMemory,
	options: WrapMemoryOptions = {},
): BaseChatMemory {
	const { fallbackOnError = true } = options;

	// Check if memory has the expected structure
	if (!memory.chatHistory || typeof memory.chatHistory.getMessages !== 'function') {
		return memory;
	}

	// Store reference to original method
	const originalGetMessages = memory.chatHistory.getMessages;

	if (typeof originalGetMessages !== 'function') {
		return memory;
	}

	// Replace with validation wrapper
	memory.chatHistory.getMessages = async function (this: any) {
		try {
			const messages = await originalGetMessages.call(this);

			if (!Array.isArray(messages)) {
				return messages;
			}

			// Apply message validation to fix content field issues
			return validateMessages(messages);
		} catch (error) {
			// If there's an error in our wrapper, fall back to original method
			if (fallbackOnError) {
				return await originalGetMessages.call(this);
			}
			throw error;
		}
	};

	return memory;
}

/**
 * Extended options for MongoDB memory wrapping
 */
interface MongoDbWrapOptions extends WrapMemoryOptions {
	enableDirectDbFix?: boolean;
}

/**
 * Wraps memory with both retrieval and storage validation (for MongoDB)
 * @param memory - The memory instance to wrap
 * @param options - Wrapping options including MongoDB specific settings
 * @returns The wrapped memory instance
 */
export function wrapMemoryWithStorageValidation(
	memory: BaseChatMemory,
	options: MongoDbWrapOptions = {},
): BaseChatMemory {
	const { enableDirectDbFix = true } = options;

	// Check if memory has the expected structure
	if (!memory.chatHistory) {
		return memory;
	}

	// First apply retrieval validation
	wrapMemoryWithValidation(memory, options);

	// Then wrap addMessage for storage validation
	const originalAddMessage = memory.chatHistory.addMessage;

	if (typeof originalAddMessage === 'function') {
		memory.chatHistory.addMessage = async function (
			this: any,
			message: BaseMessage,
		): Promise<void> {
			// Validate and fix the message before storing
			const validatedMessage = validateAndFixHumanMessage(message);

			// Call the original method with the validated message
			return await originalAddMessage.call(this, validatedMessage);
		};
	}

	// For MongoDB, also wrap getMessages with direct DB access if enabled
	if (enableDirectDbFix) {
		const originalGetMessages = memory.chatHistory.getMessages;

		if (typeof originalGetMessages === 'function') {
			memory.chatHistory.getMessages = async function (this: any) {
				try {
					const mongoHistory = this as any;

					// Try direct MongoDB fix if collection is available
					if (mongoHistory.collection && mongoHistory.sessionId) {
						try {
							await fixMongoDbMessagesDirectly(mongoHistory);
						} catch (dbError) {}
					}

					// Now try the original method
					const messages = await originalGetMessages.call(this);

					return Array.isArray(messages) ? validateMessages(messages) : messages;
				} catch (error) {
					// Fallback to simple retrieval
					return await originalGetMessages.call(this);
				}
			};
		}
	}

	return memory;
}

/**
 * Fixes MongoDB messages directly in the database
 * @param mongoHistory - MongoDB history instance with collection access
 */
async function fixMongoDbMessagesDirectly(mongoHistory: any): Promise<void> {
	if (!mongoHistory.collection || !mongoHistory.sessionId) {
		return;
	}

	try {
		const rawMessages = await mongoHistory.collection
			.find({ sessionId: mongoHistory.sessionId })
			.toArray();

		for (const rawMsg of rawMessages) {
			if (rawMsg.data && rawMsg._id) {
				const updates: any = {};
				let needsUpdate = false;

				// Fix null additional_kwargs
				if (rawMsg.data.additional_kwargs === null) {
					updates['data.additional_kwargs'] = {};
					needsUpdate = true;
				}

				// Fix null content with fallback attempts
				if (rawMsg.data.content === null) {
					if (rawMsg.data.kwargs && rawMsg.data.kwargs.content) {
						updates['data.content'] = rawMsg.data.kwargs.content;
					} else if (rawMsg.data.text) {
						updates['data.content'] = rawMsg.data.text;
					} else {
						updates['data.content'] = '';
					}
					needsUpdate = true;
				}

				// Apply updates if necessary
				if (needsUpdate) {
					await mongoHistory.collection.updateOne({ _id: rawMsg._id }, { $set: updates });
				}
			}
		}
	} catch (error) {
		throw error;
	}
}
