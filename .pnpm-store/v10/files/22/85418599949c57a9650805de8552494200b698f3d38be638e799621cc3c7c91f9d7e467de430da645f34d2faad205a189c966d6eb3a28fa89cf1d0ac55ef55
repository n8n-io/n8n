import { ToolOptions } from '@microsoft/agents-a365-tooling';
import { OperationResult, IConfigurationProvider } from '@microsoft/agents-a365-runtime';
import { LangChainToolingConfiguration } from './configuration';
import { TurnContext, Authorization } from '@microsoft/agents-hosting';
import { ReactAgent } from 'langchain';
import { BaseMessage } from '@langchain/core/messages';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import { RunnableConfig } from '@langchain/core/runnables';
import type { CompiledStateGraph, StateSnapshot } from '@langchain/langgraph';
/**
 * Discover MCP servers and list tools formatted for the LangChain Orchestrator.
 * Uses listToolServers to fetch server configs and getTools to enumerate tools.
 *
 * Also provides methods to send chat history to the MCP platform for
 * real-time threat protection (RTP) analysis.
 */
export declare class McpToolRegistrationService {
    private readonly configService;
    private readonly configProvider;
    private readonly orchestratorName;
    /**
     * Construct a McpToolRegistrationService.
     * @param configProvider Optional configuration provider. Defaults to defaultLangChainToolingConfigurationProvider if not specified.
     */
    constructor(configProvider?: IConfigurationProvider<LangChainToolingConfiguration>);
    /**
     * Registers MCP tool servers and updates agent options with discovered tools and server configs.
     * Call this to enable dynamic LangChain tool access based on the current MCP environment.
     * @param agent The LangChain Agent instance to which MCP servers will be added.
     * @param authorization Authorization object for token exchange.
     * @param authHandlerName The name of the auth handler to use for token exchange.
     * @param turnContext The TurnContext of the current request.
     * @param authToken Optional bearer token for MCP server access.
     * @returns The updated Agent instance with registered MCP servers.
     */
    addToolServersToAgent(agent: ReactAgent, authorization: Authorization, authHandlerName: string, turnContext: TurnContext, authToken: string): Promise<ReactAgent>;
    /**
     * Sends chat history from a LangGraph CompiledStateGraph to the MCP platform.
     *
     * This is the highest-level and easiest-to-use API. It retrieves the current state
     * from the graph, extracts messages, converts them to ChatHistoryMessage format,
     * and sends them to the MCP platform for real-time threat protection.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param graph - The LangGraph CompiledStateGraph instance. The graph state must contain a 'messages' array.
     * @param config - The RunnableConfig containing thread_id and other configuration.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if graph is null/undefined.
     * @throws Error if config is null/undefined.
     *
     * @example
     * ```typescript
     * const config = { configurable: { thread_id: '1' } };
     * const result = await service.sendChatHistoryAsync(turnContext, graph, config);
     * if (result.succeeded) {
     *   console.log('Chat history sent successfully');
     * }
     * ```
     */
    sendChatHistoryAsync(turnContext: TurnContext, graph: CompiledStateGraph<unknown, unknown, string>, config: RunnableConfig, limit?: number, toolOptions?: ToolOptions): Promise<OperationResult>;
    /**
     * Extracts messages from a LangGraph StateSnapshot and sends them to the MCP platform.
     *
     * Use this API when you already have a StateSnapshot (e.g., from a previous
     * `graph.getState()` call) and want to avoid fetching state again.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param stateSnapshot - The LangGraph StateSnapshot containing message state.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if stateSnapshot is null/undefined.
     * @throws Error if stateSnapshot does not contain a messages array.
     *
     * @example
     * ```typescript
     * const config = { configurable: { thread_id: '1' } };
     * const stateSnapshot = await graph.getState(config);
     * const result = await service.sendChatHistoryFromStateAsync(turnContext, stateSnapshot);
     * ```
     */
    sendChatHistoryFromStateAsync(turnContext: TurnContext, stateSnapshot: StateSnapshot, limit?: number, toolOptions?: ToolOptions): Promise<OperationResult>;
    /**
     * Retrieves messages from a BaseChatMessageHistory instance and sends them to the MCP platform.
     *
     * Use this API when working with LangChain's memory abstractions (e.g., InMemoryChatMessageHistory,
     * RedisChatMessageHistory, etc.).
     *
     * @param turnContext - The turn context containing conversation information.
     * @param chatHistory - The BaseChatMessageHistory instance to retrieve messages from.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if chatHistory is null/undefined.
     *
     * @example
     * ```typescript
     * const chatHistory = new InMemoryChatMessageHistory();
     * // ... add messages to history ...
     * const result = await service.sendChatHistoryFromChatHistoryAsync(turnContext, chatHistory);
     * ```
     */
    sendChatHistoryFromChatHistoryAsync(turnContext: TurnContext, chatHistory: BaseChatMessageHistory, limit?: number, toolOptions?: ToolOptions): Promise<OperationResult>;
    /**
     * Sends an array of LangChain messages to the MCP platform for real-time threat protection.
     *
     * This is the lowest-level API that accepts raw BaseMessage arrays. Use this when you
     * have already extracted messages or have a custom message source not covered by the
     * higher-level APIs.
     *
     * This method converts the provided BaseMessage array to ChatHistoryMessage format
     * and sends them to the MCP platform. Empty arrays are sent as-is to register the
     * user message with the platform.
     *
     * @param turnContext - The turn context containing conversation information.
     * @param messages - Array of LangChain BaseMessage objects to send.
     * @param limit - Optional limit on the number of messages to send.
     * @param toolOptions - Optional tool options for customization.
     * @returns A Promise resolving to an OperationResult indicating success or failure.
     * @throws Error if turnContext is null/undefined.
     * @throws Error if messages is null/undefined.
     * @throws Error if required turn context properties are missing.
     *
     * @example
     * ```typescript
     * const messages = await messageHistory.getMessages();
     * const result = await service.sendChatHistoryFromMessagesAsync(turnContext, messages, 50);
     * if (result.succeeded) {
     *   console.log('Chat history sent successfully');
     * } else {
     *   console.error('Failed to send chat history:', result.errors);
     * }
     * ```
     */
    sendChatHistoryFromMessagesAsync(turnContext: TurnContext, messages: BaseMessage[], limit?: number, toolOptions?: ToolOptions): Promise<OperationResult>;
    /**
     * Converts an array of BaseMessage to ChatHistoryMessage format.
     * Messages that fail conversion are silently skipped.
     *
     * @param messages - Array of LangChain BaseMessage objects to convert.
     * @returns Array of ChatHistoryMessage objects.
     */
    private convertToChatHistoryMessages;
    /**
     * Converts a single BaseMessage to ChatHistoryMessage format.
     *
     * @param message - The LangChain BaseMessage to convert.
     * @returns ChatHistoryMessage or null if conversion fails.
     */
    private convertSingleMessage;
    /**
     * Maps a LangChain message type to a standard role string.
     *
     * @param message - The LangChain BaseMessage to map.
     * @returns The mapped role string.
     */
    private mapRole;
    /**
     * Extracts text content from a LangChain message.
     * Handles both string content and ContentPart arrays.
     *
     * @param message - The LangChain BaseMessage to extract content from.
     * @returns The extracted text content as a string.
     */
    private extractContent;
}
//# sourceMappingURL=McpToolRegistrationService.d.ts.map