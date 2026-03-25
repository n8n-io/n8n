/// <reference types="node" />

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
 * Params to pass to {@link GoogleAICacheManager.create}.
 * @public
 */
export declare interface CachedContentCreateParams extends CachedContentBase {
    /**
     * `CachedContent` ttl in seconds. Specify either this or `expireTime`
     * when creating a `CachedContent`.
     */
    ttlSeconds?: number;
}

/**
 * Fields that can be updated in an existing content cache.
 * @public
 */
export declare interface CachedContentUpdateInputFields {
    ttlSeconds?: number;
    expireTime?: string;
}

/**
 * Params to pass to {@link GoogleAICacheManager.update}.
 * @public
 */
export declare interface CachedContentUpdateParams {
    cachedContent: CachedContentUpdateInputFields;
    /**
     * protobuf FieldMask. If not specified, updates all provided fields.
     */
    updateMask?: string[];
}

/**
 * Params as sent to the backend (ttl instead of ttlSeconds).
 * @internal
 */
export declare interface _CachedContentUpdateRequest {
    cachedContent: _CachedContentUpdateRequestFields;
    /**
     * protobuf FieldMask
     */
    updateMask?: string[];
}

/**
 * Fields that can be updated in an existing content cache.
 * @internal
 */
export declare interface _CachedContentUpdateRequestFields {
    ttl?: string;
    expireTime?: string;
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
 * Specifies the dynamic retrieval configuration for the given source.
 * @public
 */
declare interface DynamicRetrievalConfig {
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
declare enum DynamicRetrievalMode {
    MODE_UNSPECIFIED = "MODE_UNSPECIFIED",
    MODE_DYNAMIC = "MODE_DYNAMIC"
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
 * Metadata to provide alongside a file upload
 * @public
 */
export declare interface FileMetadata {
    name?: string;
    displayName?: string;
    mimeType: string;
}

/**
 * File metadata response from server.
 * @public
 */
export declare interface FileMetadataResponse {
    name: string;
    displayName?: string;
    mimeType: string;
    sizeBytes: string;
    createTime: string;
    updateTime: string;
    expirationTime: string;
    sha256Hash: string;
    uri: string;
    state: FileState;
    /**
     * Error populated if file processing has failed.
     */
    error?: RpcStatus;
    /**
     * Video metadata populated after processing is complete.
     */
    videoMetadata?: VideoMetadata;
}

/**
 * Processing state of the `File`.
 * @public
 */
export declare enum FileState {
    STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
    PROCESSING = "PROCESSING",
    ACTIVE = "ACTIVE",
    FAILED = "FAILED"
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
 * Class for managing GoogleAI content caches.
 * @public
 */
export declare class GoogleAICacheManager {
    apiKey: string;
    private _requestOptions?;
    constructor(apiKey: string, _requestOptions?: RequestOptions);
    /**
     * Upload a new content cache
     */
    create(createOptions: CachedContentCreateParams): Promise<CachedContent>;
    /**
     * List all uploaded content caches
     */
    list(listParams?: ListParams): Promise<ListCacheResponse>;
    /**
     * Get a content cache
     */
    get(name: string): Promise<CachedContent>;
    /**
     * Update an existing content cache
     */
    update(name: string, updateParams: CachedContentUpdateParams): Promise<CachedContent>;
    /**
     * Delete content cache with given name
     */
    delete(name: string): Promise<void>;
}

/**
 * Class for managing GoogleAI file uploads.
 * @public
 */
export declare class GoogleAIFileManager {
    apiKey: string;
    private _requestOptions;
    constructor(apiKey: string, _requestOptions?: RequestOptions);
    /**
     * Upload a file.
     */
    uploadFile(fileData: string | Buffer, fileMetadata: FileMetadata): Promise<UploadFileResponse>;
    /**
     * List all uploaded files.
     *
     * Any fields set in the optional {@link SingleRequestOptions} parameter will take
     * precedence over the {@link RequestOptions} values provided at the time of the
     * {@link GoogleAIFileManager} initialization.
     */
    listFiles(listParams?: ListParams, requestOptions?: SingleRequestOptions): Promise<ListFilesResponse>;
    /**
     * Get metadata for file with given ID.
     *
     * Any fields set in the optional {@link SingleRequestOptions} parameter will take
     * precedence over the {@link RequestOptions} values provided at the time of the
     * {@link GoogleAIFileManager} initialization.
     */
    getFile(fileId: string, requestOptions?: SingleRequestOptions): Promise<FileMetadataResponse>;
    /**
     * Delete file with given ID.
     */
    deleteFile(fileId: string): Promise<void>;
}

/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
declare interface GoogleSearchRetrieval {
    /**
     * Specifies the dynamic retrieval configuration for the given source.
     */
    dynamicRetrievalConfig?: DynamicRetrievalConfig;
}

/**
 * Retrieval tool that is powered by Google search.
 * @public
 */
declare interface GoogleSearchRetrievalTool {
    /**
     * Google search retrieval tool config.
     */
    googleSearchRetrieval?: GoogleSearchRetrieval;
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
 * @public
 */
export declare interface ListCacheResponse {
    cachedContents: CachedContent[];
    nextPageToken?: string;
}

/**
 * Response from calling {@link GoogleAIFileManager.listFiles}
 * @public
 */
export declare interface ListFilesResponse {
    files: FileMetadataResponse[];
    nextPageToken?: string;
}

/**
 * Params to pass to {@link GoogleAIFileManager.listFiles} or
 * {@link GoogleAICacheManager.list}
 * @public
 */
export declare interface ListParams {
    pageSize?: number;
    pageToken?: string;
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
 * Standard RPC error status object.
 * @public
 */
export declare interface RpcStatus {
    /**
     * Error status code
     */
    code: number;
    /**
     * A developer-facing error message.
     */
    message: string;
    /**
     * A list of messages that carry the error details.
     */
    details?: ErrorDetails[];
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
 * Describes a string.
 *
 * @public
 */
export declare type StringSchema = SimpleStringSchema | EnumStringSchema;

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
 * Response from calling {@link GoogleAIFileManager.uploadFile}
 * @public
 */
export declare interface UploadFileResponse {
    file: FileMetadataResponse;
}

/**
 * Metadata populated when video has been processed.
 * @public
 */
export declare interface VideoMetadata {
    /**
     * The video duration in
     * protobuf {@link https://cloud.google.com/ruby/docs/reference/google-cloud-workflows-v1/latest/Google-Protobuf-Duration#json-mapping | Duration} format.
     */
    videoDuration: string;
}

export { }
