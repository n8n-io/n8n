import type { ZodType } from 'zod';

import type { EvalInput, EvalScore, JudgeInput } from './eval';
import type { AgentMessage } from './message';
import type { InterruptibleToolContext, ToolContext } from './tool';

/** Abstraction for executing user-authored handler code in a sandbox. */
export interface HandlerExecutor {
	/** Execute a tool handler within the agent's module context. */
	executeTool(
		toolName: string,
		input: unknown,
		context: ToolContext | InterruptibleToolContext,
	): Promise<unknown>;

	/** Execute a tool's toMessage transform within the agent's module context. */
	executeToMessage(toolName: string, output: unknown): Promise<AgentMessage | undefined>;

	/**
	 * Synchronous variant of executeToMessage. When provided, fromSchema()
	 * prefers this over the async version so that the runtime's synchronous
	 * toMessage call gets an immediate result instead of a stale cache.
	 */
	executeToMessageSync?(toolName: string, output: unknown): AgentMessage | undefined;

	/** Execute an eval handler within the agent's module context. */
	executeEval(evalName: string, evalInput: EvalInput | JudgeInput): Promise<EvalScore>;

	/** Evaluate a Zod source string and return the parsed schema. */
	evaluateSchema(schemaSource: string): Promise<ZodType>;

	/**
	 * Evaluate an arbitrary source expression in the sandbox and return the result.
	 * Used for provider tool sources, MCP configs, telemetry sources, etc.
	 * The expression has access to `@n8n/agents` exports (e.g. `providerTools`, `Telemetry`)
	 * and `zod`.
	 */
	evaluateExpression(source: string): Promise<unknown>;
}
