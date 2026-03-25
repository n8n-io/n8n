/**
 * Represents different types of agent invocations
 */
export declare enum ExecutionType {
    /** Direct human-to-agent invocation (e.g., through UI, API call) */
    HumanToAgent = "HumanToAgent",
    /** Agent-to-agent invocation (e.g., one agent calling another) */
    Agent2Agent = "Agent2Agent",
    /** Event-driven agent invocation (e.g., scheduled, webhook, message queue) */
    EventToAgent = "EventToAgent",
    /** Unknown or unspecified invocation type */
    Unknown = "Unknown"
}
/**
 * Represents different roles that can invoke an agent
 */
export declare enum InvocationRole {
    /** Human user invoking the agent */
    Human = "Human",
    /** Another agent invoking this agent */
    Agent = "Agent",
    /** Event-driven invocation (e.g., scheduled, webhook, message queue) */
    Event = "Event",
    /** Unknown or unspecified role */
    Unknown = "Unknown"
}
/**
 * Represents different operation for types for model inference
 */
export declare enum InferenceOperationType {
    CHAT = "Chat",
    TEXT_COMPLETION = "TextCompletion",
    GENERATE_CONTENT = "GenerateContent"
}
/**
 * Represents metadata about the source of an invocation
 */
export interface SourceMetadata {
    /** Unique identifier for the source (e.g., agent ID, user ID, system component ID) */
    id?: string;
    /** Human-readable name of the source */
    name?: string;
    /** Optional icon identifier or URL for visual representation of the source */
    iconUri?: string;
    /** The role of the source invoking the agent */
    role?: InvocationRole;
    /** Optional description providing additional context about the source */
    description?: string;
}
/**
 * Represents a request to an agent with telemetry context
 */
export interface AgentRequest {
    /** The content of the request */
    content?: string;
    /** The type of invocation (how the agent was called) */
    executionType?: ExecutionType;
    /** Optional session identifier for grouping related requests */
    sessionId?: string;
    /** Optional metadata about the source of the invocation */
    sourceMetadata?: SourceMetadata;
}
/**
 * Details about a tenant
 */
export interface TenantDetails {
    /** The unique identifier for the tenant */
    tenantId: string;
}
/**
 * Details about an AI agent
 */
export interface AgentDetails {
    /** The unique identifier for the AI agent */
    agentId: string;
    /** The identifier for the conversation or session */
    conversationId?: string;
    /** The human-readable name of the AI agent */
    agentName?: string;
    /** Optional type of the AI agent */
    agentType?: string;
    /** A description of the AI agent's purpose or capabilities */
    agentDescription?: string;
    /** Optional icon identifier or URL for visual representation of the agent */
    iconUri?: string;
    /** Optional platform identifier for the agent */
    platformId?: string;
    /** The agent user ID (AUID) */
    agentAUID?: string;
    /** The agent user principal name (UPN) */
    agentUPN?: string;
    /** The agent blueprint/application ID */
    agentBlueprintId?: string;
    /** The tenant ID for the agent */
    tenantId?: string;
    /** The client IP address for the agent user */
    agentClientIP?: string;
}
/**
 * Details of a tool call made by an agent
 */
export interface ToolCallDetails {
    /** The name of the tool being executed */
    toolName: string;
    /** Tool arguments/parameters */
    arguments?: string;
    /** The unique identifier for the tool call */
    toolCallId?: string;
    /** Optional description of the tool or its purpose */
    description?: string;
    /** The type of the tool being executed */
    toolType?: string;
    /** The endpoint for the tool execution */
    endpoint?: ServiceEndpoint;
}
/**
 * Details about a caller
 */
export interface CallerDetails {
    /** The unique identifier for the caller */
    callerId?: string;
    /** The user principal name (UPN) of the caller */
    callerUpn?: string;
    /** The display name of the caller */
    callerName?: string;
    /** The user ID of the caller */
    callerUserId?: string;
    /** The tenant ID of the caller */
    tenantId?: string;
    /** The client IP address for the caller */
    callerClientIp?: string;
}
export type EnhancedAgentDetails = AgentDetails;
/**
 * Represents an endpoint for agent invocation
 */
export interface ServiceEndpoint {
    /** The host address */
    host: string;
    /** The port number */
    port?: number;
    /** The protocol (e.g., http, https) */
    protocol?: string;
}
/**
 * Details for invoking another agent
 */
export interface InvokeAgentDetails extends AgentDetails {
    /** The request payload for the agent invocation */
    request?: AgentRequest;
    /** The endpoint for the agent invocation */
    endpoint?: ServiceEndpoint;
    /** Session ID for the invocation */
    sessionId?: string;
}
/**
 * Details for an inference call matching C# implementation
 */
export interface InferenceDetails {
    /** The operation name/type for the inference */
    operationName: InferenceOperationType;
    /** The model name/identifier */
    model: string;
    /** The provider name (e.g., openai, azure, anthropic) */
    providerName?: string;
    /** Number of input tokens used */
    inputTokens?: number;
    /** Number of output tokens generated */
    outputTokens?: number;
    /** Array of finish reasons */
    finishReasons?: string[];
    /** Response ID from the model provider */
    responseId?: string;
}
/**
 * Details for recording the response from an inference call
 */
export interface InferenceResponse {
    /** The generated response content */
    content: string;
    /** Response ID from the model provider */
    responseId?: string;
    /** Finish reason (e.g., stop, length, content_filter) */
    finishReason?: string;
    /** Number of input tokens used */
    inputTokens?: number;
    /** Number of output tokens generated */
    outputTokens?: number;
}
/**
 * Represents a response containing output messages from an agent.
 * Used with OutputScope for output message tracing.
 */
export interface OutputResponse {
    /** The output messages from the agent */
    messages: string[];
}
//# sourceMappingURL=contracts.d.ts.map