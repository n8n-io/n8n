import { convertFromAnthropicMessage, isTaskTool, isToolBlock, } from "./messages.js";
import { getCurrentRunTree } from "../../traceable.js";
import { aggregateUsageFromModelUsage, correctUsageFromResults, extractUsageFromMessage, } from "./usage.js";
/**
 * @internal
 */
export class StreamManager {
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
        const rootRun = getCurrentRunTree(true);
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
                correctUsageFromResults(message.modelUsage, Object.values(this.assistant));
            }
            const usage = message.modelUsage
                ? aggregateUsageFromModelUsage(message.modelUsage)
                : extractUsageFromMessage(message);
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
                    messages: convertFromAnthropicMessage(this.history[namespace]),
                },
                outputs: { output: { messages: [] } },
            });
            this.assistant[messageId].outputs = (() => {
                const prevMessages = this.assistant[messageId].outputs?.output.messages ?? [];
                const newMessages = convertFromAnthropicMessage([message]);
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
                extractUsageFromMessage(message);
            const tools = Array.isArray(message.message.content)
                ? message.message.content.filter((block) => isToolBlock(block))
                : [];
            for (const block of tools) {
                if (isTaskTool(block)) {
                    const name = block.input.subagent_type ||
                        block.input.agent_type ||
                        (block.input.description
                            ? block.input.description.split(" ")[0]
                            : null) ||
                        "unknown-agent";
                    this.tools[block.id] ??= this.createChild("root", {
                        name,
                        run_type: "chain",
                        inputs: block.input,
                        start_time: eventTime,
                    });
                    this.namespaces[block.id] ??= this.tools[block.id];
                }
                else {
                    const name = block.name || "unknown-tool";
                    this.tools[block.id] ??= this.createChild(namespace, {
                        name,
                        run_type: "tool",
                        inputs: block.input ? { input: block.input } : {},
                        start_time: eventTime,
                    });
                }
            }
        }
        if (message.type === "user") {
            if (message.tool_use_result) {
                const toolResult = Array.isArray(message.message.content)
                    ? message.message.content.find((block) => "tool_use_id" in block)
                    : undefined;
                if (toolResult?.tool_use_id &&
                    this.tools[toolResult.tool_use_id] != null) {
                    const toolOutput = Array.isArray(message.tool_use_result)
                        ? { content: message.tool_use_result }
                        : message.tool_use_result;
                    const toolError = "is_error" in toolResult && toolResult.is_error === true
                        ? ["string", "number", "boolean"].includes(typeof message.tool_use_result)
                            ? String(message.tool_use_result)
                            : JSON.stringify(message.tool_use_result)
                        : undefined;
                    void this.tools[toolResult.tool_use_id].end(toolOutput, toolError);
                }
            }
        }
        this.history[namespace].push(message);
    }
    createChild(namespace, args) {
        const runTree = this.namespaces[namespace].createChild(args);
        this.postRunQueue.push(runTree.postRun());
        this.runTrees.push(runTree);
        return runTree;
    }
    async finish() {
        // Clean up incomplete tools and subagent calls
        for (const tool of Object.values(this.tools)) {
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
