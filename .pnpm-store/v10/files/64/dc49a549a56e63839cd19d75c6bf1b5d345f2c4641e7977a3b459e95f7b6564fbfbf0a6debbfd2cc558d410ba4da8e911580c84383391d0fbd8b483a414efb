import { Protocol, type NotificationOptions, type ProtocolOptions, type RequestOptions } from '../shared/protocol.js';
import { type ClientCapabilities, type CreateMessageRequest, type CreateMessageResult, type CreateMessageResultWithTools, type CreateMessageRequestParamsBase, type CreateMessageRequestParamsWithTools, type ElicitRequestFormParams, type ElicitRequestURLParams, type ElicitResult, type Implementation, type ListRootsRequest, type LoggingMessageNotification, type ResourceUpdatedNotification, type ServerCapabilities, type ServerNotification, type ServerRequest, type ServerResult, type Request, type Notification, type Result } from '../types.js';
import type { jsonSchemaValidator } from '../validation/types.js';
import { AnyObjectSchema, SchemaOutput } from './zod-compat.js';
import { RequestHandlerExtra } from '../shared/protocol.js';
import { ExperimentalServerTasks } from '../experimental/tasks/server.js';
export type ServerOptions = ProtocolOptions & {
    /**
     * Capabilities to advertise as being supported by this server.
     */
    capabilities?: ServerCapabilities;
    /**
     * Optional instructions describing how to use the server and its features.
     */
    instructions?: string;
    /**
     * JSON Schema validator for elicitation response validation.
     *
     * The validator is used to validate user input returned from elicitation
     * requests against the requested schema.
     *
     * @default AjvJsonSchemaValidator
     *
     * @example
     * ```typescript
     * // ajv (default)
     * const server = new Server(
     *   { name: 'my-server', version: '1.0.0' },
     *   {
     *     capabilities: {}
     *     jsonSchemaValidator: new AjvJsonSchemaValidator()
     *   }
     * );
     *
     * // @cfworker/json-schema
     * const server = new Server(
     *   { name: 'my-server', version: '1.0.0' },
     *   {
     *     capabilities: {},
     *     jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
     *   }
     * );
     * ```
     */
    jsonSchemaValidator?: jsonSchemaValidator;
};
/**
 * An MCP server on top of a pluggable transport.
 *
 * This server will automatically respond to the initialization flow as initiated from the client.
 *
 * To use with custom types, extend the base Request/Notification/Result types and pass them as type parameters:
 *
 * ```typescript
 * // Custom schemas
 * const CustomRequestSchema = RequestSchema.extend({...})
 * const CustomNotificationSchema = NotificationSchema.extend({...})
 * const CustomResultSchema = ResultSchema.extend({...})
 *
 * // Type aliases
 * type CustomRequest = z.infer<typeof CustomRequestSchema>
 * type CustomNotification = z.infer<typeof CustomNotificationSchema>
 * type CustomResult = z.infer<typeof CustomResultSchema>
 *
 * // Create typed server
 * const server = new Server<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomServer",
 *   version: "1.0.0"
 * })
 * ```
 * @deprecated Use `McpServer` instead for the high-level API. Only use `Server` for advanced use cases.
 */
export declare class Server<RequestT extends Request = Request, NotificationT extends Notification = Notification, ResultT extends Result = Result> extends Protocol<ServerRequest | RequestT, ServerNotification | NotificationT, ServerResult | ResultT> {
    private _serverInfo;
    private _clientCapabilities?;
    private _clientVersion?;
    private _capabilities;
    private _instructions?;
    private _jsonSchemaValidator;
    private _experimental?;
    /**
     * Callback for when initialization has fully completed (i.e., the client has sent an `initialized` notification).
     */
    oninitialized?: () => void;
    /**
     * Initializes this server with the given name and version information.
     */
    constructor(_serverInfo: Implementation, options?: ServerOptions);
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental(): {
        tasks: ExperimentalServerTasks<RequestT, NotificationT, ResultT>;
    };
    private _loggingLevels;
    private readonly LOG_LEVEL_SEVERITY;
    private isMessageIgnored;
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities: ServerCapabilities): void;
    /**
     * Override request handler registration to enforce server-side validation for tools/call.
     */
    setRequestHandler<T extends AnyObjectSchema>(requestSchema: T, handler: (request: SchemaOutput<T>, extra: RequestHandlerExtra<ServerRequest | RequestT, ServerNotification | NotificationT>) => ServerResult | ResultT | Promise<ServerResult | ResultT>): void;
    protected assertCapabilityForMethod(method: RequestT['method']): void;
    protected assertNotificationCapability(method: (ServerNotification | NotificationT)['method']): void;
    protected assertRequestHandlerCapability(method: string): void;
    protected assertTaskCapability(method: string): void;
    protected assertTaskHandlerCapability(method: string): void;
    private _oninitialize;
    /**
     * After initialization has completed, this will be populated with the client's reported capabilities.
     */
    getClientCapabilities(): ClientCapabilities | undefined;
    /**
     * After initialization has completed, this will be populated with information about the client's name and version.
     */
    getClientVersion(): Implementation | undefined;
    private getCapabilities;
    ping(): Promise<{
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    /**
     * Request LLM sampling from the client (without tools).
     * Returns single content block for backwards compatibility.
     */
    createMessage(params: CreateMessageRequestParamsBase, options?: RequestOptions): Promise<CreateMessageResult>;
    /**
     * Request LLM sampling from the client with tool support.
     * Returns content that may be a single block or array (for parallel tool calls).
     */
    createMessage(params: CreateMessageRequestParamsWithTools, options?: RequestOptions): Promise<CreateMessageResultWithTools>;
    /**
     * Request LLM sampling from the client.
     * When tools may or may not be present, returns the union type.
     */
    createMessage(params: CreateMessageRequest['params'], options?: RequestOptions): Promise<CreateMessageResult | CreateMessageResultWithTools>;
    /**
     * Creates an elicitation request for the given parameters.
     * For backwards compatibility, `mode` may be omitted for form requests and will default to `'form'`.
     * @param params The parameters for the elicitation request.
     * @param options Optional request options.
     * @returns The result of the elicitation request.
     */
    elicitInput(params: ElicitRequestFormParams | ElicitRequestURLParams, options?: RequestOptions): Promise<ElicitResult>;
    /**
     * Creates a reusable callback that, when invoked, will send a `notifications/elicitation/complete`
     * notification for the specified elicitation ID.
     *
     * @param elicitationId The ID of the elicitation to mark as complete.
     * @param options Optional notification options. Useful when the completion notification should be related to a prior request.
     * @returns A function that emits the completion notification when awaited.
     */
    createElicitationCompletionNotifier(elicitationId: string, options?: NotificationOptions): () => Promise<void>;
    listRoots(params?: ListRootsRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        roots: {
            uri: string;
            name?: string | undefined;
            _meta?: Record<string, unknown> | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    /**
     * Sends a logging message to the client, if connected.
     * Note: You only need to send the parameters object, not the entire JSON RPC message
     * @see LoggingMessageNotification
     * @param params
     * @param sessionId optional for stateless and backward compatibility
     */
    sendLoggingMessage(params: LoggingMessageNotification['params'], sessionId?: string): Promise<void>;
    sendResourceUpdated(params: ResourceUpdatedNotification['params']): Promise<void>;
    sendResourceListChanged(): Promise<void>;
    sendToolListChanged(): Promise<void>;
    sendPromptListChanged(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map