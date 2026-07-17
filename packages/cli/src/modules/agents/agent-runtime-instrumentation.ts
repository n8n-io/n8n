import type { FetchFn } from '@n8n/agents';
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
	 * Decorates the `additionalData` used for node-tool executions and
	 * workflow-tool sub-executions (e.g. plants `evalLlmMockHandler` and a
	 * mocked credentials helper). Invoked once per tool invocation.
	 */
	configureToolAdditionalData?: (
		additionalData: IWorkflowExecuteAdditionalData,
		context: AgentToolInstrumentationContext,
	) => void;
}

export type InstrumentToolAdditionalData = NonNullable<
	AgentRuntimeInstrumentation['configureToolAdditionalData']
>;
