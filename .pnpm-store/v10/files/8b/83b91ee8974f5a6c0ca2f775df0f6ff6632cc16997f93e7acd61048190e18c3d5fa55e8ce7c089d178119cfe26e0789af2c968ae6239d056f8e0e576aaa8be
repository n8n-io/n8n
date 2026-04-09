"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamManager = void 0;
const messages_js_1 = require("./messages.cjs");
const traceable_js_1 = require("../../traceable.cjs");
const usage_js_1 = require("./usage.cjs");
/**
 * @internal
 */
class StreamManager {
    constructor() {
        Object.defineProperty(this, "namespaces", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "history", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "assistant", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "tools", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "postRunQueue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "runTrees", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        const rootRun = (0, traceable_js_1.getCurrentRunTree)(true);
        this.namespaces = rootRun?.createChild ? { root: rootRun } : {};
        this.history = { root: [] };
    }
    addMessage(message) {
        const eventTime = Date.now();
        // Short-circuit if no root run found
        // This can happen if tracing is disabled globally
        if (this.namespaces["root"] == null)
            return;
        if (message.type === "result") {
            if (message.modelUsage) {
                (0, usage_js_1.correctUsageFromResults)(message.modelUsage, Object.values(this.assistant).filter((runTree) => runTree != null));
            }
            const usage = message.modelUsage
                ? (0, usage_js_1.aggregateUsageFromModelUsage)(message.modelUsage)
                : (0, usage_js_1.extractUsageFromMessage)(message);
            if (message.total_cost_usd != null && usage != null) {
                usage.total_cost = message.total_cost_usd;
            }
            this.namespaces["root"].extra ??= {};
            this.namespaces["root"].extra.metadata ??= {};
            this.namespaces["root"].extra.metadata.usage_metadata = usage;
            this.namespaces["root"].extra.metadata.is_error = message.is_error;
            this.namespaces["root"].extra.metadata.num_turns = message.num_turns;
            this.namespaces["root"].extra.metadata.session_id = message.session_id;
            this.namespaces["root"].extra.metadata.duration_ms = message.duration_ms;
            this.namespaces["root"].extra.metadata.duration_api_ms =
                message.duration_api_ms;
        }
        // Skip non-user / non-assistant messages
        if (!("message" in message))
            return;
        const namespace = (() => {
            if ("parent_tool_use_id" in message)
                return message.parent_tool_use_id ?? "root";
            return "root";
        })();
        // `eventTime` records the time we receive an event, which for `includePartialMessages: false`
        // equals to the end time of an LLM block, so we need to use the first available end time within namespace.
        const candidateStartTime = this.namespaces[namespace]?.child_runs?.at(-1)?.end_time ??
            this.namespaces[namespace]?.start_time ??
            eventTime;
        this.history[namespace] ??= this.history["root"].slice();
        if (message.type === "assistant") {
            const messageId = message.message.id;
            this.assistant[messageId] ??= this.createChild(namespace, {
                name: "claude.assistant.turn",
                run_type: "llm",
                start_time: candidateStartTime,
                inputs: {
                    messages: (0, messages_js_1.convertFromAnthropicMessage)(this.history[namespace]),
                },
                outputs: { output: { messages: [] } },
            });
            if (this.assistant[messageId] == null)
                return;
            this.assistant[messageId].outputs = (() => {
                const prevMessages = this.assistant[messageId].outputs?.output.messages ?? [];
                const newMessages = (0, messages_js_1.convertFromAnthropicMessage)([message]);
                return { output: { messages: [...prevMessages, ...newMessages] } };
            })();
            this.assistant[messageId].end_time = eventTime;
            this.assistant[messageId].extra ??= {};
            this.assistant[messageId].extra.metadata ??= {};
            if (message.message.model != null) {
                this.assistant[messageId].extra.metadata.ls_model_name =
                    message.message.model;
            }
            this.assistant[messageId].extra.metadata.usage_metadata =
                (0, usage_js_1.extractUsageFromMessage)(message);
            const tools = Array.isArray(message.message.content)
                ? message.message.content.filter((block) => (0, messages_js_1.isToolBlock)(block))
                : [];
            for (const block of tools) {
                if ((0, messages_js_1.isTaskTool)(block)) {
                    const name = block.input.subagent_type ||
                        block.input.agent_type ||
                        (block.input.description
                            ? block.input.description.split(" ")[0]
                            : null) ||
                        "unknown-agent";
                    this.tools[block.id] ??=
                        this.createChild("root", {
                            name,
                            run_type: "chain",
                            inputs: block.input,
                            start_time: eventTime,
                        }) ?? this.tools[block.id];
                    this.namespaces[block.id] ??= this.tools[block.id];
                }
                else {
                    const name = block.name || "unknown-tool";
                    this.tools[block.id] ??=
                        this.createChild(namespace, {
                            name,
                            run_type: "tool",
                            inputs: block.input ? { input: block.input } : {},
                            start_time: eventTime,
                        }) ?? this.tools[block.id];
                }
            }
        }
        if (message.type === "user") {
            const toolResultBlocks = Array.isArray(message.message.content)
                ? message.message.content.filter((block) => "tool_use_id" in block)
                : [];
            const getToolOutput = (result) => {
                if (typeof result === "object" &&
                    result != null &&
                    !Array.isArray(result)) {
                    return result;
                }
                return { content: result };
            };
            const getToolError = (result) => {
                if (["string", "number", "boolean"].includes(typeof result)) {
                    return String(result);
                }
                return JSON.stringify(result);
            };
            for (const block of toolResultBlocks) {
                if (this.tools[block.tool_use_id] != null) {
                    // Previous versions of @anthropic-ai/claude-agent-sdk did provide
                    // tool result in `message.tool_use_result`, but at least since 0.2.50 it disappeared,
                    // so we rely on the last tool result block instead.
                    const result = message.tool_use_result != null && toolResultBlocks.length === 1
                        ? message.tool_use_result
                        : block.content;
                    const toolOutput = getToolOutput(result);
                    const toolError = "is_error" in block && block.is_error === true
                        ? getToolError(result)
                        : undefined;
                    void this.tools[block.tool_use_id]?.end(toolOutput, toolError);
                }
            }
        }
        this.history[namespace].push(message);
    }
    createChild(namespace, args) {
        const runTree = this.namespaces[namespace]?.createChild(args);
        if (runTree == null)
            return undefined;
        this.postRunQueue.push(runTree.postRun());
        this.runTrees.push(runTree);
        return runTree;
    }
    async finish() {
        // Clean up incomplete tools and subagent calls
        for (const tool of Object.values(this.tools)) {
            if (tool == null)
                continue;
            if (tool.outputs == null && tool.error == null) {
                void tool.end(undefined, "Run not completed (conversation ended)");
            }
        }
        // First make sure all the runs are created
        await Promise.allSettled(this.postRunQueue);
        // Then patch the runs
        await Promise.allSettled(this.runTrees.map((runTree) => runTree.patchRun()));
    }
}
exports.StreamManager = StreamManager;
