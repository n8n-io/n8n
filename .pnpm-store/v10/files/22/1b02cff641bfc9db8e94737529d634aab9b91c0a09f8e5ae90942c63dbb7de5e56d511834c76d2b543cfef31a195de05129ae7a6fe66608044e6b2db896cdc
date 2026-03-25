"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnableTraceable = void 0;
exports.getLangchainCallbacks = getLangchainCallbacks;
// These `@langchain/core` imports are intentionally not peer dependencies
// to avoid package manager issues around circular dependencies.
// eslint-disable-next-line import/no-extraneous-dependencies
const manager_1 = require("@langchain/core/callbacks/manager");
// eslint-disable-next-line import/no-extraneous-dependencies
const tracer_langchain_1 = require("@langchain/core/tracers/tracer_langchain");
// eslint-disable-next-line import/no-extraneous-dependencies
const runnables_1 = require("@langchain/core/runnables");
const traceable_js_1 = require("./traceable.cjs");
const asserts_js_1 = require("./utils/asserts.cjs");
/**
 * Converts the current run tree active within a traceable-wrapped function
 * into a LangChain compatible callback manager. This is useful to handoff tracing
 * from LangSmith to LangChain Runnables and LLMs.
 *
 * @param {RunTree | undefined} currentRunTree Current RunTree from within a traceable-wrapped function. If not provided, the current run tree will be inferred from AsyncLocalStorage.
 * @returns {CallbackManager | undefined} Callback manager used by LangChain Runnable objects.
 */
async function getLangchainCallbacks(currentRunTree) {
    const runTree = currentRunTree ?? (0, traceable_js_1.getCurrentRunTree)();
    if (!runTree)
        return undefined;
    // TODO: CallbackManager.configure() is only async due to LangChainTracer
    // factory being unnecessarily async.
    let callbacks = await manager_1.CallbackManager.configure();
    if (!callbacks && runTree.tracingEnabled) {
        callbacks = new manager_1.CallbackManager();
    }
    let langChainTracer = callbacks?.handlers.find((handler) => handler?.name === "langchain_tracer");
    if (!langChainTracer && runTree.tracingEnabled) {
        langChainTracer = new tracer_langchain_1.LangChainTracer();
        callbacks?.addHandler(langChainTracer);
    }
    const runMap = new Map();
    // find upward root run
    let rootRun = runTree;
    const rootVisited = new Set();
    while (rootRun.parent_run) {
        if (rootVisited.has(rootRun.id))
            break;
        rootVisited.add(rootRun.id);
        rootRun = rootRun.parent_run;
    }
    const queue = [rootRun];
    const visited = new Set();
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current.id))
            continue;
        visited.add(current.id);
        runMap.set(current.id, current);
        if (current.child_runs) {
            queue.push(...current.child_runs);
        }
    }
    if (callbacks != null) {
        Object.assign(callbacks, { _parentRunId: runTree.id });
    }
    if (langChainTracer != null) {
        if ("updateFromRunTree" in langChainTracer &&
            typeof langChainTracer === "function") {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore @langchain/core can use a different version of LangSmith
            langChainTracer.updateFromRunTree(runTree);
        }
        else {
            Object.assign(langChainTracer, {
                runMap,
                client: runTree.client,
                projectName: runTree.project_name || langChainTracer.projectName,
                exampleId: runTree.reference_example_id || langChainTracer.exampleId,
            });
        }
    }
    return callbacks;
}
/**
 * RunnableTraceable is a Runnable that wraps a traceable function.
 * This allows adding Langsmith traced functions into LangChain sequences.
 * @deprecated Wrap or pass directly instead.
 */
class RunnableTraceable extends runnables_1.Runnable {
    constructor(fields) {
        super(fields);
        Object.defineProperty(this, "lc_serializable", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lc_namespace", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: ["langchain_core", "runnables"]
        });
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (!(0, traceable_js_1.isTraceableFunction)(fields.func)) {
            throw new Error("RunnableTraceable requires a function that is wrapped in traceable higher-order function");
        }
        this.func = fields.func;
    }
    async invoke(input, options) {
        const [config] = this._getOptionsList(options ?? {}, 1);
        const callbacks = await (0, runnables_1.getCallbackManagerForConfig)(config);
        // Avoid start time ties - this is old, deprecated code used only in tests
        // and recent perf improvements have made this necessary.
        await new Promise((resolve) => setImmediate(resolve));
        return (await this.func((0, runnables_1.patchConfig)(config, { callbacks }), input));
    }
    async *_streamIterator(input, options) {
        const result = await this.invoke(input, options);
        if ((0, asserts_js_1.isAsyncIterable)(result)) {
            for await (const item of result) {
                yield item;
            }
            return;
        }
        if ((0, asserts_js_1.isIteratorLike)(result)) {
            while (true) {
                const state = result.next();
                if (state.done)
                    break;
                yield state.value;
            }
            return;
        }
        yield result;
    }
    static from(func) {
        return new RunnableTraceable({ func });
    }
}
exports.RunnableTraceable = RunnableTraceable;
