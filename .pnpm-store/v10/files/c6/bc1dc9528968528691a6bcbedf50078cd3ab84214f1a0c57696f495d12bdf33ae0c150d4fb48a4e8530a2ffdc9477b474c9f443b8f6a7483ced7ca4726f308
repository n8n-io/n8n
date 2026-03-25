const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
const require_middleware = require('../middleware.cjs');
let _langchain_core_messages = require("@langchain/core/messages");
let zod_v4 = require("zod/v4");
let zod_v3 = require("zod/v3");

//#region src/agents/middleware/toolCallLimit.ts
/**
* Build the error message content for ToolMessage when limit is exceeded.
*
* This message is sent to the model, so it should not reference thread/run concepts
* that the model has no notion of.
*
* @param toolName - Tool name being limited (if specific tool), or undefined for all tools.
* @returns A concise message instructing the model not to call the tool again.
*/
function buildToolMessageContent(toolName) {
	if (toolName) return `Tool call limit exceeded. Do not call '${toolName}' again.`;
	return "Tool call limit exceeded. Do not make additional tool calls.";
}
const VALID_EXIT_BEHAVIORS = [
	"continue",
	"error",
	"end"
];
const DEFAULT_EXIT_BEHAVIOR = "continue";
/**
* Build the final AI message content for 'end' behavior.
*
* This message is displayed to the user, so it should include detailed information
* about which limits were exceeded.
*
* @param threadCount - Current thread tool call count.
* @param runCount - Current run tool call count.
* @param threadLimit - Thread tool call limit (if set).
* @param runLimit - Run tool call limit (if set).
* @param toolName - Tool name being limited (if specific tool), or undefined for all tools.
* @returns A formatted message describing which limits were exceeded.
*/
function buildFinalAIMessageContent(threadCount, runCount, threadLimit, runLimit, toolName) {
	const toolDesc = toolName ? `'${toolName}' tool` : "Tool";
	const exceededLimits = [];
	if (threadLimit !== void 0 && threadCount > threadLimit) exceededLimits.push(`thread limit exceeded (${threadCount}/${threadLimit} calls)`);
	if (runLimit !== void 0 && runCount > runLimit) exceededLimits.push(`run limit exceeded (${runCount}/${runLimit} calls)`);
	return `${toolDesc} call limit reached: ${exceededLimits.join(" and ")}.`;
}
/**
* Schema for the exit behavior.
*/
const exitBehaviorSchema = zod_v3.z.enum(VALID_EXIT_BEHAVIORS).default(DEFAULT_EXIT_BEHAVIOR);
/**
* Exception raised when tool call limits are exceeded.
*
* This exception is raised when the configured exit behavior is 'error'
* and either the thread or run tool call limit has been exceeded.
*/
var ToolCallLimitExceededError = class extends Error {
	/**
	* Current thread tool call count.
	*/
	threadCount;
	/**
	* Current run tool call count.
	*/
	runCount;
	/**
	* Thread tool call limit (if set).
	*/
	threadLimit;
	/**
	* Run tool call limit (if set).
	*/
	runLimit;
	/**
	* Tool name being limited (if specific tool), or undefined for all tools.
	*/
	toolName;
	constructor(threadCount, runCount, threadLimit, runLimit, toolName = void 0) {
		const message = buildFinalAIMessageContent(threadCount, runCount, threadLimit, runLimit, toolName);
		super(message);
		this.name = "ToolCallLimitExceededError";
		this.threadCount = threadCount;
		this.runCount = runCount;
		this.threadLimit = threadLimit;
		this.runLimit = runLimit;
		this.toolName = toolName;
	}
};
/**
* Options for configuring the Tool Call Limit middleware.
*/
const ToolCallLimitOptionsSchema = zod_v3.z.object({
	toolName: zod_v3.z.string().optional(),
	threadLimit: zod_v3.z.number().optional(),
	runLimit: zod_v3.z.number().optional(),
	exitBehavior: exitBehaviorSchema
});
/**
* Middleware state schema to track the number of model calls made at the thread and run level.
*/
const stateSchema = zod_v3.z.object({
	threadToolCallCount: zod_v3.z.record(zod_v3.z.string(), zod_v3.z.number()).default({}),
	runToolCallCount: zod_v3.z.record(zod_v3.z.string(), zod_v3.z.number()).default({})
});
const DEFAULT_TOOL_COUNT_KEY = "__all__";
/**
* Middleware that tracks tool call counts and enforces limits.
*
* This middleware monitors the number of tool calls made during agent execution
* and can terminate the agent when specified limits are reached. It supports
* both thread-level and run-level call counting with configurable exit behaviors.
*
* Thread-level: The middleware counts all tool calls in the entire message history
* and persists this count across multiple runs (invocations) of the agent.
*
* Run-level: The middleware counts tool calls made after the last HumanMessage,
* representing the current run (invocation) of the agent.
*
* @param options - Configuration options for the middleware
* @param options.toolName - Name of the specific tool to limit. If undefined, limits apply to all tools.
* @param options.threadLimit - Maximum number of tool calls allowed per thread. undefined means no limit.
* @param options.runLimit - Maximum number of tool calls allowed per run. undefined means no limit.
* @param options.exitBehavior - What to do when limits are exceeded.
*   - "continue": Block exceeded tools with error messages, let other tools continue. Model decides when to end. (default)
*   - "error": Raise a ToolCallLimitExceededError exception
*   - "end": Stop execution immediately with a ToolMessage + AI message for the single tool call that exceeded the limit. Raises NotImplementedError if there are multiple tool calls.
*
* @throws {Error} If both limits are undefined, if exitBehavior is invalid, or if runLimit exceeds threadLimit.
* @throws {NotImplementedError} If exitBehavior is "end" and there are multiple tool calls.
*
* @example Continue execution with blocked tools (default)
* ```ts
* import { toolCallLimitMiddleware } from "@langchain/langchain/agents/middleware";
* import { createAgent } from "@langchain/langchain/agents";
*
* // Block exceeded tools but let other tools and model continue
* const limiter = toolCallLimitMiddleware({
*   threadLimit: 20,
*   runLimit: 10,
*   exitBehavior: "continue", // default
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   middleware: [limiter]
* });
* ```
*
* @example Stop immediately when limit exceeded
* ```ts
* // End execution immediately with an AI message
* const limiter = toolCallLimitMiddleware({
*   runLimit: 5,
*   exitBehavior: "end"
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   middleware: [limiter]
* });
* ```
*
* @example Raise exception on limit
* ```ts
* // Strict limit with exception handling
* const limiter = toolCallLimitMiddleware({
*   toolName: "search",
*   threadLimit: 5,
*   exitBehavior: "error"
* });
*
* const agent = createAgent({
*   model: "openai:gpt-4o",
*   middleware: [limiter]
* });
*
* try {
*   const result = await agent.invoke({ messages: [new HumanMessage("Task")] });
* } catch (error) {
*   if (error instanceof ToolCallLimitExceededError) {
*     console.log(`Search limit exceeded: ${error}`);
*   }
* }
* ```
*/
function toolCallLimitMiddleware(options) {
	/**
	* Validate that at least one limit is specified
	*/
	if (options.threadLimit === void 0 && options.runLimit === void 0) throw new Error("At least one limit must be specified (threadLimit or runLimit)");
	/**
	* Validate exitBehavior (Zod schema already validates, but provide helpful error)
	*/
	const exitBehavior = options.exitBehavior ?? DEFAULT_EXIT_BEHAVIOR;
	const parseResult = exitBehaviorSchema.safeParse(exitBehavior);
	if (!parseResult.success) throw new Error(zod_v4.z.prettifyError(parseResult.error).slice(2));
	/**
	* Validate that runLimit does not exceed threadLimit
	*/
	if (options.threadLimit !== void 0 && options.runLimit !== void 0 && options.runLimit > options.threadLimit) throw new Error(`runLimit (${options.runLimit}) cannot exceed threadLimit (${options.threadLimit}). The run limit should be less than or equal to the thread limit.`);
	return require_middleware.createMiddleware({
		name: options.toolName ? `ToolCallLimitMiddleware[${options.toolName}]` : "ToolCallLimitMiddleware",
		stateSchema,
		afterModel: {
			canJumpTo: ["end"],
			hook: (state) => {
				/**
				* Get the last AI message to check for tool calls
				*/
				const lastAIMessage = [...state.messages].reverse().find(_langchain_core_messages.AIMessage.isInstance);
				if (!lastAIMessage || !lastAIMessage.tool_calls) return;
				/**
				* Helper to check if limit would be exceeded by one more call
				*/
				const wouldExceedLimit = (threadCount, runCount) => {
					return options.threadLimit !== void 0 && threadCount + 1 > options.threadLimit || options.runLimit !== void 0 && runCount + 1 > options.runLimit;
				};
				/**
				* Helper to check if a tool call matches our filter
				*/
				const matchesToolFilter = (toolCall) => {
					return options.toolName === void 0 || toolCall.name === options.toolName;
				};
				/**
				* Separate tool calls into allowed and blocked based on limits
				*/
				const separateToolCalls = (toolCalls, threadCount, runCount) => {
					const allowed = [];
					const blocked = [];
					let tempThreadCount = threadCount;
					let tempRunCount = runCount;
					for (const toolCall of toolCalls) {
						if (!matchesToolFilter(toolCall)) continue;
						if (wouldExceedLimit(tempThreadCount, tempRunCount)) blocked.push(toolCall);
						else {
							allowed.push(toolCall);
							tempThreadCount += 1;
							tempRunCount += 1;
						}
					}
					return {
						allowed,
						blocked,
						finalThreadCount: tempThreadCount,
						finalRunCount: tempRunCount + blocked.length
					};
				};
				/**
				* Get the count key for this middleware instance
				*/
				const countKey = options.toolName ?? DEFAULT_TOOL_COUNT_KEY;
				/**
				* Get current counts
				*/
				const threadCounts = { ...state.threadToolCallCount ?? {} };
				const runCounts = { ...state.runToolCallCount ?? {} };
				const currentThreadCount = threadCounts[countKey] ?? 0;
				const currentRunCount = runCounts[countKey] ?? 0;
				/**
				* Separate tool calls into allowed and blocked
				*/
				const { allowed, blocked, finalThreadCount, finalRunCount } = separateToolCalls(lastAIMessage.tool_calls, currentThreadCount, currentRunCount);
				/**
				* Update counts:
				* - Thread count includes only allowed calls (blocked calls don't count towards thread-level tracking)
				* - Run count includes blocked calls since they were attempted in this run
				*/
				threadCounts[countKey] = finalThreadCount;
				runCounts[countKey] = finalRunCount;
				/**
				* If no tool calls are blocked, just update counts
				*/
				if (blocked.length === 0) {
					if (allowed.length > 0) return {
						threadToolCallCount: threadCounts,
						runToolCallCount: runCounts
					};
					return;
				}
				/**
				* Handle different exit behaviors
				*/
				if (exitBehavior === "error") throw new ToolCallLimitExceededError(finalThreadCount + blocked.length, finalRunCount, options.threadLimit, options.runLimit, options.toolName);
				/**
				* Build tool message content (sent to model - no thread/run details)
				*/
				const toolMsgContent = buildToolMessageContent(options.toolName);
				/**
				* Inject artificial error ToolMessages for blocked tool calls
				*/
				const artificialMessages = blocked.map((toolCall) => new _langchain_core_messages.ToolMessage({
					content: toolMsgContent,
					tool_call_id: toolCall.id,
					name: toolCall.name,
					status: "error"
				}));
				if (exitBehavior === "end") {
					/**
					* Check if there are tool calls to other tools that would continue executing
					* For tool-specific limiters: check for calls to other tools
					* For global limiters: check if there are multiple different tool types
					*/
					let otherTools = [];
					if (options.toolName !== void 0)
 /**
					* Tool-specific limiter: check for calls to other tools
					*/
					otherTools = lastAIMessage.tool_calls.filter((tc) => tc.name !== options.toolName);
					else if (new Set(lastAIMessage.tool_calls.map((tc) => tc.name).filter(Boolean)).size > 1)
 /**
					* Multiple different tool types - use allowed calls to show which ones
					*/
					otherTools = allowed.length > 0 ? allowed : lastAIMessage.tool_calls;
					if (otherTools.length > 0) {
						const toolNames = Array.from(new Set(otherTools.map((tc) => tc.name).filter(Boolean))).join(", ");
						throw new Error(`Cannot end execution with other tool calls pending. Found calls to: ${toolNames}. Use 'continue' or 'error' behavior instead.`);
					}
					const finalMsgContent = buildFinalAIMessageContent(finalThreadCount + blocked.length, finalRunCount, options.threadLimit, options.runLimit, options.toolName);
					artificialMessages.push(new _langchain_core_messages.AIMessage(finalMsgContent));
					return {
						threadToolCallCount: threadCounts,
						runToolCallCount: runCounts,
						jumpTo: "end",
						messages: artificialMessages
					};
				}
				/**
				* For exit_behavior="continue", return error messages to block exceeded tools
				*/
				return {
					threadToolCallCount: threadCounts,
					runToolCallCount: runCounts,
					messages: artificialMessages
				};
			}
		},
		afterAgent: () => ({ runToolCallCount: {} })
	});
}

//#endregion
exports.ToolCallLimitExceededError = ToolCallLimitExceededError;
exports.toolCallLimitMiddleware = toolCallLimitMiddleware;
//# sourceMappingURL=toolCallLimit.cjs.map