import { Protocol, type ProtocolOptions, type RequestOptions } from '../shared/protocol.js';
import type { Transport } from '../shared/transport.js';
import { type CallToolRequest, CallToolResultSchema, type ClientCapabilities, type ClientNotification, type ClientRequest, type ClientResult, type CompatibilityCallToolResultSchema, type CompleteRequest, type GetPromptRequest, type Implementation, type ListPromptsRequest, type ListResourcesRequest, type ListResourceTemplatesRequest, type ListToolsRequest, type LoggingLevel, type ReadResourceRequest, type ServerCapabilities, type SubscribeRequest, type UnsubscribeRequest, type ListChangedHandlers, type Request, type Notification, type Result } from '../types.js';
import type { jsonSchemaValidator } from '../validation/types.js';
import { AnyObjectSchema, SchemaOutput } from '../server/zod-compat.js';
import type { RequestHandlerExtra } from '../shared/protocol.js';
import { ExperimentalClientTasks } from '../experimental/tasks/client.js';
/**
 * Determines which elicitation modes are supported based on declared client capabilities.
 *
 * According to the spec:
 * - An empty elicitation capability object defaults to form mode support (backwards compatibility)
 * - URL mode is only supported if explicitly declared
 *
 * @param capabilities - The client's elicitation capabilities
 * @returns An object indicating which modes are supported
 */
export declare function getSupportedElicitationModes(capabilities: ClientCapabilities['elicitation']): {
    supportsFormMode: boolean;
    supportsUrlMode: boolean;
};
export type ClientOptions = ProtocolOptions & {
    /**
     * Capabilities to advertise as being supported by this client.
     */
    capabilities?: ClientCapabilities;
    /**
     * JSON Schema validator for tool output validation.
     *
     * The validator is used to validate structured content returned by tools
     * against their declared output schemas.
     *
     * @default AjvJsonSchemaValidator
     *
     * @example
     * ```typescript
     * // ajv
     * const client = new Client(
     *   { name: 'my-client', version: '1.0.0' },
     *   {
     *     capabilities: {},
     *     jsonSchemaValidator: new AjvJsonSchemaValidator()
     *   }
     * );
     *
     * // @cfworker/json-schema
     * const client = new Client(
     *   { name: 'my-client', version: '1.0.0' },
     *   {
     *     capabilities: {},
     *     jsonSchemaValidator: new CfWorkerJsonSchemaValidator()
     *   }
     * );
     * ```
     */
    jsonSchemaValidator?: jsonSchemaValidator;
    /**
     * Configure handlers for list changed notifications (tools, prompts, resources).
     *
     * @example
     * ```typescript
     * const client = new Client(
     *   { name: 'my-client', version: '1.0.0' },
     *   {
     *     listChanged: {
     *       tools: {
     *         onChanged: (error, tools) => {
     *           if (error) {
     *             console.error('Failed to refresh tools:', error);
     *             return;
     *           }
     *           console.log('Tools updated:', tools);
     *         }
     *       },
     *       prompts: {
     *         onChanged: (error, prompts) => console.log('Prompts updated:', prompts)
     *       }
     *     }
     *   }
     * );
     * ```
     */
    listChanged?: ListChangedHandlers;
};
/**
 * An MCP client on top of a pluggable transport.
 *
 * The client will automatically begin the initialization flow with the server when connect() is called.
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
 * // Create typed client
 * const client = new Client<CustomRequest, CustomNotification, CustomResult>({
 *   name: "CustomClient",
 *   version: "1.0.0"
 * })
 * ```
 */
export declare class Client<RequestT extends Request = Request, NotificationT extends Notification = Notification, ResultT extends Result = Result> extends Protocol<ClientRequest | RequestT, ClientNotification | NotificationT, ClientResult | ResultT> {
    private _clientInfo;
    private _serverCapabilities?;
    private _serverVersion?;
    private _capabilities;
    private _instructions?;
    private _jsonSchemaValidator;
    private _cachedToolOutputValidators;
    private _cachedKnownTaskTools;
    private _cachedRequiredTaskTools;
    private _experimental?;
    private _listChangedDebounceTimers;
    private _pendingListChangedConfig?;
    /**
     * Initializes this client with the given name and version information.
     */
    constructor(_clientInfo: Implementation, options?: ClientOptions);
    /**
     * Set up handlers for list changed notifications based on config and server capabilities.
     * This should only be called after initialization when server capabilities are known.
     * Handlers are silently skipped if the server doesn't advertise the corresponding listChanged capability.
     * @internal
     */
    private _setupListChangedHandlers;
    /**
     * Access experimental features.
     *
     * WARNING: These APIs are experimental and may change without notice.
     *
     * @experimental
     */
    get experimental(): {
        tasks: ExperimentalClientTasks<RequestT, NotificationT, ResultT>;
    };
    /**
     * Registers new capabilities. This can only be called before connecting to a transport.
     *
     * The new capabilities will be merged with any existing capabilities previously given (e.g., at initialization).
     */
    registerCapabilities(capabilities: ClientCapabilities): void;
    /**
     * Override request handler registration to enforce client-side validation for elicitation.
     */
    setRequestHandler<T extends AnyObjectSchema>(requestSchema: T, handler: (request: SchemaOutput<T>, extra: RequestHandlerExtra<ClientRequest | RequestT, ClientNotification | NotificationT>) => ClientResult | ResultT | Promise<ClientResult | ResultT>): void;
    protected assertCapability(capability: keyof ServerCapabilities, method: string): void;
    connect(transport: Transport, options?: RequestOptions): Promise<void>;
    /**
     * After initialization has completed, this will be populated with the server's reported capabilities.
     */
    getServerCapabilities(): ServerCapabilities | undefined;
    /**
     * After initialization has completed, this will be populated with information about the server's name and version.
     */
    getServerVersion(): Implementation | undefined;
    /**
     * After initialization has completed, this may be populated with information about the server's instructions.
     */
    getInstructions(): string | undefined;
    protected assertCapabilityForMethod(method: RequestT['method']): void;
    protected assertNotificationCapability(method: NotificationT['method']): void;
    protected assertRequestHandlerCapability(method: string): void;
    protected assertTaskCapability(method: string): void;
    protected assertTaskHandlerCapability(method: string): void;
    ping(options?: RequestOptions): Promise<{
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    complete(params: CompleteRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        completion: {
            [x: string]: unknown;
            values: string[];
            total?: number | undefined;
            hasMore?: boolean | undefined;
        };
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    setLoggingLevel(level: LoggingLevel, options?: RequestOptions): Promise<{
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    getPrompt(params: GetPromptRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        messages: {
            role: "user" | "assistant";
            content: {
                type: "text";
                text: string;
                annotations?: {
                    audience?: ("user" | "assistant")[] | undefined;
                    priority?: number | undefined;
                    lastModified?: string | undefined;
                } | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                type: "image";
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("user" | "assistant")[] | undefined;
                    priority?: number | undefined;
                    lastModified?: string | undefined;
                } | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                type: "audio";
                data: string;
                mimeType: string;
                annotations?: {
                    audience?: ("user" | "assistant")[] | undefined;
                    priority?: number | undefined;
                    lastModified?: string | undefined;
                } | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                type: "resource";
                resource: {
                    uri: string;
                    text: string;
                    mimeType?: string | undefined;
                    _meta?: Record<string, unknown> | undefined;
                } | {
                    uri: string;
                    blob: string;
                    mimeType?: string | undefined;
                    _meta?: Record<string, unknown> | undefined;
                };
                annotations?: {
                    audience?: ("user" | "assistant")[] | undefined;
                    priority?: number | undefined;
                    lastModified?: string | undefined;
                } | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                uri: string;
                name: string;
                type: "resource_link";
                description?: string | undefined;
                mimeType?: string | undefined;
                annotations?: {
                    audience?: ("user" | "assistant")[] | undefined;
                    priority?: number | undefined;
                    lastModified?: string | undefined;
                } | undefined;
                _meta?: {
                    [x: string]: unknown;
                } | undefined;
                icons?: {
                    src: string;
                    mimeType?: string | undefined;
                    sizes?: string[] | undefined;
                    theme?: "light" | "dark" | undefined;
                }[] | undefined;
                title?: string | undefined;
            };
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        description?: string | undefined;
    }>;
    listPrompts(params?: ListPromptsRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        prompts: {
            name: string;
            description?: string | undefined;
            arguments?: {
                name: string;
                description?: string | undefined;
                required?: boolean | undefined;
            }[] | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    listResources(params?: ListResourcesRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        resources: {
            uri: string;
            name: string;
            description?: string | undefined;
            mimeType?: string | undefined;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    listResourceTemplates(params?: ListResourceTemplatesRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        resourceTemplates: {
            uriTemplate: string;
            name: string;
            description?: string | undefined;
            mimeType?: string | undefined;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    readResource(params: ReadResourceRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        contents: ({
            uri: string;
            text: string;
            mimeType?: string | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            uri: string;
            blob: string;
            mimeType?: string | undefined;
            _meta?: Record<string, unknown> | undefined;
        })[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    subscribeResource(params: SubscribeRequest['params'], options?: RequestOptions): Promise<{
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    unsubscribeResource(params: UnsubscribeRequest['params'], options?: RequestOptions): Promise<{
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    /**
     * Calls a tool and waits for the result. Automatically validates structured output if the tool has an outputSchema.
     *
     * For task-based execution with streaming behavior, use client.experimental.tasks.callToolStream() instead.
     */
    callTool(params: CallToolRequest['params'], resultSchema?: typeof CallToolResultSchema | typeof CompatibilityCallToolResultSchema, options?: RequestOptions): Promise<{
        [x: string]: unknown;
        content: ({
            type: "text";
            text: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            type: "image";
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            type: "audio";
            data: string;
            mimeType: string;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            type: "resource";
            resource: {
                uri: string;
                text: string;
                mimeType?: string | undefined;
                _meta?: Record<string, unknown> | undefined;
            } | {
                uri: string;
                blob: string;
                mimeType?: string | undefined;
                _meta?: Record<string, unknown> | undefined;
            };
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
        } | {
            uri: string;
            name: string;
            type: "resource_link";
            description?: string | undefined;
            mimeType?: string | undefined;
            annotations?: {
                audience?: ("user" | "assistant")[] | undefined;
                priority?: number | undefined;
                lastModified?: string | undefined;
            } | undefined;
            _meta?: {
                [x: string]: unknown;
            } | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        })[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        structuredContent?: Record<string, unknown> | undefined;
        isError?: boolean | undefined;
    } | {
        [x: string]: unknown;
        toolResult: unknown;
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
    }>;
    private isToolTask;
    /**
     * Check if a tool requires task-based execution.
     * Unlike isToolTask which includes 'optional' tools, this only checks for 'required'.
     */
    private isToolTaskRequired;
    /**
     * Cache validators for tool output schemas.
     * Called after listTools() to pre-compile validators for better performance.
     */
    private cacheToolMetadata;
    /**
     * Get cached validator for a tool
     */
    private getToolOutputValidator;
    listTools(params?: ListToolsRequest['params'], options?: RequestOptions): Promise<{
        [x: string]: unknown;
        tools: {
            inputSchema: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            };
            name: string;
            description?: string | undefined;
            outputSchema?: {
                [x: string]: unknown;
                type: "object";
                properties?: Record<string, object> | undefined;
                required?: string[] | undefined;
            } | undefined;
            annotations?: {
                title?: string | undefined;
                readOnlyHint?: boolean | undefined;
                destructiveHint?: boolean | undefined;
                idempotentHint?: boolean | undefined;
                openWorldHint?: boolean | undefined;
            } | undefined;
            execution?: {
                taskSupport?: "optional" | "required" | "forbidden" | undefined;
            } | undefined;
            _meta?: Record<string, unknown> | undefined;
            icons?: {
                src: string;
                mimeType?: string | undefined;
                sizes?: string[] | undefined;
                theme?: "light" | "dark" | undefined;
            }[] | undefined;
            title?: string | undefined;
        }[];
        _meta?: {
            [x: string]: unknown;
            progressToken?: string | number | undefined;
            "io.modelcontextprotocol/related-task"?: {
                taskId: string;
            } | undefined;
        } | undefined;
        nextCursor?: string | undefined;
    }>;
    /**
     * Set up a single list changed handler.
     * @internal
     */
    private _setupListChangedHandler;
    sendRootsListChanged(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map