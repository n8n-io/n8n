"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncExamplePromises = exports.evaluatorLogFeedbackPromises = exports.testWrapperAsyncLocalStorageInstance = exports.DEFAULT_TEST_CLIENT = void 0;
exports.trackingEnabled = trackingEnabled;
exports._logTestFeedback = _logTestFeedback;
const node_async_hooks_1 = require("node:async_hooks");
const client_js_1 = require("../../client.cjs");
const env_js_1 = require("../env.cjs");
const env_js_2 = require("../../env.cjs");
exports.DEFAULT_TEST_CLIENT = new client_js_1.Client();
exports.testWrapperAsyncLocalStorageInstance = new node_async_hooks_1.AsyncLocalStorage();
function trackingEnabled(context) {
    if (typeof context.enableTestTracking === "boolean") {
        return context.enableTestTracking;
    }
    if ((0, env_js_1.getEnvironmentVariable)("LANGSMITH_TEST_TRACKING") === "false") {
        return false;
    }
    return (0, env_js_2.isTracingEnabled)();
}
exports.evaluatorLogFeedbackPromises = new Set();
exports.syncExamplePromises = new Map();
function _logTestFeedback(params) {
    const { exampleId, feedback, context, runTree, client, sourceRunId } = params;
    if (trackingEnabled(context)) {
        if (exampleId === undefined) {
            throw new Error("Could not log feedback to LangSmith: missing example id. Please contact us for help.");
        }
        if (runTree === undefined) {
            throw new Error("Could not log feedback to LangSmith: missing run information. Please contact us for help.");
        }
        exports.evaluatorLogFeedbackPromises.add((async () => {
            await exports.syncExamplePromises.get(exampleId);
            await client?.logEvaluationFeedback(feedback, runTree, sourceRunId !== undefined
                ? { __run: { run_id: sourceRunId } }
                : undefined);
        })());
    }
    context.onFeedbackLogged?.(feedback);
}
