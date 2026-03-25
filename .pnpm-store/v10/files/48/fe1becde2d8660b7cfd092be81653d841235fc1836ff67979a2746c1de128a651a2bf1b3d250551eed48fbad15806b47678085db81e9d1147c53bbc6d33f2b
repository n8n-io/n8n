import { AsyncLocalStorage } from "node:async_hooks";
import { Client } from "../../client.js";
import { getEnvironmentVariable } from "../env.js";
import { isTracingEnabled } from "../../env.js";
export const DEFAULT_TEST_CLIENT = new Client();
export const testWrapperAsyncLocalStorageInstance = new AsyncLocalStorage();
export function trackingEnabled(context) {
    if (typeof context.enableTestTracking === "boolean") {
        return context.enableTestTracking;
    }
    if (getEnvironmentVariable("LANGSMITH_TEST_TRACKING") === "false") {
        return false;
    }
    return isTracingEnabled();
}
export const evaluatorLogFeedbackPromises = new Set();
export const syncExamplePromises = new Map();
export function _logTestFeedback(params) {
    const { exampleId, feedback, context, runTree, client, sourceRunId } = params;
    if (trackingEnabled(context)) {
        if (exampleId === undefined) {
            throw new Error("Could not log feedback to LangSmith: missing example id. Please contact us for help.");
        }
        if (runTree === undefined) {
            throw new Error("Could not log feedback to LangSmith: missing run information. Please contact us for help.");
        }
        evaluatorLogFeedbackPromises.add((async () => {
            await syncExamplePromises.get(exampleId);
            await client?.logEvaluationFeedback(feedback, runTree, sourceRunId !== undefined
                ? { __run: { run_id: sourceRunId } }
                : undefined);
        })());
    }
    context.onFeedbackLogged?.(feedback);
}
