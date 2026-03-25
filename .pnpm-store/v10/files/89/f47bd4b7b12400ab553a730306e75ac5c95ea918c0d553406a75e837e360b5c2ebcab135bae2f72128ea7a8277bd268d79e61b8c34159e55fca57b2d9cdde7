import { chat } from './data/chat';
import type { ChatCompletionOptions, ChatOptions, ContextOptions, ListFilesOptions, UploadFileOptions } from './data/types';
import { chatCompletion } from './data/chatCompletion';
import { chatStream } from './data/chatStream';
import { chatCompletionStream } from './data/chatCompletionStream';
import { listFiles } from './data/listFiles';
import { describeFile } from './data/describeFile';
import { deleteFile } from './data/deleteFile';
import { uploadFile } from './data/uploadFile';
import { PineconeConfiguration } from '../data';
import { context } from './data/context';
export type { CreateAssistantOptions, UpdateAssistantOptions, UpdateAssistantResponse, AssistantStatusEnum, AssistantModel, AssistantList, } from './control/types';
export type { ChatOptions, ChatCompletionOptions, ChatModelEnum, ChoiceModel, FinishReasonEnum, StreamedChatResponse, StreamedChatCompletionResponse, BaseChunk, MessageStartChunk, ContentChunk, CitationChunk, MessageEndChunk, ContextOptions, ListFilesOptions, UploadFileOptions, AssistantFileModel, AssistantFileStatusEnum, AssistantFilesList, } from './data/types';
export { ChatStream } from './chatStream';
/**
 * The `Assistant` class holds the data plane methods for interacting with
 *  [Assistants](https://docs.pinecone.io/guides/assistant/understanding-assistant).
 *
 *  This class can be instantiated through a {@link Pinecone} object, and is used to interact with a specific assistant.
 *
 *  @example
 *  ```typescript
 *  import { Pinecone } from '@pinecone-database/pinecone';
 *  const pc = new Pinecone();
 *  const assistant = pc.assistant('assistant-name');
 *  ```
 */
export declare class Assistant {
    private config;
    readonly _chat: ReturnType<typeof chat>;
    readonly _chatStream: ReturnType<typeof chatStream>;
    readonly _chatCompletion: ReturnType<typeof chatCompletion>;
    readonly _chatCompletionStream: ReturnType<typeof chatCompletionStream>;
    readonly _listFiles: ReturnType<typeof listFiles>;
    readonly _describeFile: ReturnType<typeof describeFile>;
    readonly _uploadFile: ReturnType<typeof uploadFile>;
    readonly _deleteFile: ReturnType<typeof deleteFile>;
    readonly _context: ReturnType<typeof context>;
    assistantName: string;
    /**
     * Creates an instance of the `Assistant` class.
     *
     * @param assistantName - The name of the assistant.
     * @param config - The Pinecone configuration object containing an API key and other configuration parameters
     * needed for API calls.
     *
     * @throws An error if no assistant name is provided.
     */
    constructor(assistantName: string, config: PineconeConfiguration);
    /**
     * Sends a message to the assistant and receives a response. Retries the request if the server fails.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const chatResp = await assistant.chat({messages: [{role: 'user', content: "What is the capital of France?"}]});
     * // {
     * //  id: '000000000000000023e7fb015be9d0ad',
     * //  finishReason: 'stop',
     * //  message: {
     * //    role: 'assistant',
     * //    content: 'The capital of France is Paris.'
     * //  },
     * //  model: 'gpt-4o-2024-05-13',
     * //  citations: [ { position: 209, references: [Array] } ],
     * //  usage: { promptTokens: 493, completionTokens: 38, totalTokens: 531 }
     * // }
     * ```
     *
     * @param options - A {@link ChatOptions} object containing the message and optional parameters to send to the
     * assistant.
     * @returns A promise that resolves to a {@link ChatModel} object containing the response from the assistant.
     */
    chat(options: ChatOptions): Promise<import("..").ChatModel>;
    /**
     * Sends a message to the assistant and receives a streamed response as {@link ChatStream<StreamedChatResponse>}. Retries the request if the server fails.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const chatStream = await assistant.chatStream({ messages: [{ role: 'user', content: 'What is the capital of France?'}]});
     *
     * // stream the response and log each chunk
     * for await (const chunk of newStream) {
     *   console.log(chunk);
     * }
     * // each chunk will have a variable shape depending on the type:
     * // { type:"message_start", id:"response_id", model:"gpt-4o-2024-05-13", role:"assistant"}
     * // { type:"content_chunk", id:"response_id", model:"gpt-4o-2024-05-13", delta:{ content:"The"}}
     * // { type:"content_chunk", id:"response_id", model:"gpt-4o-2024-05-13", delta:{ content:" test"}}
     * // { type:"message_end", id:"response_id", model:"gpt-4o-2024-05-13", finishReason:"stop",usage:{ promptTokens:371,completionTokens:48,totalTokens:419}}
     * ```
     *
     * @param options - A {@link ChatOptions} object containing the message and optional parameters to send to the
     * assistant.
     * @returns A promise that resolves to a {@link ChatStream<StreamedChatResponse>}.
     */
    chatStream(options: ChatOptions): Promise<import("./chatStream").ChatStream<import("./data/types").StreamedChatResponse>>;
    /**
     * Sends a message to the assistant and receives a response that is compatible with
     * [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/text-generation. Retries the request if the server fails.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const chatCompletion = await assistant.chatCompletion({ messages: [{ role: 'user', content: 'What is the capital of France?' }]});
     * console.log(chatCompletion);
     * // {
     * //  id: "response_id",
     * //  choices: [
     * //  {
     * //    finishReason: "stop",
     * //    index: 0,
     * //    message: {
     * //      role: "assistant",
     * //      content: "The data mentioned is described as \"some temporary data\"  [1].\n\nReferences:\n1. [test-chat.txt](https://storage.googleapis.com/knowledge-prod-files/your_file_resource) \n"
     * //    }
     * //   }
     * //  ],
     * //  model: "gpt-4o-2024-05-13",
     * //  usage: {
     * //    promptTokens: 371,
     * //    completionTokens: 19,
     * //    totalTokens: 390
     * //  }
     * // }
     * ```
     *
     * @param options - A {@link ChatCompletionOptions} object containing the message and optional parameters to send
     * to an assistant.
     * @returns A promise that resolves to a {@link ChatCompletionModel} object containing the response from the assistant.
     */
    chatCompletion(options: ChatCompletionOptions): Promise<import("..").ChatCompletionModel>;
    /**
     * Sends a message to the assistant and receives a streamed response as {@link ChatStream<StreamedChatCompletionResponse>}. Response is compatible with
     * [OpenAI's Chat Completion API](https://platform.openai.com/docs/guides/text-generation. Retries the request if the server fails.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const chatStream = await assistant.chatCompletionStream({messages: [{role: 'user', content: "What is the capital of France?"}]});
     *
     * // stream the response and log each chunk
     * for await (const chunk of newStream) {
     *   if (chunk.choices.length > 0 && chunk.choices[0].delta.content) {
     *     process.stdout.write(chunk.choices[0].delta.content);
     *   }
     * }
     * // { id: 'response_id', choices: [{ index: 0, delta: { role: 'assistant' }, finishReason: null }], model: 'gpt-4o-2024-05-13', usage: null }
     * // { id: 'response_id', choices: [{ index: 0, delta: { content: 'The' }}, finishReason: null }], model: 'gpt-4o-2024-05-13', usage: null }
     * // { id: 'response_id', choices: [{ index: 0, delta: { content: ' test' }}, finishReason: null }], model: 'gpt-4o-2024-05-13', usage: null }
     * // { id: 'response_id', choices: [], model: 'gpt-4o-2024-05-13', usage: { promptTokens: 371, completionTokens: 48, totalTokens: 419 }}
     * ```
     *
     * @param options - A {@link ChatCompletionOptions} object containing the message and optional parameters to send
     * to an assistant.
     * @returns A promise that resolves to a {@link ChatStream<StreamedChatCompletionResponse>}.
     */
    chatCompletionStream(options: ChatCompletionOptions): Promise<import("./chatStream").ChatStream<import("./data/types").StreamedChatCompletionResponse>>;
    /**
     * Lists files (with optional filter) uploaded to an assistant.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const files = await assistant.listFiles({filter: {metadata: {key: 'value'}}});
     * console.log(files);
     * // {
     * //  files: [
     * //    {
     * //      name: 'temp-file.txt',
     * //      id: '1a56ddd0-c6d8-4295-80c0-9bfd6f5cb87b',
     * //      metadata: undefined,
     * //      createdOn: 2025-01-06T19:14:21.969Z,
     * //      updatedOn: 2025-01-06T19:14:36.925Z,
     * //      status: 'Available',
     * //      percentDone: 1,
     * //      signedUrl: undefined,
     * //      errorMessage: undefined
     * //    }
     * //  ]
     * // }
     * ```
     *
     * @param options - A {@link ListFilesOptions} object containing optional parameters to filter the list of files.
     * @returns A promise that resolves to a {@link AssistantFilesList} object containing a list of files.
     */
    listFiles(options?: ListFilesOptions): Promise<import("./data/types").AssistantFilesList>;
    /**
     * Describes a file uploaded to an assistant.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const files = await assistant.listFiles();
     * let fileId: string;
     * if (files.files) {
     *     fileId = files.files[0].id;
     * } else {
     *     fileId = '';
     * }
     * const resp = await assistant.describeFile({fileId: fileId})
     * console.log(resp);
     * // {
     * //  name: 'test-file.txt',
     * //  id: '1a56ddd0-c6d8-4295-80c0-9bfd6f5cb87b',
     * //  metadata: undefined,
     * //  createdOn: 2025-01-06T19:14:21.969Z,
     * //  updatedOn: 2025-01-06T19:14:36.925Z,
     * //  status: 'Available',
     * //  percentDone: 1,
     * //  signedUrl: undefined,
     * //   errorMessage: undefined
     * // }
     * ```
     *
     * @param options - A {@link DescribeFile} object containing the file ID to describe.
     * @returns A promise that resolves to a {@link AssistantFileModel} object containing the file details.
     */
    describeFile(fileId: string): Promise<import("./data/types").AssistantFileModel>;
    /**
     * Uploads a file to an assistant.
     *
     * Note: This method does *not* use the generated code from the OpenAPI spec.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * await assistant.uploadFile({path: "test-file.txt", metadata: {"test-key": "test-value"}})
     * // {
     * //  name: 'test-file.txt',
     * //  id: '921ad74c-2421-413a-8c86-fca81ceabc5c',
     * //  metadata: { 'test-key': 'test-value' },
     * //  createdOn: Invalid Date,  // Note: these dates resolve in seconds
     * //  updatedOn: Invalid Date,
     * //  status: 'Processing',
     * //  percentDone: null,
     * //  signedUrl: null,
     * //  errorMessage: null
     * // }
     * ```
     *
     * @param options - A {@link UploadFile} object containing the file path and optional metadata.
     * @returns A promise that resolves to a {@link AssistantFileModel} object containing the file details.
     */
    uploadFile(options: UploadFileOptions): Promise<import("./data/types").AssistantFileModel>;
    /**
     * Deletes a file uploaded to an assistant by ID.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const files = await assistant.listFiles();
     * let fileId: string;
     * if (files.files) {
     *    fileId = files.files[0].id;
     *    await assistant.deleteFile({fileId: fileId});
     *  }
     * ```
     *
     * @param options - A {@link DeleteFile} object containing the file ID to delete.
     * @returns A promise that resolves to void on success.
     */
    deleteFile(fileId: string): Promise<void>;
    /**
     * Retrieves [the context snippets](https://docs.pinecone.io/guides/assistant/understanding-context-snippets) used
     * by an assistant during the retrieval process.
     *
     * @example
     * ```typescript
     * import { Pinecone } from '@pinecone-database/pinecone';
     * const pc = new Pinecone();
     * const assistantName = 'test1';
     * const assistant = pc.assistant(assistantName);
     * const response = await assistant.context({query: "What is the capital of France?"});
     * console.log(response);
     * // {
     * //  snippets: [
     * //    {
     * //      type: 'text',
     * //      content: 'The capital of France is Paris.',
     * //      score: 0.9978925,
     * //      reference: [Object]
     * //    },
     * //  ],
     * //  usage: { promptTokens: 527, completionTokens: 0, totalTokens: 527 }
     * // }
     * ```
     *
     * @param options
     * @returns A promise that resolves to a {@link Context} object containing the context snippets.
     */
    context(options: ContextOptions): Promise<import("..").ContextModel>;
}
