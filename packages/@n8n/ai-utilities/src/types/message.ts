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
	data: string | Uint8Array;
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
	 * Stringified JSON object with the tool call arguments. Must match the
	 * parameters schema of the tool.
	 */
	input: string;
};

export type ContentToolResult = ContentMetadata & {
	type: 'tool-result';

	/**
	 * The ID of the tool call that this result is associated with.
	 */
	toolCallId: string;

	/**
	 * Result of the tool call. This is a JSON-serializable object.
	 */
	result: any;

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
	args?: string;

	/**
	 * The name of the tool that was called.
	 */
	name?: string;
};

export type ContentProvider = ContentMetadata & {
	type: 'provider';
	value: Record<string, unknown>;
};

export interface Message {
	role: MessageRole;
	content: MessageContent[];
	name?: string;

	/**
	 * Message ID from the provider
	 */
	id?: string;
}
