// AI Node SDK version
export { AI_NODE_SDK_VERSION } from './ai-node-sdk-version';

// Log wrapper and related utilities
export { logWrapper } from './utils/log-wrapper';
export { logAiEvent } from './utils/log-ai-event';
export { parseSSEStream } from './utils/sse';
export {
	validateEmbedQueryInput,
	validateEmbedDocumentsInput,
} from './utils/embeddings-input-validation';
export { getMetadataFiltersValues, hasLongSequentialRepeat } from './utils/helpers';
export { N8nBinaryLoader } from './utils/n8n-binary-loader';
export { N8nJsonLoader } from './utils/n8n-json-loader';
export { N8nLlmTracing } from './utils/n8n-llm-tracing';
export {
	estimateTokensFromStringList,
	estimateTokensByCharCount,
	estimateTextSplitsByTokens,
} from './utils/tokenizer/token-estimator';
export { encodingForModel, getEncoding } from './utils/tokenizer/tiktoken';
export { makeN8nLlmFailedAttemptHandler } from './utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';
export {
	getProxyAgent,
	getNodeProxyAgent,
	proxyFetch,
	type AgentTimeoutOptions,
} from './utils/http-proxy-agent';

// Type guards
export {
	isBaseChatMemory,
	isBaseChatMessageHistory,
	isChatInstance,
	isToolsInstance,
} from './guards';

// Types
export type { ChatModel, ChatModelConfig } from './types/chat-model';
export type { GenerateResult, StreamChunk, TokenUsage, FinishReason } from './types/output';
export type { Tool, ToolResult, ToolCall, ProviderTool } from './types/tool';
export type {
	Message,
	ContentFile,
	ContentMetadata,
	ContentReasoning,
	ContentText,
	ContentToolCall,
	ContentToolResult,
	MessageContent,
	MessageRole,
} from './types/message';
export type { JSONArray, JSONObject, JSONValue } from './types/json';
export type { ServerSentEventMessage } from './utils/sse';

export { LangchainAdapter } from './adapters/langchain-chat-model';

export { BaseChatModel } from './chat-model/base';

export { getParametersJsonSchema } from './converters/tool';

// Memory types
export type { ChatHistory, ChatMemory } from './types/memory';

// Memory base classes
export { BaseChatHistory } from './memory/base-chat-history';
export { BaseChatMemory } from './memory/base-chat-memory';

// Memory implementations
export { WindowedChatMemory, type WindowedChatMemoryConfig } from './memory/windowed-chat-memory';

// Suppliers
export { supplyMemory, type SupplyMemoryOptions } from './suppliers/supplyMemory';
export { supplyModel, type SupplyModelOptions } from './suppliers/supplyModel';
