"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT = exports.withRunTree = exports.isTraceableFunction = exports.getCurrentRunTree = void 0;
exports.traceable = traceable;
const node_async_hooks_1 = require("node:async_hooks");
const run_trees_js_1 = require("./run_trees.cjs");
const env_js_1 = require("./env.cjs");
const traceable_js_1 = require("./singletons/traceable.cjs");
const constants_js_1 = require("./singletons/constants.cjs");
const asserts_js_1 = require("./utils/asserts.cjs");
const env_js_2 = require("./utils/env.cjs");
const index_js_1 = require("./index.cjs");
const otel_js_1 = require("./singletons/otel.cjs");
const utils_js_1 = require("./experimental/otel/utils.cjs");
const constants_js_2 = require("./experimental/otel/constants.cjs");
traceable_js_1.AsyncLocalStorageProviderSingleton.initializeGlobalInstance(new node_async_hooks_1.AsyncLocalStorage());
/**
 * Create OpenTelemetry context manager from RunTree if OTEL is enabled.
 */
function maybeCreateOtelContext(runTree, projectName, tracer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) {
    if (!runTree || !(0, env_js_2.getOtelEnabled)()) {
        return;
    }
    const otel_trace = (0, otel_js_1.getOTELTrace)();
    try {
        const activeTraceId = otel_trace.getActiveSpan()?.spanContext()?.traceId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (fn) => {
            const resolvedTracer = tracer ?? otel_trace.getTracer("langsmith", index_js_1.__version__);
            const attributes = {
                [constants_js_2.LANGSMITH_TRACEABLE]: "true",
            };
            if (runTree.reference_example_id) {
                attributes[constants_js_2.LANGSMITH_REFERENCE_EXAMPLE_ID] =
                    runTree.reference_example_id;
            }
            if (projectName !== undefined) {
                attributes[constants_js_2.LANGSMITH_SESSION_NAME] = projectName;
            }
            const forceOTELRoot = runTree.extra?.ls_otel_root === true;
            return resolvedTracer.startActiveSpan(runTree.name, {
                attributes,
                root: forceOTELRoot,
            }, () => {
                if (activeTraceId === undefined || forceOTELRoot) {
                    const otelSpanId = otel_trace
                        .getActiveSpan()
                        ?.spanContext()?.spanId;
                    if (otelSpanId) {
                        const langsmithTraceId = (0, utils_js_1.getUuidFromOtelSpanId)(otelSpanId);
                        // Must refetch from our primary async local storage
                        const currentRunTree = (0, traceable_js_1.getCurrentRunTree)();
                        if (currentRunTree) {
                            // This is only for root runs to ensure that trace id
                            // and the root run id are returned correctly.
                            // This is important for things like leaving feedback on
                            // target function runs during evaluation.
                            currentRunTree.id = langsmithTraceId;
                            currentRunTree.trace_id = langsmithTraceId;
                        }
                    }
                }
                return fn();
            });
        };
    }
    catch {
        // Silent failure if OTEL setup is incomplete
        return;
    }
}
const runInputsToMap = (rawInputs) => {
    const firstInput = rawInputs[0];
    let inputs;
    if (firstInput === null) {
        inputs = { inputs: null };
    }
    else if (firstInput === undefined) {
        inputs = {};
    }
    else if (rawInputs.length > 1) {
        inputs = { args: rawInputs };
    }
    else if ((0, asserts_js_1.isKVMap)(firstInput)) {
        inputs = firstInput;
    }
    else {
        inputs = { input: firstInput };
    }
    return inputs;
};
const handleRunInputs = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
inputs, processInputs) => {
    try {
        return processInputs(inputs);
    }
    catch (e) {
        console.error("Error occurred during processInputs. Sending raw inputs:", e);
        return inputs;
    }
};
const _extractUsage = (runData) => {
    const usageMetadataFromMetadata = (runData.runTree.extra.metadata ?? {})
        .usage_metadata;
    return runData.outputs?.usage_metadata ?? usageMetadataFromMetadata;
};
async function handleEnd(params) {
    const { runTree, on_end, postRunPromise, deferredInputs } = params;
    const onEnd = on_end;
    if (onEnd) {
        onEnd(runTree);
    }
    await postRunPromise;
    if (deferredInputs) {
        await runTree?.postRun();
    }
    else {
        await runTree?.patchRun({
            excludeInputs: true,
        });
    }
}
const _populateUsageMetadata = (processedOutputs, runTree) => {
    if (runTree !== undefined) {
        let usageMetadata;
        try {
            usageMetadata = _extractUsage({ runTree, outputs: processedOutputs });
        }
        catch (e) {
            console.error("Error occurred while extracting usage metadata:", e);
        }
        if (usageMetadata !== undefined) {
            runTree.extra.metadata = {
                ...runTree.extra.metadata,
                usage_metadata: usageMetadata,
            };
            processedOutputs.usage_metadata = usageMetadata;
        }
    }
};
function isAsyncFn(fn) {
    return (fn != null &&
        typeof fn === "function" &&
        fn.constructor.name === "AsyncFunction");
}
// Note: This mutates the run tree
async function handleRunOutputs(params) {
    const { runTree, rawOutputs, processOutputsFn, on_end, postRunPromise, deferredInputs, skipChildPromiseDelay, } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let outputs;
    if ((0, asserts_js_1.isKVMap)(rawOutputs)) {
        outputs = { ...rawOutputs };
    }
    else {
        outputs = { outputs: rawOutputs };
    }
    const childRunEndPromises = !skipChildPromiseDelay &&
        (0, run_trees_js_1.isRunTree)(runTree) &&
        constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY in runTree &&
        Array.isArray(runTree[constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY])
        ? Promise.all(runTree[constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY] ?? [])
        : Promise.resolve();
    try {
        outputs = processOutputsFn(outputs);
        // TODO: Investigate making this behavior for all returned promises
        // on next minor bump.
        if (isAsyncFn(processOutputsFn)) {
            void outputs
                .then(async (processedOutputs) => {
                _populateUsageMetadata(processedOutputs, runTree);
                await childRunEndPromises;
                await runTree?.end(processedOutputs);
            })
                .catch(async (e) => {
                console.error("Error occurred during processOutputs. Sending unprocessed outputs:", e);
                try {
                    await childRunEndPromises;
                    await runTree?.end(outputs);
                }
                catch (e) {
                    console.error("Error occurred during runTree?.end.", e);
                }
            })
                .finally(async () => {
                try {
                    await handleEnd({
                        runTree,
                        postRunPromise,
                        on_end,
                        deferredInputs,
                    });
                }
                catch (e) {
                    console.error("Error occurred during handleEnd.", e);
                }
            });
            return;
        }
    }
    catch (e) {
        console.error("Error occurred during processOutputs. Sending unprocessed outputs:", e);
    }
    _populateUsageMetadata(outputs, runTree);
    void childRunEndPromises
        .then(async () => {
        try {
            await runTree?.end(outputs);
            await handleEnd({ runTree, postRunPromise, on_end, deferredInputs });
        }
        catch (e) {
            console.error(e);
        }
    })
        .catch((e) => {
        console.error("Error occurred during childRunEndPromises.then. This should never happen.", e);
    });
    return;
}
const handleRunAttachments = (rawInputs, extractAttachments) => {
    if (!extractAttachments) {
        return [undefined, rawInputs];
    }
    try {
        const [attachments, remainingArgs] = extractAttachments(...rawInputs);
        return [attachments, remainingArgs];
    }
    catch (e) {
        console.error("Error occurred during extractAttachments:", e);
        return [undefined, rawInputs];
    }
};
const getTracingRunTree = (runTree, inputs, getInvocationParams, processInputs, extractAttachments) => {
    if (!(0, env_js_1.isTracingEnabled)(runTree.tracingEnabled)) {
        return {};
    }
    const [attached, args] = handleRunAttachments(inputs, extractAttachments);
    runTree.attachments = attached;
    const processedInputs = handleRunInputs(args, processInputs);
    if (isAsyncFn(processInputs)) {
        runTree._awaitInputsOnPost = true;
    }
    runTree.inputs = processedInputs;
    const invocationParams = getInvocationParams?.(...inputs);
    if (invocationParams != null) {
        runTree.extra ??= {};
        runTree.extra.metadata = {
            ...invocationParams,
            ...runTree.extra.metadata,
        };
    }
    return runTree;
};
// idea: store the state of the promise outside
// but only when the promise is "consumed"
const getSerializablePromise = (arg) => {
    const proxyState = { current: undefined };
    const promiseProxy = new Proxy(arg, {
        get(target, prop, receiver) {
            if (prop === "then") {
                const boundThen = arg[prop].bind(arg);
                return (resolve, reject = (x) => {
                    throw x;
                }) => {
                    return boundThen((value) => {
                        proxyState.current = ["resolve", value];
                        return resolve(value);
                    }, (error) => {
                        proxyState.current = ["reject", error];
                        return reject(error);
                    });
                };
            }
            if (prop === "catch") {
                const boundCatch = arg[prop].bind(arg);
                return (reject) => {
                    return boundCatch((error) => {
                        proxyState.current = ["reject", error];
                        return reject(error);
                    });
                };
            }
            if (prop === "toJSON") {
                return () => {
                    if (!proxyState.current)
                        return undefined;
                    const [type, value] = proxyState.current ?? [];
                    if (type === "resolve")
                        return value;
                    return { error: value };
                };
            }
            return Reflect.get(target, prop, receiver);
        },
    });
    return promiseProxy;
};
const convertSerializableArg = (arg, options) => {
    if ((0, asserts_js_1.isReadableStream)(arg)) {
        const proxyState = [];
        const transform = new TransformStream({
            start: () => void 0,
            transform: (chunk, controller) => {
                proxyState.push(chunk);
                controller.enqueue(chunk);
            },
            flush: () => void 0,
        });
        const pipeThrough = arg.pipeThrough(transform);
        Object.assign(pipeThrough, { toJSON: () => proxyState });
        return { converted: pipeThrough, deferredInputs: true };
    }
    if ((0, asserts_js_1.isAsyncIterable)(arg)) {
        const proxyState = { current: [] };
        const converted = new Proxy(arg, {
            get(target, prop, receiver) {
                if (prop === Symbol.asyncIterator) {
                    return () => {
                        const boundIterator = arg[Symbol.asyncIterator].bind(arg);
                        const iterator = boundIterator();
                        return new Proxy(iterator, {
                            get(target, prop, receiver) {
                                if (prop === "next" || prop === "return" || prop === "throw") {
                                    const bound = iterator.next.bind(iterator);
                                    return (...args) => {
                                        const wrapped = getSerializablePromise(
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        bound(...args));
                                        proxyState.current.push(wrapped);
                                        return wrapped;
                                    };
                                }
                                if (prop === "return" || prop === "throw") {
                                    return iterator.next.bind(iterator);
                                }
                                return Reflect.get(target, prop, receiver);
                            },
                        });
                    };
                }
                if (prop === "toJSON") {
                    return () => {
                        const onlyNexts = proxyState.current;
                        const serialized = onlyNexts.map((next) => next.toJSON());
                        const chunks = serialized.reduce((memo, next) => {
                            if (next?.value)
                                memo.push(next.value);
                            return memo;
                        }, []);
                        return chunks;
                    };
                }
                return Reflect.get(target, prop, receiver);
            },
        });
        return { converted, deferredInputs: true };
    }
    if (!Array.isArray(arg) && (0, asserts_js_1.isIteratorLike)(arg)) {
        const proxyState = [];
        const converted = new Proxy(arg, {
            get(target, prop, receiver) {
                if (prop === "next" || prop === "return" || prop === "throw") {
                    const bound = arg[prop]?.bind(arg);
                    return (...args) => {
                        const next = bound?.(...args);
                        if (next != null)
                            proxyState.push(next);
                        return next;
                    };
                }
                if (prop === "toJSON") {
                    return () => {
                        const chunks = proxyState.reduce((memo, next) => {
                            if (next.value)
                                memo.push(next.value);
                            return memo;
                        }, []);
                        return chunks;
                    };
                }
                return Reflect.get(target, prop, receiver);
            },
        });
        return { converted, deferredInputs: true };
    }
    if ((0, asserts_js_1.isThenable)(arg)) {
        return {
            converted: getSerializablePromise(arg),
            deferredInputs: true,
        };
    }
    const maxDepth = options?.maxDepth ?? 0;
    const currentDepth = options?.depth ?? 0;
    if (currentDepth < maxDepth) {
        if (Array.isArray(arg)) {
            const converted = [];
            let deferredInputs = false;
            for (let i = 0; i < arg.length; i++) {
                const res = convertSerializableArg(arg[i], {
                    depth: currentDepth + 1,
                    maxDepth,
                });
                converted.push(res.converted);
                deferredInputs = deferredInputs || res.deferredInputs;
            }
            return { converted, deferredInputs };
        }
        if (typeof arg === "object" && arg != null) {
            const converted = {};
            let deferredInputs = false;
            for (const key in arg) {
                if (Object.prototype.hasOwnProperty.call(arg, key)) {
                    const res = convertSerializableArg(arg[key], {
                        ...options,
                        depth: currentDepth + 1,
                    });
                    converted[key] = res.converted;
                    deferredInputs = deferredInputs || res.deferredInputs;
                }
            }
            return { converted, deferredInputs };
        }
    }
    return { converted: arg, deferredInputs: false };
};
/**
 * Higher-order function that takes function as input and returns a
 * "TraceableFunction" - a wrapped version of the input that
 * automatically handles tracing. If the returned traceable function calls any
 * traceable functions, those are automatically traced as well.
 *
 * The returned TraceableFunction can accept a run tree or run tree config as
 * its first argument. If omitted, it will default to the caller's run tree,
 * or will be treated as a root run.
 *
 * @param wrappedFunc Targeted function to be traced
 * @param config Additional metadata such as name, tags or providing
 *     a custom LangSmith client instance
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function traceable(wrappedFunc, config) {
    const { aggregator, argsConfigPath, __finalTracedIteratorKey, processInputs, processOutputs, extractAttachments, ...runTreeConfig } = config ?? {};
    const processInputsFn = processInputs ?? ((x) => x);
    const processOutputsFn = processOutputs ?? ((x) => x);
    const extractAttachmentsFn = extractAttachments ?? ((...x) => [undefined, runInputsToMap(x)]);
    const traceableFunc = (...args) => {
        let ensuredConfig;
        try {
            let runtimeConfig;
            if (argsConfigPath) {
                const [index, path] = argsConfigPath;
                if (index === args.length - 1 && !path) {
                    runtimeConfig = args.pop();
                }
                else if (index <= args.length &&
                    typeof args[index] === "object" &&
                    args[index] !== null) {
                    if (path) {
                        const { [path]: extracted, ...rest } = args[index];
                        runtimeConfig = extracted;
                        args[index] = rest;
                    }
                    else {
                        runtimeConfig = args[index];
                        args.splice(index, 1);
                    }
                }
            }
            ensuredConfig = {
                name: wrappedFunc.name || "<lambda>",
                ...runTreeConfig,
                ...runtimeConfig,
                tags: [
                    ...new Set([
                        ...(runTreeConfig?.tags ?? []),
                        ...(runtimeConfig?.tags ?? []),
                    ]),
                ],
                metadata: {
                    ...runTreeConfig?.metadata,
                    ...runtimeConfig?.metadata,
                },
            };
        }
        catch (err) {
            console.warn(`Failed to extract runtime config from args for ${runTreeConfig?.name ?? wrappedFunc.name}`, err);
            ensuredConfig = {
                name: wrappedFunc.name || "<lambda>",
                ...runTreeConfig,
            };
        }
        let runEndedPromiseResolver;
        const runEndedPromise = new Promise((resolve) => {
            runEndedPromiseResolver = resolve;
        });
        const on_end = (runTree) => {
            if (config?.on_end) {
                if (!runTree) {
                    console.warn("Can not call 'on_end' if currentRunTree is undefined");
                }
                else {
                    config.on_end(runTree);
                }
            }
            runEndedPromiseResolver();
        };
        const asyncLocalStorage = traceable_js_1.AsyncLocalStorageProviderSingleton.getInstance();
        const processedArgs = args;
        let deferredInputs = false;
        for (let i = 0; i < processedArgs.length; i++) {
            const { converted, deferredInputs: argDefersInput } = convertSerializableArg(processedArgs[i], config?.__deferredSerializableArgOptions);
            processedArgs[i] = converted;
            deferredInputs = deferredInputs || argDefersInput;
        }
        const [currentContext, rawInputs] = (() => {
            const [firstArg, ...restArgs] = processedArgs;
            // used for handoff between LangChain.JS and traceable functions
            if ((0, run_trees_js_1.isRunnableConfigLike)(firstArg)) {
                return [
                    getTracingRunTree(run_trees_js_1.RunTree.fromRunnableConfig(firstArg, ensuredConfig), restArgs, config?.getInvocationParams, processInputsFn, extractAttachmentsFn),
                    restArgs,
                ];
            }
            // deprecated: legacy CallbackManagerRunTree used in runOnDataset
            // override ALS and do not pass-through the run tree
            if ((0, run_trees_js_1.isRunTree)(firstArg) &&
                "callbackManager" in firstArg &&
                firstArg.callbackManager != null) {
                return [firstArg, restArgs];
            }
            // when ALS is unreliable, users can manually
            // pass in the run tree
            if (firstArg === traceable_js_1.ROOT || (0, run_trees_js_1.isRunTree)(firstArg)) {
                const currentRunTree = getTracingRunTree(firstArg === traceable_js_1.ROOT
                    ? new run_trees_js_1.RunTree(ensuredConfig)
                    : firstArg.createChild(ensuredConfig), restArgs, config?.getInvocationParams, processInputsFn, extractAttachmentsFn);
                return [currentRunTree, [currentRunTree, ...restArgs]];
            }
            // Node.JS uses AsyncLocalStorage (ALS) and AsyncResource
            // to allow storing context
            const prevRunFromStore = asyncLocalStorage.getStore();
            let lc_contextVars;
            // If a context var is set by LangChain outside of a traceable,
            // it will be an object with a single property and we should copy
            // context vars over into the new run tree.
            if (prevRunFromStore !== undefined &&
                constants_js_1._LC_CONTEXT_VARIABLES_KEY in prevRunFromStore) {
                lc_contextVars = prevRunFromStore[constants_js_1._LC_CONTEXT_VARIABLES_KEY];
            }
            if ((0, run_trees_js_1.isRunTree)(prevRunFromStore)) {
                if (constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY in prevRunFromStore &&
                    Array.isArray(prevRunFromStore[constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY])) {
                    prevRunFromStore[constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY].push(runEndedPromise);
                }
                else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    prevRunFromStore[constants_js_1._LC_CHILD_RUN_END_PROMISES_KEY] = [
                        runEndedPromise,
                    ];
                }
                const currentRunTree = getTracingRunTree(prevRunFromStore.createChild(ensuredConfig), processedArgs, config?.getInvocationParams, processInputsFn, extractAttachmentsFn);
                if (lc_contextVars) {
                    (currentRunTree ?? {})[constants_js_1._LC_CONTEXT_VARIABLES_KEY] = lc_contextVars;
                }
                return [currentRunTree, processedArgs];
            }
            const currentRunTree = getTracingRunTree(new run_trees_js_1.RunTree(ensuredConfig), processedArgs, config?.getInvocationParams, processInputsFn, extractAttachmentsFn);
            if (lc_contextVars) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (currentRunTree ?? {})[constants_js_1._LC_CONTEXT_VARIABLES_KEY] =
                    lc_contextVars;
            }
            return [currentRunTree, processedArgs];
        })();
        const currentRunTree = (0, run_trees_js_1.isRunTree)(currentContext)
            ? currentContext
            : undefined;
        const otelContextManager = maybeCreateOtelContext(currentRunTree, config?.project_name, config?.tracer);
        const otel_context = (0, otel_js_1.getOTELContext)();
        const runWithContext = () => {
            const postRunPromise = !deferredInputs
                ? currentRunTree?.postRun()
                : Promise.resolve();
            async function handleChunks(chunks) {
                if (aggregator !== undefined) {
                    try {
                        return await aggregator(chunks);
                    }
                    catch (e) {
                        console.error(`[ERROR]: LangSmith aggregation failed: `, e);
                    }
                }
                return chunks;
            }
            function tapReadableStreamForTracing(stream, snapshot) {
                const reader = stream.getReader();
                let finished = false;
                const chunks = [];
                const capturedOtelContext = otel_context.active();
                const tappedStream = new ReadableStream({
                    async start(controller) {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            const result = await (snapshot
                                ? snapshot(() => otel_context.with(capturedOtelContext, () => reader.read()))
                                : otel_context.with(capturedOtelContext, () => reader.read()));
                            if (result.done) {
                                finished = true;
                                await handleRunOutputs({
                                    runTree: currentRunTree,
                                    rawOutputs: await handleChunks(chunks),
                                    processOutputsFn,
                                    on_end,
                                    postRunPromise,
                                    deferredInputs,
                                });
                                controller.close();
                                break;
                            }
                            chunks.push(result.value);
                            // Add new_token event for streaming LLM runs
                            if (currentRunTree && currentRunTree.run_type === "llm") {
                                currentRunTree.addEvent({
                                    name: "new_token",
                                    kwargs: { token: result.value },
                                });
                            }
                            controller.enqueue(result.value);
                        }
                    },
                    async cancel(reason) {
                        if (!finished)
                            await currentRunTree?.end(undefined, "Cancelled");
                        await handleRunOutputs({
                            runTree: currentRunTree,
                            rawOutputs: await handleChunks(chunks),
                            processOutputsFn,
                            on_end,
                            postRunPromise,
                            deferredInputs,
                        });
                        return reader.cancel(reason);
                    },
                });
                return tappedStream;
            }
            async function* wrapAsyncIteratorForTracing(iterator, snapshot) {
                let finished = false;
                let hasError = false;
                const chunks = [];
                const capturedOtelContext = otel_context.active();
                try {
                    while (true) {
                        const { value, done } = await (snapshot
                            ? snapshot(() => otel_context.with(capturedOtelContext, () => iterator.next()))
                            : otel_context.with(capturedOtelContext, () => iterator.next()));
                        if (done) {
                            finished = true;
                            break;
                        }
                        chunks.push(value);
                        // Add new_token event for streaming LLM runs
                        if (currentRunTree && currentRunTree.run_type === "llm") {
                            currentRunTree.addEvent({
                                name: "new_token",
                                kwargs: { token: value },
                            });
                        }
                        yield value;
                    }
                }
                catch (e) {
                    hasError = true;
                    await currentRunTree?.end(undefined, String(e));
                    throw e;
                }
                finally {
                    if (!finished) {
                        // Call return() on the original iterator to trigger cleanup
                        if (iterator.return) {
                            await iterator.return(undefined);
                        }
                        await currentRunTree?.end(undefined, "Cancelled");
                    }
                    await handleRunOutputs({
                        runTree: currentRunTree,
                        rawOutputs: await handleChunks(chunks),
                        processOutputsFn,
                        on_end,
                        postRunPromise,
                        deferredInputs,
                        skipChildPromiseDelay: hasError || !finished,
                    });
                }
            }
            function wrapAsyncGeneratorForTracing(iterable, snapshot) {
                if ((0, asserts_js_1.isReadableStream)(iterable)) {
                    return tapReadableStreamForTracing(iterable, snapshot);
                }
                const iterator = iterable[Symbol.asyncIterator]();
                const wrappedIterator = wrapAsyncIteratorForTracing(iterator, snapshot);
                iterable[Symbol.asyncIterator] = () => wrappedIterator;
                return iterable;
            }
            function gatherAll(iterator) {
                const chunks = [];
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const next = iterator.next();
                    chunks.push(next);
                    if (next.done)
                        break;
                }
                return chunks;
            }
            let returnValue;
            try {
                returnValue = wrappedFunc(...rawInputs);
            }
            catch (err) {
                returnValue = Promise.reject(err);
            }
            if ((0, asserts_js_1.isAsyncIterable)(returnValue)) {
                const snapshot = node_async_hooks_1.AsyncLocalStorage.snapshot();
                return wrapAsyncGeneratorForTracing(returnValue, snapshot);
            }
            if (!Array.isArray(returnValue) &&
                typeof returnValue === "object" &&
                returnValue != null &&
                __finalTracedIteratorKey !== undefined &&
                (0, asserts_js_1.isAsyncIterable)(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                returnValue[__finalTracedIteratorKey])) {
                const snapshot = node_async_hooks_1.AsyncLocalStorage.snapshot();
                return {
                    ...returnValue,
                    [__finalTracedIteratorKey]: wrapAsyncGeneratorForTracing(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    returnValue[__finalTracedIteratorKey], snapshot),
                };
            }
            const tracedPromise = new Promise((resolve, reject) => {
                Promise.resolve(returnValue)
                    .then(async (rawOutput) => {
                    if ((0, asserts_js_1.isAsyncIterable)(rawOutput)) {
                        const snapshot = node_async_hooks_1.AsyncLocalStorage.snapshot();
                        return resolve(wrapAsyncGeneratorForTracing(rawOutput, snapshot));
                    }
                    if (!Array.isArray(rawOutput) &&
                        typeof rawOutput === "object" &&
                        rawOutput != null &&
                        __finalTracedIteratorKey !== undefined &&
                        (0, asserts_js_1.isAsyncIterable)(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        rawOutput[__finalTracedIteratorKey])) {
                        const snapshot = node_async_hooks_1.AsyncLocalStorage.snapshot();
                        return {
                            ...rawOutput,
                            [__finalTracedIteratorKey]: wrapAsyncGeneratorForTracing(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            rawOutput[__finalTracedIteratorKey], snapshot),
                        };
                    }
                    if ((0, asserts_js_1.isGenerator)(wrappedFunc) && (0, asserts_js_1.isIteratorLike)(rawOutput)) {
                        const chunks = gatherAll(rawOutput);
                        try {
                            await handleRunOutputs({
                                runTree: currentRunTree,
                                rawOutputs: await handleChunks(chunks.reduce((memo, { value, done }) => {
                                    if (!done || typeof value !== "undefined") {
                                        memo.push(value);
                                    }
                                    return memo;
                                }, [])),
                                processOutputsFn,
                                on_end,
                                postRunPromise,
                                deferredInputs,
                            });
                        }
                        catch (e) {
                            console.error("[LANGSMITH]: Error occurred while handling run outputs:", e);
                        }
                        return (function* () {
                            for (const ret of chunks) {
                                if (ret.done)
                                    return ret.value;
                                yield ret.value;
                            }
                        })();
                    }
                    try {
                        await handleRunOutputs({
                            runTree: currentRunTree,
                            rawOutputs: rawOutput,
                            processOutputsFn,
                            on_end,
                            postRunPromise,
                            deferredInputs,
                        });
                    }
                    finally {
                        // eslint-disable-next-line no-unsafe-finally
                        return rawOutput;
                    }
                }, async (error) => {
                    // Don't wait for child runs on error - fail fast
                    await currentRunTree?.end(undefined, String(error));
                    await handleEnd({
                        runTree: currentRunTree,
                        postRunPromise,
                        on_end,
                        deferredInputs,
                    });
                    throw error;
                })
                    .then(resolve, reject);
            });
            if (typeof returnValue !== "object" || returnValue === null) {
                return tracedPromise;
            }
            return new Proxy(returnValue, {
                get(target, prop, receiver) {
                    if ((0, asserts_js_1.isPromiseMethod)(prop)) {
                        return tracedPromise[prop].bind(tracedPromise);
                    }
                    return Reflect.get(target, prop, receiver);
                },
            });
        };
        // Wrap with OTEL context if available, similar to Python's implementation
        if (otelContextManager) {
            return asyncLocalStorage.run(currentContext, () => otelContextManager(runWithContext));
        }
        else {
            return asyncLocalStorage.run(currentContext, runWithContext);
        }
    };
    Object.defineProperty(traceableFunc, "langsmith:traceable", {
        value: runTreeConfig,
    });
    return traceableFunc;
}
var traceable_js_2 = require("./singletons/traceable.cjs");
Object.defineProperty(exports, "getCurrentRunTree", { enumerable: true, get: function () { return traceable_js_2.getCurrentRunTree; } });
Object.defineProperty(exports, "isTraceableFunction", { enumerable: true, get: function () { return traceable_js_2.isTraceableFunction; } });
Object.defineProperty(exports, "withRunTree", { enumerable: true, get: function () { return traceable_js_2.withRunTree; } });
Object.defineProperty(exports, "ROOT", { enumerable: true, get: function () { return traceable_js_2.ROOT; } });
