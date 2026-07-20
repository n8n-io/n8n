import type { FetchFn } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';

export interface AgentToolInstrumentationContext {
	/** Sanitized tool name — the same identifier the model calls and `GenerateResult.toolCalls` reports. */
	toolName: string;
	toolKind: 'node' | 'workflow';
}

/**
 * Optional per-run overrides for how an agent runtime reaches the outside
 * world. Only set by the Instance AI eval execution path — never present for
 * chat, published, task, or workflow-node runs. Callers must build the
 * runtime uncached (bypass AgentRuntimeCacheService) when passing this, so an
 * instrumented runtime can never be served to a normal run.
 */
export interface AgentRuntimeInstrumentation {
	/** Replaces the default proxy-aware transport for the agent's model calls. */
	modelFetch?: FetchFn;
	/** Replaces the default SSRF-guarded transport for MCP server traffic. */
	mcpFetch?: FetchFn;
	/**
	 * Replaces the live Brave/SearXNG call behind the fallback `web_search`
	 * tool. When set, the tool attaches even without a search provider or
	 * credential in the config. Provider-native web search is unaffected (it
	 * runs inside the model call). Shape matches `FallbackWebSearchHandler`.
	 */
	webSearch?: (args: {
		query: string;
		maxResults?: number;
		includeDomains?: string[];
		excludeDomains?: string[];
	}) => Promise<unknown>;
	/**
	 * Decorates the `additionalData` used for node-tool executions and
	 * workflow-tool sub-executions (e.g. plants `evalLlmMockHandler` and a
	 * mocked credentials helper). Invoked once per tool invocation.
	 */
	configureToolAdditionalData?: (
		additionalData: IWorkflowExecuteAdditionalData,
		context: AgentToolInstrumentationContext,
	) => void;
	/**
	 * Transforms a configured sub-agent's config before its delegated runtime
	 * is reconstructed (the child inherits this instrumentation, so its seams
	 * are already covered). May only REMOVE features — the child's tool
	 * descriptors are resolved from the untransformed source, so added tools
	 * would have no backing descriptors.
	 */
	transformDelegatedAgentConfig?: (
		config: AgentJsonConfig,
		context: { subAgentId: string },
	) => AgentJsonConfig;
}

export type InstrumentToolAdditionalData = NonNullable<
	AgentRuntimeInstrumentation['configureToolAdditionalData']
>;
