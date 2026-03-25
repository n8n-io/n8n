"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeWithAutoPipelining = exports.getFirstValueInFlattenedArray = exports.shouldUseAutoPipelining = exports.notAllowedAutoPipelineCommands = exports.kCallbacks = exports.kExec = void 0;
const lodash_1 = require("./utils/lodash");
const calculateSlot = require("cluster-key-slot");
const standard_as_callback_1 = require("standard-as-callback");
exports.kExec = Symbol("exec");
exports.kCallbacks = Symbol("callbacks");
exports.notAllowedAutoPipelineCommands = [
    "auth",
    "info",
    "script",
    "quit",
    "cluster",
    "pipeline",
    "multi",
    "subscribe",
    "psubscribe",
    "unsubscribe",
    "unpsubscribe",
    "select",
];
function executeAutoPipeline(client, slotKey) {
    /*
      If a pipeline is already executing, keep queueing up commands
      since ioredis won't serve two pipelines at the same time
    */
    if (client._runningAutoPipelines.has(slotKey)) {
        return;
    }
    if (!client._autoPipelines.has(slotKey)) {
        /*
          Rare edge case. Somehow, something has deleted this running autopipeline in an immediate
          call to executeAutoPipeline.
         
          Maybe the callback in the pipeline.exec is sometimes called in the same tick,
          e.g. if redis is disconnected?
        */
        return;
    }
    client._runningAutoPipelines.add(slotKey);
    // Get the pipeline and immediately delete it so that new commands are queued on a new pipeline
    const pipeline = client._autoPipelines.get(slotKey);
    client._autoPipelines.delete(slotKey);
    const callbacks = pipeline[exports.kCallbacks];
    // Stop keeping a reference to callbacks immediately after the callbacks stop being used.
    // This allows the GC to reclaim objects referenced by callbacks, especially with 16384 slots
    // in Redis.Cluster
    pipeline[exports.kCallbacks] = null;
    // Perform the call
    pipeline.exec(function (err, results) {
        client._runningAutoPipelines.delete(slotKey);
        /*
          Invoke all callback in nextTick so the stack is cleared
          and callbacks can throw errors without affecting other callbacks.
        */
        if (err) {
            for (let i = 0; i < callbacks.length; i++) {
                process.nextTick(callbacks[i], err);
            }
        }
        else {
            for (let i = 0; i < callbacks.length; i++) {
                process.nextTick(callbacks[i], ...results[i]);
            }
        }
        // If there is another pipeline on the same node, immediately execute it without waiting for nextTick
        if (client._autoPipelines.has(slotKey)) {
            executeAutoPipeline(client, slotKey);
        }
    });
}
function shouldUseAutoPipelining(client, functionName, commandName) {
    return (functionName &&
        client.options.enableAutoPipelining &&
        !client.isPipeline &&
        !exports.notAllowedAutoPipelineCommands.includes(commandName) &&
        !client.options.autoPipeliningIgnoredCommands.includes(commandName));
}
exports.shouldUseAutoPipelining = shouldUseAutoPipelining;
function getFirstValueInFlattenedArray(args) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === "string") {
            return arg;
        }
        else if (Array.isArray(arg) || (0, lodash_1.isArguments)(arg)) {
            if (arg.length === 0) {
                continue;
            }
            return arg[0];
        }
        const flattened = [arg].flat();
        if (flattened.length > 0) {
            return flattened[0];
        }
    }
    return undefined;
}
exports.getFirstValueInFlattenedArray = getFirstValueInFlattenedArray;
function executeWithAutoPipelining(client, functionName, commandName, args, callback) {
    // On cluster mode let's wait for slots to be available
    if (client.isCluster && !client.slots.length) {
        if (client.status === "wait")
            client.connect().catch(lodash_1.noop);
        return (0, standard_as_callback_1.default)(new Promise(function (resolve, reject) {
            client.delayUntilReady((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                executeWithAutoPipelining(client, functionName, commandName, args, null).then(resolve, reject);
            });
        }), callback);
    }
    // If we have slot information, we can improve routing by grouping slots served by the same subset of nodes
    // Note that the first value in args may be a (possibly empty) array.
    // ioredis will only flatten one level of the array, in the Command constructor.
    const prefix = client.options.keyPrefix || "";
    const slotKey = client.isCluster
        ? client.slots[calculateSlot(`${prefix}${getFirstValueInFlattenedArray(args)}`)].join(",")
        : "main";
    if (!client._autoPipelines.has(slotKey)) {
        const pipeline = client.pipeline();
        pipeline[exports.kExec] = false;
        pipeline[exports.kCallbacks] = [];
        client._autoPipelines.set(slotKey, pipeline);
    }
    const pipeline = client._autoPipelines.get(slotKey);
    /*
      Mark the pipeline as scheduled.
      The symbol will make sure that the pipeline is only scheduled once per tick.
      New commands are appended to an already scheduled pipeline.
    */
    if (!pipeline[exports.kExec]) {
        pipeline[exports.kExec] = true;
        /*
          Deferring with setImmediate so we have a chance to capture multiple
          commands that can be scheduled by I/O events already in the event loop queue.
        */
        setImmediate(executeAutoPipeline, client, slotKey);
    }
    // Create the promise which will execute the command in the pipeline.
    const autoPipelinePromise = new Promise(function (resolve, reject) {
        pipeline[exports.kCallbacks].push(function (err, value) {
            if (err) {
                reject(err);
                return;
            }
            resolve(value);
        });
        if (functionName === "call") {
            args.unshift(commandName);
        }
        pipeline[functionName](...args);
    });
    return (0, standard_as_callback_1.default)(autoPipelinePromise, callback);
}
exports.executeWithAutoPipelining = executeWithAutoPipelining;
