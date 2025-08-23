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
 * Type for individual lc_kwargs item
 */
interface LcKwargsItem {
	role?: string;
	content?: string;
	messages?: Array<{ text?: string; content?: string } | string>;
	[key: string]: unknown;
}

/**
 * Type guard to check if a value is a valid LcKwargsItem
 * @param value - The value to check
 * @returns True if the value is a valid LcKwargsItem
 */
function isLcKwargsItem(value: unknown): value is LcKwargsItem {
	return value !== null && value !== undefined && typeof value === 'object';
}

/**
 * BaseMessage with optional lc_kwargs for MongoDB compatibility
 */
interface MessageWithLcKwargs {
	lc_kwargs?: Array<LcKwargsItem>;
}

/**
 * Safely checks if an object has a property and it's an array
 * @param obj - The object to check
 * @param prop - The property name to check
 * @returns True if the property exists and is an array
 */
function hasArrayProperty(obj: unknown, prop: string): boolean {
	if (obj === null || obj === undefined || typeof obj !== 'object') {
		return false;
	}

	// Use Reflect.has for safer property checking
	if (!Reflect.has(obj, prop)) {
		return false;
	}

	// Use Reflect.get for safer property access
	const value = Reflect.get(obj, prop);
	return Array.isArray(value);
}

/**
 * Safely checks if an object has a property
 * @param obj - The object to check
 * @param prop - The property name to check
 * @returns True if the property exists
 */
function hasProperty(obj: unknown, prop: string): boolean {
	return obj !== null && obj !== undefined && typeof obj === 'object' && Reflect.has(obj, prop);
}

/**
 * Type guard to check if a message is a HumanMessageWithMessages
 * @param message - The message to check
 * @returns True if the message has a messages property
 */
function isHumanMessageWithMessages(message: BaseMessage): message is HumanMessageWithMessages {
	return message._getType() === 'human' && hasArrayProperty(message, 'messages');
}

/**
 * Type guard to check if a message has lc_kwargs property
 * @param message - The message to check
 * @returns True if the message has lc_kwargs property
 */
function hasLcKwargs(message: BaseMessage): message is BaseMessage & MessageWithLcKwargs {
	return hasArrayProperty(message, 'lc_kwargs');
}

/**
 * Interface for MongoDB raw message document
 */
interface MongoRawMessage {
	_id?: unknown;
	data?: {
		additional_kwargs?: unknown;
		content?: unknown;
		kwargs?: {
			content?: string;
		};
		text?: string;
	};
	[key: string]: unknown;
}

/**
 * Type guard to check if a value is a valid MongoRawMessage
 * @param value - The value to check
 * @returns True if the value is a valid MongoRawMessage
 */
function isMongoRawMessage(value: unknown): value is MongoRawMessage {
	return (
		value !== null &&
		value !== undefined &&
		typeof value === 'object' &&
		hasProperty(value, 'data') &&
		hasProperty(value, '_id')
	);
}

/**
 * Interface for MongoDB collection operations
 */
interface MongoCollection {
	find(query: Record<string, unknown>): {
		toArray(): Promise<Array<unknown>>;
	};
	updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<unknown>;
}

/**
 * Interface for MongoDB history with collection access
 */
interface MongoDbHistory {
	collection?: MongoCollection;
	sessionId?: string;
}

/**
 * Interface for chat history context with callable methods
 */
interface ChatHistoryContext {
	getMessages?(): Promise<BaseMessage[]>;
	addMessage?(message: BaseMessage): Promise<void>;
	[key: string]: unknown;
}

/**
 * Extended chat history context that may include MongoDB properties
 */
type ExtendedChatHistoryContext = ChatHistoryContext & Partial<MongoDbHistory>;

/**
 * Type guard to check if an object has MongoDB collection properties
 * @param obj - The object to check
 * @returns True if the object has collection and sessionId properties
 */
function isMongoDbHistory(obj: unknown): obj is MongoDbHistory {
	return (
		obj !== null &&
		obj !== undefined &&
		typeof obj === 'object' &&
		hasProperty(obj, 'collection') &&
		hasProperty(obj, 'sessionId')
	);
}

/**
 * Type representing various message content formats
 */
type MessageContent =
	| string
	| { text?: string; content?: string }
	| { text?: string }
	| { content?: string };

/**
 * Type guard to check if a value is a valid message content
 * @param value - The value to check
 * @returns True if the value is a valid message content
 */
function isValidMessageContent(value: unknown): value is MessageContent {
	if (typeof value === 'string') {
		return true;
	}

	if (value && typeof value === 'object') {
		return hasProperty(value, 'text') || hasProperty(value, 'content');
	}

	return false;
}

/**
 * Safely extracts text or content from a message object
 * @param msg - The message object
 * @returns The extracted text or empty string
 */
function getTextFromMessage(msg: MessageContent): string {
	if (typeof msg === 'string') {
		return msg;
	}

	const text = Reflect.get(msg, 'text');
	const content = Reflect.get(msg, 'content');

	return (
		(typeof text === 'string' ? text : '') || (typeof content === 'string' ? content : '') || ''
	);
}

/**
 * Extracts text content from various message formats
 * @param messages - Array of message objects or strings
 * @returns Concatenated text content
 */
function extractTextContent(messages: Array<unknown>): string {
	return messages
		.filter(
			(msg): msg is MessageContent =>
				msg !== null && msg !== undefined && isValidMessageContent(msg),
		)
		.map(getTextFromMessage)
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
		(item): item is LcKwargsItem => isLcKwargsItem(item) && item.role === 'user',
	);

	if (userMessages.length > 0) {
		// Get the last user message (most recent)
		const lastUserMessage = userMessages[userMessages.length - 1];
		return lastUserMessage.content || '';
	}

	// Fallback: look for any non-system content
	for (const kwarg of lc_kwargs) {
		if (isLcKwargsItem(kwarg)) {
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
		// Check if content is undefined or null but messages array exists
		if (
			(message.content === undefined || message.content === null) &&
			isHumanMessageWithMessages(message)
		) {
			const content = extractTextContent(message.messages || []);

			// Create a new HumanMessage with proper content
			const fixedMessage = new HumanMessage({
				content: content || '',
				additional_kwargs: message.additional_kwargs || {},
			});

			// Cache the result
			validatedMessageCache.set(message, fixedMessage);
			return fixedMessage;
		}

		// Try to recover from lc_kwargs (MongoDB specific)
		if (message.content === undefined || message.content === null) {
			if (hasLcKwargs(message)) {
				const recoveredContent = recoverContentFromLcKwargs(message);

				const fixedMessage = new HumanMessage({
					content: recoveredContent || '',
					additional_kwargs: message.additional_kwargs || {},
				});

				// Cache the result
				validatedMessageCache.set(message, fixedMessage);
				return fixedMessage;
			}
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
	memory.chatHistory.getMessages = async function (this: ChatHistoryContext) {
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
			this: ChatHistoryContext,
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
			memory.chatHistory.getMessages = async function (this: ExtendedChatHistoryContext) {
				try {
					// Try direct MongoDB fix if collection is available
					if (isMongoDbHistory(this)) {
						try {
							await fixMongoDbMessagesDirectly(this);
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
async function fixMongoDbMessagesDirectly(mongoHistory: MongoDbHistory): Promise<void> {
	if (!mongoHistory.collection || !mongoHistory.sessionId) {
		return;
	}

	try {
		const rawMessages = await mongoHistory.collection
			.find({ sessionId: mongoHistory.sessionId })
			.toArray();

		for (const rawMsg of rawMessages) {
			if (isMongoRawMessage(rawMsg)) {
				const updates: Record<string, unknown> = {};
				let needsUpdate = false;

				// Fix null additional_kwargs
				if (rawMsg.data?.additional_kwargs === null) {
					updates['data.additional_kwargs'] = {};
					needsUpdate = true;
				}

				// Fix null content with fallback attempts
				if (rawMsg.data?.content === null) {
					if (rawMsg.data?.kwargs?.content) {
						updates['data.content'] = rawMsg.data.kwargs.content;
					} else if (rawMsg.data?.text) {
						updates['data.content'] = rawMsg.data.text;
					} else {
						updates['data.content'] = '';
					}
					needsUpdate = true;
				}

				// Apply updates if necessary
				if (needsUpdate) {
					await mongoHistory.collection?.updateOne({ _id: rawMsg._id }, { $set: updates });
				}
			}
		}
	} catch (error) {
		throw error;
	}
}
