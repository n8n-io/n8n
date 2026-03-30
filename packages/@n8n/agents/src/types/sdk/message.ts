import type { ProviderOptions } from '@ai-sdk/provider-utils';

import type { JSONValue } from '../utils/json';

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export type MessageContent =
	| ContentText
	| ContentToolCall
	| ContentInvalidToolCall
	| ContentToolResult
	| ContentReasoning
	| ContentFile
	| ContentCitation
	| ContentProvider;

export interface ContentMetadata {
	providerMetadata?: Record<string, unknown>;
	providerOptions?: ProviderOptions;
}

export type ContentCitation = ContentMetadata & {
	type: 'citation';
	/**
	 * Source type for the citation.
	 */
	source?: string;
	/**
	 * URL of the document source
	 */
	url?: string;
	/**
	 * Source document title.
	 *
	 * For example, the page title for a web page or the title of a paper.
	 */
	title?: string;
	/**
	 * Start index of the **response text** for which the annotation applies.
	 *
	 */
	startIndex?: number;
	/**
	 * End index of the **response text** for which the annotation applies.
	 *
	 */
	endIndex?: number;
	/**
	 * Excerpt of source text being cited.
	 */
	text?: string;
};
export type ContentText = ContentMetadata & {
	type: 'text';

	/**
	 * The text content.
	 */
	text: string;
};
export type ContentReasoning = ContentMetadata & {
	type: 'reasoning';
	text: string;
};

export type ContentFile = ContentMetadata & {
	type: 'file';

	/**
	 * The IANA media type of the file, e.g. `image/png` or `audio/mp3`.
	 *
	 * @see https://www.iana.org/assignments/media-types/media-types.xhtml
	 */
	mediaType?: string;

	/**
	 * Generated file data as base64 encoded strings or binary data.
	 *
	 * The file data should be returned without any unnecessary conversion.
	 * If the API returns base64 encoded strings, the file data should be returned
	 * as base64 encoded strings. If the API returns binary data, the file data should
	 * be returned as binary data.
	 */
	data: Uint8Array | ArrayBuffer | Buffer | string;
};

export type ContentToolCall = ContentMetadata & {
	type: 'tool-call';

	/**
	 * The identifier of the tool call. It must be unique across all tool calls.
	 */
	toolCallId?: string;

	/**
	 * The name of the tool that should be called.
	 */
	toolName: string;

	/**
	 * Tool call arguments. Must match the
	 * parameters schema of the tool.
	 */
	input: JSONValue;

	providerExecuted?: boolean;
};

export type ContentToolResult = ContentMetadata & {
	type: 'tool-result';

	/**
	 * The name of the tool that was called.
	 */
	toolName: string;

	/**
	 * The ID of the tool call that this result is associated with.
	 */
	toolCallId: string;

	/**
	 * Result of the tool call. This is a JSON-serializable object.
	 */
	result: JSONValue;

	/**
	 * Optional flag if the result is an error or an error message.
	 */
	isError?: boolean;
};

export type ContentInvalidToolCall = ContentMetadata & {
	type: 'invalid-tool-call';

	/**
	 * The ID of the tool call that this result is associated with.
	 */
	toolCallId?: string;

	/**
	 * The error message of the tool call.
	 */
	error?: string;

	/**
	 * The arguments to the tool call.
	 */
	args?: JSONValue;

	/**
	 * The name of the tool that was called.
	 */
	name?: string;
};

export type ContentProvider = ContentMetadata & {
	type: 'provider';
	value: Record<string, unknown>;
};

// LLM message that can be passed to the LLM
export interface Message {
	id?: string;
	type?: 'llm';
	role: MessageRole;
	content: MessageContent[];
	name?: string;
	providerOptions?: ProviderOptions;
}

export interface AgentMessageBase {
	type: 'agent';
}

/**
 * Extensible interface for custom app messages.
 * Apps can extend via declaration merging:
 *
 * @example
 * ```typescript
 * declare module "@mariozechner/agent" {
 *   interface CustomAgentMessages {
 *     artifact: ArtifactMessage;
 *     notification: NotificationMessage;
 *   }
 * }
 * ```
 */
export interface CustomAgentMessages {
	___dummyCustomMessage: { dummy: string };
	// Empty by default - apps extend via declaration merging
}

export type CustomAgentMessage = {
	type: 'custom';
	data: CustomAgentMessages[keyof CustomAgentMessages];
};

/**
 * AgentMessage: Union of LLM messages + custom messages.
 * This abstraction allows apps to add custom message types while maintaining
 * type safety and compatibility with the base LLM messages.
 */
export type AgentMessage = Message | CustomAgentMessage;

export type AgentDbMessage = { id: string; createdAt: Date } & AgentMessage;
