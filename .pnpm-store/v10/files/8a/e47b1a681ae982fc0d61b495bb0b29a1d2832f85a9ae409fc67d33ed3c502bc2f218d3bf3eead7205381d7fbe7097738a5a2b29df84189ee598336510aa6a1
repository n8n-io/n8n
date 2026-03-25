import type { UsageModel } from '../../pinecone-generated-ts-fetch/assistant_data';
/**
 * The `ListFilesOptions` interface describes the options (a single filter) that can be passed to the `listFiles` method.
 */
export interface ListFilesOptions {
    /**
     * A filter object to filter the files returned by the `listFiles` method.
     */
    filter?: object;
}
type ListFilesOptionsType = keyof ListFilesOptions;
export declare const ListFilesOptionsType: ListFilesOptionsType[];
/**
 * The `AssistantFilesList` interface describes the response for listing files uploaded to an assistant.
 */
export interface AssistantFilesList {
    files?: Array<AssistantFileModel>;
}
/**
 * Enum representing the possible statuses of an assistant file.
 *
 * - `Processing`: The file is currently being processed and is not yet available.
 * - `Available`: The file has been processed and is ready for use.
 * - `Deleting`: The file is in the process of being deleted.
 * - `ProcessingFailed`: There was an error encountered will processing.
 */
export declare const AssistantFileStatusEnum: {
    readonly Processing: "Processing";
    readonly Available: "Available";
    readonly Deleting: "Deleting";
    readonly ProcessingFailed: "ProcessingFailed";
};
export type AssistantFileStatusEnum = (typeof AssistantFileStatusEnum)[keyof typeof AssistantFileStatusEnum];
/**
 * Represents a file associated with an assistant.
 */
export interface AssistantFileModel {
    /**
     * The name of the file.
     */
    name: string;
    /**
     * The unique identifier for the file.
     */
    id: string;
    /**
     * Optional metadata associated with the file.
     */
    metadata?: object | null;
    /**
     * The date and time the file was created.
     */
    createdOn?: Date;
    /**
     * The date and time the file was last updated.
     */
    updatedOn?: Date;
    /**
     * The current status of the file.
     */
    status?: AssistantFileStatusEnum;
    /**
     * The percentage of the file that has been processed
     */
    percentDone?: number | null;
    /**
     * A signed url that gives you access to the underlying file
     */
    signedUrl?: string | null;
    /**
     * A message describing any error during file processing, provided only if an error occurs.
     */
    errorMessage?: string | null;
}
/**
 * An enum representing the models that can be used for chatting with an assistant. The default is 'gpt-4o'.
 */
export declare const ChatModelEnum: {
    readonly Gpt4o: "gpt-4o";
    readonly Claude35Sonnet: "claude-3-5-sonnet";
};
export type ChatModelEnum = (typeof ChatModelEnum)[keyof typeof ChatModelEnum];
/**
 * Describes the format of a message in an assistant chat. The `role` key can only be one of `user` or `assistant`.
 */
export interface MessageModel {
    role: string;
    content: string;
}
/**
 * The messages to send to an assistant. Can be a list of strings or a list of {@link MessageModel} objects.
 * The `role` key can only be one of `user` or `assistant`.
 */
export type MessagesModel = string[] | MessageModel[];
/**
 * Describes the request format for sending a `chat` or `chatStream` request to an assistant.
 */
export interface ChatOptions {
    /**
     * The {@link MessagesModel} to send to the Assistant. Can be a list of strings or a list of objects. If sent as a list of
     * objects, must have exactly two keys: `role` and `content`. The `role` key can only be one of `user` or `assistant`.
     */
    messages: MessagesModel;
    /**
     * The large language model to use for answer generation. Must be one of the models defined in {@link ChatModelEnum}.
     * If empty, the assistant will default to using 'gpt-4o' model.
     */
    model?: string;
    /**
     * A filter against which documents can be retrieved.
     */
    filter?: object;
    /**
     * If true, the assistant will be instructed to return a JSON response.
     */
    jsonResponse?: boolean;
    /**
     * If true, the assistant will be instructed to return highlights from the referenced documents that support its response.
     */
    includeHighlights?: boolean;
}
type ChatOptionsType = keyof ChatOptions;
export declare const ChatOptionsType: ChatOptionsType[];
/**
 * Describes the request format for sending a `chat` or `chatStream` request to an assistant.
 */
export interface ChatCompletionOptions {
    /**
     * The {@link MessagesModel} to send to the Assistant. Can be a list of strings or a list of objects. If sent as a list of
     * objects, must have exactly two keys: `role` and `content`. The `role` key can only be one of `user` or `assistant`.
     */
    messages: MessagesModel;
    /**
     * The large language model to use for answer generation. Must be one of the models defined in {@link ChatModelEnum}.
     * If empty, the assistant will default to using 'gpt-4o' model.
     */
    model?: string;
    /**
     * A filter against which documents can be retrieved.
     */
    filter?: object;
}
type ChatCompletionOptionsType = keyof ChatCompletionOptions;
export declare const ChatCompletionOptionsType: ChatCompletionOptionsType[];
/**
 * The `ContextOptions` interface describes the query and optional filter to retrieve context snippets from an Assistant.
 */
export interface ContextOptions {
    /**
     * The query to retrieve context snippets for. Either `query` or `messages` should be provided.
     */
    query?: string;
    /**
     * The list of {@link MessageModel} to use for generating the context. Either `query` or `messages` should be provided.
     */
    messages?: MessagesModel;
    /**
     * Optional filter to apply to the context snippets.
     */
    filter?: Record<string, string>;
    /**
     * The number of context snippets to return. Default is 15.
     */
    topK?: number;
}
type ContextOptionsType = keyof ContextOptions;
export declare const ContextOptionsType: ContextOptionsType[];
/**
 * The `UploadFileOptions` interface describes the file path for uploading a file to an Assistant and optional metadata.
 */
export interface UploadFileOptions {
    /**
     * The (local) path to the file to upload.
     */
    path: string;
    /**
     * Optional metadata to attach to the file.
     */
    metadata?: Record<string, string>;
}
type UploadFileOptionsType = keyof UploadFileOptions;
export declare const UploadFileOptionsType: UploadFileOptionsType[];
/**
 * A discriminated union representing a chunked response in a streamed chat.
 * This can be one of several chunk types: {@link MessageStartChunk}, {@link ContentChunk}, {@link CitationChunk}, or {@link MessageEndChunk}.
 * These represent the objects that will be streamed as a part of the assistant't response.
 */
export type StreamedChatResponse = MessageStartChunk | ContentChunk | CitationChunk | MessageEndChunk;
/**
 * Describes the common properties of all the chunk types streamed in a chat response.
 * The different chunk types form a a discriminated union type {@link StreamedChatResponse}.
 */
export interface BaseChunk {
    /**
     * The type of chunk. Either `message_start`, `content_chunk`, `citation`, or `message_end`.
     */
    type: string;
    /**
     * The unique identifier for the streaming response.
     */
    id: string;
    /**
     * The model used to generate the response.
     */
    model: string;
}
/**
 * Describes the start of a streamed message in a chat response.
 */
export interface MessageStartChunk extends BaseChunk {
    /**
     * The type of the chunk indicating the beginning of the stream.
     */
    type: 'message_start';
    /**
     * The role of the message sender. Either `user` or `assistant`.
     */
    role: string;
}
/**
 * Describes a chunk containing a piece of message content.
 */
export interface ContentChunk extends BaseChunk {
    /**
     * The type of the chunk indicating content.
     */
    type: 'content_chunk';
    /**
     * The content delta, representing a portion of the message content.
     */
    delta: {
        content: string;
    };
}
/**
 * Describes a chunk containing citation information for a message.
 */
export interface CitationChunk extends BaseChunk {
    /**
     * The type of the chunk indicating a citation.
     */
    type: 'citation';
    /**
     * The citation details, including the position and references.
     */
    citation: {
        /**
         * The position of the citation within the message content.
         */
        position: number;
        /**
         * An array of references associated with the citation.
         */
        references: Array<{
            /**
             * The {@link AssistantFileModel} associated with the citation.
             */
            file: AssistantFileModel;
            /**
             * The pages in the file that are referenced.
             */
            pages: number[];
        }>;
    };
}
/**
 * Describes the end of a streamed message in a chat response.
 */
export interface MessageEndChunk extends BaseChunk {
    /**
     * The type of the chunk indicating the end of the stream.
     */
    type: 'message_end';
    /**
     * The reason why the message generation finished.
     */
    finishReason: FinishReasonEnum;
    /**
     * The usage details associated with the streamed response.
     */
    usage: UsageModel;
}
/**
 * Describes a streamed response for chat completion request. Each response chunk will have the
 * same shape.
 */
export interface StreamedChatCompletionResponse {
    /**
     * The unique identifier for the streaming response.
     */
    id: string;
    /**
     * An array of {@link ChoiceModel} representing different response types.
     */
    choices: ChoiceModel[];
    /**
     * The model used to generate the response.
     */
    model: string;
}
/**
 * Describes a single choice in a streamed chat response.
 */
export interface ChoiceModel {
    /**
     * The reason why the response generation finished, if applicable.
     */
    finishReason?: FinishReasonEnum;
    /**
     * The index of the choice in the response.
     */
    index: number;
    /**
     * The delta object containing role and content updates for the choice.
     */
    delta: {
        /**
         * The role of the message sender.
         */
        role?: string;
        /**
         * The content of the message.
         */
        content?: string;
    };
}
/**
 * Enum representing the reasons why a response generation may finish.
 *
 * - `Stop`: The response was completed normally.
 * - `Length`: The response was truncated due to length constraints.
 * - `ContentFilter`: The response was stopped by a content filter.
 * - `FunctionCall`: The response generation was interrupted by a function call.
 */
export declare const FinishReasonEnum: {
    readonly Stop: "stop";
    readonly Length: "length";
    readonly ContentFilter: "content_filter";
    readonly FunctionCall: "function_call";
};
export type FinishReasonEnum = (typeof FinishReasonEnum)[keyof typeof FinishReasonEnum];
export {};
