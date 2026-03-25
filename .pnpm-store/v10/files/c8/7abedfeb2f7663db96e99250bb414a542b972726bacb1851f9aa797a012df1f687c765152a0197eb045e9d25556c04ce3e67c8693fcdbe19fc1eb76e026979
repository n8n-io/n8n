/**
 * Describes an array, an ordered list of values.
 *
 * @public
 */
export declare interface ArraySchema extends BaseSchema {
    type: typeof SchemaType.ARRAY;
    /** A schema describing the entries in the array. */
    items: Schema;
    /** The minimum number of items in the array. */
    minItems?: number;
    /** The maximum number of items in the array. */
    maxItems?: number;
}

/**
 * Base parameters for a number of methods.
 * @public
 */
export declare interface BaseParams {
    safetySettings?: SafetySetting[];
    generationConfig?: GenerationConfig;
}

/**
 * Fields common to all Schema types.
 *
 * @internal
 */
export declare interface BaseSchema {
    /** Optional. Description of the value. */
    description?: string;
    /** If true, the value can be null. */
    nullable?: boolean;
}

/**
 * Params for calling  {@link GenerativeModel.batchEmbedContents}
 * @public
 */
export declare interface BatchEmbedContentsRequest {
    requests: EmbedContentRequest[];
}

/**
 * Response from calling {@link GenerativeModel.batchEmbedContents}.
 * @public
 */
export declare interface BatchEmbedContentsResponse {
    embeddings: ContentEmbedding[];
}

/**
 * Reason that a prompt was blocked.
 * @public
 */
export declare enum BlockReason {
    BLOCKED_REASON_UNSPECIFIED = "BLOCKED_REASON_UNSPECIFIED",
    SAFETY = "SAFETY",
    OTHER = "OTHER"
}

/**
 * Describes a boolean, either 'true' or 'false'.
 *
 * @public
 */
export declare interface BooleanSchema extends BaseSchema {
    type: typeof SchemaType.BOOLEAN;
}

/**
 * Describes `CachedContent` interface for sending to the server (if creating)
 * or received from the server (using getters or list methods).
 * @public
 */
export declare interface CachedContent extends CachedContentBase {
    name?: string;
    /**
     * protobuf.Duration format (ex. "3.0001s").
     */
    ttl?: string;
    /**
     * `CachedContent` creation time in ISO string format.
     */
    createTime?: string;
    /**
     * `CachedContent` update time in ISO string format.
     */
    updateTime?: string;
}

/**
 * @public
 */
export declare interface CachedContentBase {
    model?: string;
    contents: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * Expiration time in ISO string format. Specify either this or `ttlSeconds`
     * when creating a `CachedContent`.
     */
    expireTime?: string;
    displayName?: string;
}

/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far.
 *
 * @public
 */
export declare class ChatSession {
    model: string;
    params?: StartChatParams;
    private _requestOptions;
    private _apiKey;
    private _history;
    private _sendPromise;
    constructor(apiKey: string, model: string, params?: StartChatParams, _requestOptions?: RequestOptions);
    /**
     * Gets the chat history so far. Blocked prompts are not added to history.
     * Blocked candidates are not added to history, nor are the prompts that
     * generated them.
     */
    getHistory(): Promise<Content[]>;
    /**
     * Sends a chat message and receives a non-streaming
     * {@link GenerateContentResult}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    sendMessage(request: string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentResult>;
    /**
     * Sends a chat message and receives the response as a
     * {@link GenerateContentStreamResult} containing an iterable stream
     * and a response promise.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    sendMessageStream(request: string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentStreamResult>;
}

/**
 * Citation metadata that may be found on a {@link GenerateContentCandidate}.
 * @public
 */
export declare interface CitationMetadata {
    citationSources: CitationSource[];
}

/**
 * A single citation source.
 * @public
 */
export declare interface CitationSource {
    startIndex?: number;
    endIndex?: number;
    uri?: string;
    license?: string;
}

/**
 * Result of executing the `ExecutableCode`.
 * Only generated when using code execution, and always follows a `Part`
 * containing the `ExecutableCode`.
 * @public
 */
export declare interface CodeExecutionResult {
    /**
     * Outcome of the code execution.
     */
    outcome: Outcome;
    /**
     * Contains stdout when code execution is successful, stderr or other
     * description otherwise.
     */
    output: string;
}

/**
 * Content part containing the result of executed code.
 * @public
 */
export declare interface CodeExecutionResultPart {
    text?: never;
    inlineData?: never;
    functionCall?: never;
    functionResponse?: never;
    fileData?: never;
    executableCode?: never;
    codeExecutionResult: CodeExecutionResult;
}

/**
 * Enables the model to execute code as part of generation.
 * @public
 */
export declare interface CodeExecutionTool {
    /**
     * Provide an empty object to enable code execution. This field may have
     * subfields added in the future.
     */
    codeExecution: {};
}

/**
 * Content type for both prompts and response candidates.
 * @public
 */
export declare interface Content {
    role: string;
    parts: Part[];
}

/**
 * A single content embedding.
 * @public
 */
export declare interface ContentEmbedding {
    values: number[];
}

/**
 * Params for calling {@link GenerativeModel.countTokens}.
 *
 * The request must contain either a {@link Content} array or a
 * {@link GenerateContentRequest}, but not both. If both are provided
 * then a {@link GoogleGenerativeAIRequestInputError} is thrown.
 *
 * @public
 */
export declare interface CountTokensRequest {
    generateContentRequest?: GenerateContentRequest;
    contents?: Content[];
}

/**
 * Params for calling {@link GenerativeModel.countTokens}
 * @internal
 */
export declare interface _CountTokensRequestInternal {
    generateContentRequest?: _GenerateContentRequestInternal;
    contents?: Content[];
}

/**
 * Response from calling {@link GenerativeModel.countTokens}.
 * @public
 */
export declare interface CountTokensResponse {
    totalTokens: number;
}

/**
 * Specifies the dynamic retrieval configuration for the given source.
 * @public
 */
export declare interface DynamicRetrievalConfig {
    /**
     * The mode of the predictor to be used in dynamic retrieval.
     */
    mode?: DynamicRetrievalMode;
    /**
     * The threshold to be used in dynamic retrieval. If not set, a system default
     * value is used.
     */
    dynamicThreshold?: number;
}

/**
 * The mode of the predictor to be used in dynamic retrieval.
 * @public
 */
export declare enum DynamicRetrievalMode {
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    MODE_DYNAMIC = "MODE_DYNAMIC"
}

/**
 * Params for calling {@link GenerativeModel.embedContent}
 * @public
 */
export declare interface EmbedContentRequest {
    content: Content;
    taskType?: TaskType;
    title?: string;
}

/**
 * Response from calling {@link GenerativeModel.embedContent}.
 * @public
 */
export declare interface EmbedContentResponse {
    embedding: ContentEmbedding;
}

/**
 * Response object wrapped with helper methods.
 *
 * @public
 */
export declare interface EnhancedGenerateContentResponse extends GenerateContentResponse {
    /**
     * Returns the text string assembled from all `Part`s of the first candidate
     * of the response, if available.
     * Throws if the prompt or candidate was blocked.
     */
    text: () => string;
    /**
     * Deprecated: use `functionCalls()` instead.
     * @deprecated - use `functionCalls()` instead
     */
    functionCall: () => FunctionCall | undefined;
    /**
     * Returns function calls found in any `Part`s of the first candidate
     * of the response, if available.
     * Throws if the prompt or candidate was blocked.
     */
    functionCalls: () => FunctionCall[] | undefined;
}

/**
 * Describes a string enum
 *
 * @public
 */
export declare interface EnumStringSchema extends BaseSchema {
    type: typeof SchemaType.STRING;
    format: "enum";
    /** Possible values for this enum */
    enum: string[];
}

/**
 * Details object that may be included in an error response.
 * @public
 */
export declare interface ErrorDetails {
    "@type"?: string;
    reason?: string;
    domain?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Code generated by the model that is meant to be executed, where the result
 * is returned to the model.
 * Only generated when using the code execution tool, in which the code will
 * be automatically executed, and a corresponding `CodeExecutionResult` will
 * also be generated.
 *
 * @public
 */
export declare interface ExecutableCode {
    /**
     * Programming language of the `code`.
     */
    language: ExecutableCodeLanguage;
    /**
     * The code to be executed.
     */
    code: string;
}

/**
 * @public
 */
export declare enum ExecutableCodeLanguage {
    LANGUAGE_UNSPECIFIED = "language_unspecified",
    PYTHON = "python"
}

/**
 * Content part containing executable code generated by the model.
 * @public
 */
export declare interface ExecutableCodePart {
    text?: never;
    inlineData?: never;
    functionCall?: never;
    functionResponse?: never;
    fileData?: never;
    executableCode: ExecutableCode;
    codeExecutionResult?: never;
}

/**
 * Data pointing to a file uploaded with the Files API.
 * @public
 */
export declare interface FileData {
    mimeType: string;
    fileUri: string;
}

/**
 * Content part interface if the part represents FileData.
 * @public
 */
export declare interface FileDataPart {
    text?: never;
    inlineData?: never;
    functionCall?: never;
    functionResponse?: never;
    fileData: FileData;
    executableCode?: never;
    codeExecutionResult?: never;
}

/**
 * Reason that a candidate finished.
 * @public
 */
export declare enum FinishReason {
    FINISH_REASON_UNSPECIFIED = "FINISH_REASON_UNSPECIFIED",
    STOP = "STOP",
    MAX_TOKENS = "MAX_TOKENS",
    SAFETY = "SAFETY",
    RECITATION = "RECITATION",
    LANGUAGE = "LANGUAGE",
    BLOCKLIST = "BLOCKLIST",
    PROHIBITED_CONTENT = "PROHIBITED_CONTENT",
    SPII = "SPII",
    MALFORMED_FUNCTION_CALL = "MALFORMED_FUNCTION_CALL",
    OTHER = "OTHER"
}

/**
 * A predicted [FunctionCall] returned from the model
 * that contains a string representing the [FunctionDeclaration.name]
 * and a structured JSON object containing the parameters and their values.
 * @public
 */
export declare interface FunctionCall {
    name: string;
    args: object;
}

/**
 * @public
 */
export declare interface FunctionCallingConfig {
    mode?: FunctionCallingMode;
    allowedFunctionNames?: string[];
}

/**
 * @public
 */
export declare enum FunctionCallingMode {
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    AUTO = "AUTO",
    ANY = "ANY",
    NONE = "NONE"
}

/**
 * Content part interface if the part represents a FunctionCall.
 * @public
 */
export declare interface FunctionCallPart {
    text?: never;
    inlineData?: never;
    functionCall: FunctionCall;
    functionResponse?: never;
    fileData?: never;
    executableCode?: never;
    codeExecutionResult?: never;
}

/**
 * Structured representation of a function declaration as defined by the
 * [OpenAPI 3.0 specification](https://spec.openapis.org/oas/v3.0.3). Included
 * in this declaration are the function name and parameters. This
 * FunctionDeclaration is a representation of a block of code that can be used
 * as a Tool by the model and executed by the client.
 * @public
 */
export declare interface FunctionDeclaration {
    /**
     * The name of the function to call. Must start with a letter or an
     * underscore. Must be a-z, A-Z, 0-9, or contain underscores and dashes, with
     * a max length of 64.
     */
    name: string;
    /**
     * Optional. Description and purpose of the function. Model uses it to decide
     * how and whether to call the function.
     */
    description?: string;
    /**
     * Optional. Describes the parameters to this function in JSON Schema Object
     * format. Reflects the Open API 3.03 Parameter Object. string Key: the name
     * of the parameter. Parameter names are case sensitive. Schema Value: the
     * Schema defining the type used for the parameter. For function with no
     * parameters, this can be left unset.
     *
     * @example with 1 required and 1 optional parameter: type: OBJECT properties:
     * ```
     * param1:
     *
     *   type: STRING
     * param2:
     *
     *  type: INTEGER
     * required:
     *
     *   - param1
     * ```
     */
    parameters?: FunctionDeclarationSchema;
}

/**
 * Schema for parameters passed to {@link FunctionDeclaration.parameters}.
 * @public
 */
export declare interface FunctionDeclarationSchema {
    /** The type of the parameter. */
    type: SchemaType;
    /** The format of the parameter. */
    properties: {
        [k: string]: FunctionDeclarationSchemaProperty;
    };
    /** Optional. Description of the parameter. */
    description?: string;
    /** Optional. Array of required parameters. */
    required?: string[];
}

/**
 * Schema for top-level function declaration
 * @public
 */
export declare type FunctionDeclarationSchemaProperty = Schema;

/**
 * A FunctionDeclarationsTool is a piece of code that enables the system to
 * interact with external systems to perform an action, or set of actions,
 * outside of knowledge and scope of the model.
 * @public
 */
export declare interface FunctionDeclarationsTool {
    /**
     * Optional. One or more function declarations
     * to be passed to the model along with the current user query. Model may
     * decide to call a subset of these functions by populating
     * [FunctionCall][content.part.functionCall] in the response. User should
     * provide a [FunctionResponse][content.part.functionResponse] for each
     * function call in the next turn. Based on the function responses, Model will
     * generate the final response back to the user. Maximum 64 function
     * declarations can be provided.
     */
    functionDeclarations?: FunctionDeclaration[];
}

/**
 * The result output from a [FunctionCall] that contains a string
 * representing the [FunctionDeclaration.name]
 * and a structured JSON object containing any output
 * from the function is used as context to the model.
 * This should contain the result of a [FunctionCall]
 * made based on model prediction.
 * @public
 */
export declare interface FunctionResponse {
    name: string;
    response: object;
}

/**
 * Content part interface if the part represents FunctionResponse.
 * @public
 */
export declare interface FunctionResponsePart {
    text?: never;
    inlineData?: never;
    functionCall?: never;
    functionResponse: FunctionResponse;
    fileData?: never;
    executableCode?: never;
    codeExecutionResult?: never;
}

/**
 * A candidate returned as part of a {@link GenerateContentResponse}.
 * @public
 */
export declare interface GenerateContentCandidate {
    index: number;
    content: Content;
    finishReason?: FinishReason;
    finishMessage?: string;
    safetyRatings?: SafetyRating[];
    citationMetadata?: CitationMetadata;
    /** Average log probability score of the candidate. */
    avgLogprobs?: number;
    /** Log-likelihood scores for the response tokens and top tokens. */
    logprobsResult?: LogprobsResult;
    /** Search grounding metadata. */
    groundingMetadata?: GroundingMetadata;
}

/**
 * Request sent to `generateContent` endpoint.
 * @public
 */
export declare interface GenerateContentRequest extends BaseParams {
    contents: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * This is the name of a `CachedContent` and not the cache object itself.
     */
    cachedContent?: string;
}

/**
 * Request sent to `generateContent` endpoint.
 * @internal
 */
export declare interface _GenerateContentRequestInternal extends GenerateContentRequest {
    model?: string;
}

/**
 * Individual response from {@link GenerativeModel.generateContent} and
 * {@link GenerativeModel.generateContentStream}.
 * `generateContentStream()` will return one in each chunk until
 * the stream is done.
 * @public
 */
export declare interface GenerateContentResponse {
    /** Candidate responses from the model. */
    candidates?: GenerateContentCandidate[];
    /** The prompt's feedback related to the content filters. */
    promptFeedback?: PromptFeedback;
    /** Metadata on the generation request's token usage. */
    usageMetadata?: UsageMetadata;
}

/**
 * Result object returned from generateContent() call.
 *
 * @public
 */
export declare interface GenerateContentResult {
    response: EnhancedGenerateContentResponse;
}

/**
 * Result object returned from generateContentStream() call.
 * Iterate over `stream` to get chunks as they come in and/or
 * use the `response` promise to get the aggregated response when
 * the stream is done.
 *
 * @public
 */
export declare interface GenerateContentStreamResult {
    stream: AsyncGenerator<EnhancedGenerateContentResponse>;
    response: Promise<EnhancedGenerateContentResponse>;
}

/**
 * Config options for content-related requests
 * @public
 */
export declare interface GenerationConfig {
    candidateCount?: number;
    stopSequences?: string[];
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    topK?: number;
    /**
     * Output response mimetype of the generated candidate text.
     * Supported mimetype:
     *   `text/plain`: (default) Text output.
     *   `application/json`: JSON response in the candidates.
     */
    responseMimeType?: string;
    /**
     * Output response schema of the generated candidate text.
     * Note: This only applies when the specified `responseMIMEType` supports a schema; currently
     * this is limited to `application/json`.
     */
    responseSchema?: ResponseSchema;
    /**
     * Presence penalty applied to the next token's logprobs if the token has
     * already been seen in the response.
     */
    presencePenalty?: number;
    /**
     * Frequency penalty applied to the next token's logprobs, multiplied by the
     * number of times each token has been seen in the respponse so far.
     */
    frequencyPenalty?: number;
    /**
     * If True, export the logprobs results in response.
     */
    responseLogprobs?: boolean;
    /**
     * Valid if responseLogProbs is set to True. This will set the number of top
     * logprobs to return at each decoding step in the logprobsResult.
     */
    logprobs?: number;
}

/**
 * Interface for sending an image.
 * @public
 */
export declare interface GenerativeContentBlob {
    mimeType: string;
    /**
     * Image as a base64 string.
     */
    data: string;
}

/**
 * Class for generative model APIs.
 * @public
 */
export declare class GenerativeModel {
    apiKey: string;
    private _requestOptions;
    model: string;
    generationConfig: GenerationConfig;
    safetySettings: SafetySetting[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: Content;
    cachedContent: CachedContent;
    constructor(apiKey: string, modelParams: ModelParams, _requestOptions?: RequestOptions);
    /**
     * Makes a single non-streaming call to the model
     * and returns an object containing a single {@link GenerateContentResponse}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    generateContent(request: GenerateContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentResult>;
    /**
     * Makes a single streaming call to the model and returns an object
     * containing an iterable stream that iterates over all chunks in the
     * streaming response as well as a promise that returns the final
     * aggregated response.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    generateContentStream(request: GenerateContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<GenerateContentStreamResult>;
    /**
     * Gets a new {@link ChatSession} instance which can be used for
     * multi-turn chats.
     */
    startChat(startChatParams?: StartChatParams): ChatSession;
    /**
     * Counts the tokens in the provided request.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    countTokens(request: CountTokensRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<CountTokensResponse>;
    /**
     * Embeds the provided content.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    embedContent(request: EmbedContentRequest | string | Array<string | Part>, requestOptions?: SingleRequestOptions): Promise<EmbedContentResponse>;
    /**
     * Embeds an array of {@link EmbedContentRequest}s.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */
    batchEmbedContents(batchEmbedContentRequest: BatchEmbedContentsRequest, requestOptions?: SingleRequestOptions): Promise<BatchEmbedContentsResponse>;
}

/**
 * Top-level class for this SDK
 * @public
 */
export declare class GoogleGenerativeAI {
    apiKey: string;
    constructor(apiKey: string);
    /**
     * Gets a {@link GenerativeModel} instance for the provided model name.
     */
    getGenerativeModel(modelParams: ModelParams, requestOptions?: RequestOptions): GenerativeModel;
    /**
     * Creates a {@link GenerativeModel} instance from provided content cache.
     */
    getGenerativeModelFromCachedContent(cachedContent: CachedContent, modelParams?: Partial<ModelParams>, requestOptions?: RequestOptions): GenerativeModel;
}

/**
 * Error thrown when a request is aborted, either due to a timeout or
 * intentional cancellation by the user.
 * @public
 */
export declare class GoogleGenerativeAIAbortError extends GoogleGenerativeAIError {
}

/**
 * Basic error type for this SDK.
 * @public
 */
export declare class GoogleGenerativeAIError extends Error {
    constructor(message: string);
}

/**
 * Error class covering HTTP errors when calling the server. Includes HTTP
 * status, statusText, and optional details, if provided in the server response.
 * @public
 */
export declare class GoogleGenerativeAIFetchError extends GoogleGenerativeAIError {
    status?: number;
    statusText?: string;
    errorDetails?: ErrorDetails[];
    constructor(message: string, status?: number, statusText?: string, errorDetails?: ErrorDetails[]);
}

/**
 * Errors in the contents of a request originating from user input.
 * @public
 */
export declare class GoogleGenerativeAIRequestInputError extends GoogleGenerativeAIError {
}

/**
 * Errors in the contents of a response from the model. This includes parsing
 * errors, or responses including a safety block reason.
 * @public
 */
export declare class GoogleGenerativeAIResponseError<T> extends GoogleGenerativeAIError {
    response?: T;
    constructor(message: string, response?: T);
}

/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
export declare interface GoogleSearchRetrieval {
    /**
     * Specifies the dynamic retrieval configuration for the given source.
     */
    dynamicRetrievalConfig?: DynamicRetrievalConfig;
}

/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
export declare interface GoogleSearchRetrievalTool {
    /**
     * Google search retrieval tool config.
     */
    googleSearchRetrieval?: GoogleSearchRetrieval;
}

/**
 * Grounding chunk.
 * @public
 */
export declare interface GroundingChunk {
    /**
     *  Chunk from the web.
     */
    web?: GroundingChunkWeb;
}

/**
 * Chunk from the web.
 * @public
 */
export declare interface GroundingChunkWeb {
    /**
     * URI reference of the chunk.
     */
    uri?: string;
    /**
     * Title of the chunk.
     */
    title?: string;
}

/**
 * Metadata returned to client when grounding is enabled.
 * @public
 */
export declare interface GroundingMetadata {
    /**
     * Google search entry for the following-up web searches.
     */
    searchEntryPoint?: SearchEntryPoint;
    /**
     * List of supporting references retrieved from specified grounding source.
     */
    groundingChunks?: GroundingChunk[];
    /**
     * List of grounding support.
     */
    groundingSupports?: GroundingSupport[];
    /**
     * Metadata related to retrieval in the grounding flow.
     */
    retrievalMetadata?: RetrievalMetadata;
    /**
     * * Web search queries for the following-up web search.
     */
    webSearchQueries: string[];
}

/**
 * Grounding support.
 * @public
 */
export declare interface GroundingSupport {
    /**
     * URI reference of the chunk.
     */
    segment?: string;
    /**
     * A list of indices (into 'grounding_chunk') specifying the citations
     * associated with the claim. For instance [1,3,4] means that
     * grounding_chunk[1], grounding_chunk[3], grounding_chunk[4] are the
     * retrieved content attributed to the claim.
     */
    groundingChunckIndices?: number[];
    /**
     * Confidence score of the support references. Ranges from 0 to 1. 1 is the
     * most confident. This list must have the same size as the
     * grounding_chunk_indices.
     */
    confidenceScores?: number[];
}

/**
 * Segment of the content.
 * @public
 */
export declare interface GroundingSupportSegment {
    /**
     * The index of a Part object within its parent Content object.
     */
    partIndex?: number;
    /**
     * Start index in the given Part, measured in bytes. Offset from the start of
     * the Part, inclusive, starting at zero.
     */
    startIndex?: number;
    /**
     * End index in the given Part, measured in bytes. Offset from the start of
     * the Part, exclusive, starting at zero.
     */
    endIndex?: number;
    /**
     * The text corresponding to the segment from the response.
     */
    text?: string;
}

/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */
export declare enum HarmBlockThreshold {
    /** Threshold is unspecified. */
    HARM_BLOCK_THRESHOLD_UNSPECIFIED = "HARM_BLOCK_THRESHOLD_UNSPECIFIED",
    /** Content with NEGLIGIBLE will be allowed. */
    BLOCK_LOW_AND_ABOVE = "BLOCK_LOW_AND_ABOVE",
    /** Content with NEGLIGIBLE and LOW will be allowed. */
    BLOCK_MEDIUM_AND_ABOVE = "BLOCK_MEDIUM_AND_ABOVE",
    /** Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed. */
    BLOCK_ONLY_HIGH = "BLOCK_ONLY_HIGH",
    /** All content will be allowed. */
    BLOCK_NONE = "BLOCK_NONE"
}

/**
 * Harm categories that would cause prompts or candidates to be blocked.
 * @public
 */
export declare enum HarmCategory {
    HARM_CATEGORY_UNSPECIFIED = "HARM_CATEGORY_UNSPECIFIED",
    HARM_CATEGORY_HATE_SPEECH = "HARM_CATEGORY_HATE_SPEECH",
    HARM_CATEGORY_SEXUALLY_EXPLICIT = "HARM_CATEGORY_SEXUALLY_EXPLICIT",
    HARM_CATEGORY_HARASSMENT = "HARM_CATEGORY_HARASSMENT",
    HARM_CATEGORY_DANGEROUS_CONTENT = "HARM_CATEGORY_DANGEROUS_CONTENT",
    HARM_CATEGORY_CIVIC_INTEGRITY = "HARM_CATEGORY_CIVIC_INTEGRITY"
}

/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */
export declare enum HarmProbability {
    /** Probability is unspecified. */
    HARM_PROBABILITY_UNSPECIFIED = "HARM_PROBABILITY_UNSPECIFIED",
    /** Content has a negligible chance of being unsafe. */
    NEGLIGIBLE = "NEGLIGIBLE",
    /** Content has a low chance of being unsafe. */
    LOW = "LOW",
    /** Content has a medium chance of being unsafe. */
    MEDIUM = "MEDIUM",
    /** Content has a high chance of being unsafe. */
    HIGH = "HIGH"
}

/**
 * Content part interface if the part represents an image.
 * @public
 */
export declare interface InlineDataPart {
    text?: never;
    inlineData: GenerativeContentBlob;
    functionCall?: never;
    functionResponse?: never;
    fileData?: never;
    executableCode?: never;
    codeExecutionResult?: never;
}

/**
 * Describes a JSON-encodable integer.
 *
 * @public
 */
export declare interface IntegerSchema extends BaseSchema {
    type: typeof SchemaType.INTEGER;
    /** Optional. The format of the number. */
    format?: "int32" | "int64";
}

/**
 * Candidate for the logprobs token and score.
 * @public
 */
export declare interface LogprobsCandidate {
    /** The candidate's token string value. */
    token: string;
    /** The candidate's token id value. */
    tokenID: number;
    /** The candidate's log probability. */
    logProbability: number;
}

/**
 * Logprobs Result
 * @public
 */
export declare interface LogprobsResult {
    /** Length = total number of decoding steps. */
    topCandidates: TopCandidates[];
    /**
     * Length = total number of decoding steps.
     * The chosen candidates may or may not be in topCandidates.
     */
    chosenCandidates: LogprobsCandidate[];
}

/**
 * Params passed to {@link GoogleGenerativeAI.getGenerativeModel}.
 * @public
 */
export declare interface ModelParams extends BaseParams {
    model: string;
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    cachedContent?: CachedContent;
}

/**
 * Describes a JSON-encodable floating point number.
 *
 * @public
 */
export declare interface NumberSchema extends BaseSchema {
    type: typeof SchemaType.NUMBER;
    /** Optional. The format of the number. */
    format?: "float" | "double";
}

/**
 * Describes a JSON object, a mapping of specific keys to values.
 *
 * @public
 */
export declare interface ObjectSchema extends BaseSchema {
    type: typeof SchemaType.OBJECT;
    /** Describes the properties of the JSON object. Must not be empty. */
    properties: {
        [k: string]: Schema;
    };
    /**
     * A list of keys declared in the properties object.
     * Required properties will always be present in the generated object.
     */
    required?: string[];
}

/**
 * Possible outcomes of code execution.
 * @public
 */
export declare enum Outcome {
    /**
     * Unspecified status. This value should not be used.
     */
    OUTCOME_UNSPECIFIED = "outcome_unspecified",
    /**
     * Code execution completed successfully.
     */
    OUTCOME_OK = "outcome_ok",
    /**
     * Code execution finished but with a failure. `stderr` should contain the
     * reason.
     */
    OUTCOME_FAILED = "outcome_failed",
    /**
     * Code execution ran for too long, and was cancelled. There may or may not
     * be a partial output present.
     */
    OUTCOME_DEADLINE_EXCEEDED = "outcome_deadline_exceeded"
}

/**
 * Content part - includes text or image part types.
 * @public
 */
export declare type Part = TextPart | InlineDataPart | FunctionCallPart | FunctionResponsePart | FileDataPart | ExecutableCodePart | CodeExecutionResultPart;

/**
 * Possible roles.
 * @public
 */
export declare const POSSIBLE_ROLES: readonly ["user", "model", "function", "system"];

/**
 * If the prompt was blocked, this will be populated with `blockReason` and
 * the relevant `safetyRatings`.
 * @public
 */
export declare interface PromptFeedback {
    blockReason: BlockReason;
    safetyRatings: SafetyRating[];
    blockReasonMessage?: string;
}

/**
 * Params passed to getGenerativeModel() or GoogleAIFileManager().
 * @public
 */
export declare interface RequestOptions {
    /**
     * Request timeout in milliseconds.
     */
    timeout?: number;
    /**
     * Version of API endpoint to call (e.g. "v1" or "v1beta"). If not specified,
     * defaults to latest stable version.
     */
    apiVersion?: string;
    /**
     * Additional attribution information to include in the x-goog-api-client header.
     * Used by wrapper SDKs.
     */
    apiClient?: string;
    /**
     * Base endpoint url. Defaults to "https://generativelanguage.googleapis.com"
     */
    baseUrl?: string;
    /**
     * Custom HTTP request headers.
     */
    customHeaders?: Headers | Record<string, string>;
}

/**
 * Schema passed to `GenerationConfig.responseSchema`
 * @public
 */
export declare type ResponseSchema = Schema;

/**
 * Metadata related to retrieval in the grounding flow.
 * @public
 */
export declare interface RetrievalMetadata {
    /**
     * Score indicating how likely information from google search could help
     * answer the prompt. The score is in the range [0, 1], where 0 is the least
     * likely and 1 is the most likely. This score is only populated when google
     * search grounding and dynamic retrieval is enabled. It will becompared to
     * the threshold to determine whether to trigger google search.
     */
    googleSearchDynamicRetrievalScore?: number;
}

/**
 * A safety rating associated with a {@link GenerateContentCandidate}
 * @public
 */
export declare interface SafetyRating {
    category: HarmCategory;
    probability: HarmProbability;
}

/**
 * Safety setting that can be sent as part of request parameters.
 * @public
 */
export declare interface SafetySetting {
    category: HarmCategory;
    threshold: HarmBlockThreshold;
}

/**
 * Schema is used to define the format of input/output data.
 * Represents a select subset of an OpenAPI 3.0 schema object.
 * More fields may be added in the future as needed.
 * @public
 */
export declare type Schema = StringSchema | NumberSchema | IntegerSchema | BooleanSchema | ArraySchema | ObjectSchema;

/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */
export declare enum SchemaType {
    /** String type. */
    STRING = "string",
    /** Number type. */
    NUMBER = "number",
    /** Integer type. */
    INTEGER = "integer",
    /** Boolean type. */
    BOOLEAN = "boolean",
    /** Array type. */
    ARRAY = "array",
    /** Object type. */
    OBJECT = "object"
}

/**
 * Google search entry point.
 * @public
 */
export declare interface SearchEntryPoint {
    /**
     * Web content snippet that can be embedded in a web page or an app webview.
     */
    renderedContent?: string;
    /**
     * Base64 encoded JSON representing array of <search term, search url> tuple.
     */
    sdkBlob?: string;
}

/**
 * Describes a simple string schema, with or without format
 *
 * @public
 */
export declare interface SimpleStringSchema extends BaseSchema {
    type: typeof SchemaType.STRING;
    format?: "date-time" | undefined;
    enum?: never;
}

/**
 * Params passed to atomic asynchronous operations.
 * @public
 */
export declare interface SingleRequestOptions extends RequestOptions {
    /**
     * An object that may be used to abort asynchronous requests. The request may
     * also be aborted due to the expiration of the timeout value, if provided.
     *
     * NOTE: AbortSignal is a client-only operation. Using it to cancel an
     * operation will not cancel the request in the service. You will still
     * be charged usage for any applicable operations.
     */
    signal?: AbortSignal;
}

/**
 * Params for {@link GenerativeModel.startChat}.
 * @public
 */
export declare interface StartChatParams extends BaseParams {
    history?: Content[];
    tools?: Tool[];
    toolConfig?: ToolConfig;
    systemInstruction?: string | Part | Content;
    /**
     * This is the name of a `CachedContent` and not the cache object itself.
     */
    cachedContent?: string;
}

/**
 * Describes a string.
 *
 * @public
 */
export declare type StringSchema = SimpleStringSchema | EnumStringSchema;

/**
 * Task type for embedding content.
 * @public
 */
export declare enum TaskType {
    TASK_TYPE_UNSPECIFIED = "TASK_TYPE_UNSPECIFIED",
    RETRIEVAL_QUERY = "RETRIEVAL_QUERY",
    RETRIEVAL_DOCUMENT = "RETRIEVAL_DOCUMENT",
    SEMANTIC_SIMILARITY = "SEMANTIC_SIMILARITY",
    CLASSIFICATION = "CLASSIFICATION",
    CLUSTERING = "CLUSTERING"
}

/**
 * Content part interface if the part represents a text string.
 * @public
 */
export declare interface TextPart {
    text: string;
    inlineData?: never;
    functionCall?: never;
    functionResponse?: never;
    fileData?: never;
    executableCode?: never;
    codeExecutionResult?: never;
}

/**
 * Defines a tool that model can call to access external knowledge.
 * @public
 */
export declare type Tool = FunctionDeclarationsTool | CodeExecutionTool | GoogleSearchRetrievalTool;

/**
 * Tool config. This config is shared for all tools provided in the request.
 * @public
 */
export declare interface ToolConfig {
    functionCallingConfig: FunctionCallingConfig;
}

/**
 * Candidates with top log probabilities at each decoding step
 */
export declare interface TopCandidates {
    /** Sorted by log probability in descending order. */
    candidates: LogprobsCandidate[];
}

/**
 * Metadata on the generation request's token usage.
 * @public
 */
export declare interface UsageMetadata {
    /** Number of tokens in the prompt. */
    promptTokenCount: number;
    /** Total number of tokens across the generated candidates. */
    candidatesTokenCount: number;
    /** Total token count for the generation request (prompt + candidates). */
    totalTokenCount: number;
    /** Total token count in the cached part of the prompt, i.e. in the cached content. */
    cachedContentTokenCount?: number;
}

export { }
