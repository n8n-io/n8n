"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapEvaluator = wrapEvaluator;
exports.evaluatedBy = evaluatedBy;
const traceable_js_1 = require("../../../traceable.cjs");
const globals_js_1 = require("../globals.cjs");
const uuid_1 = require("uuid");
function isEvaluationResult(x) {
    return (x != null &&
        typeof x === "object" &&
        "key" in x &&
        typeof x.key === "string" &&
        "score" in x);
}
function wrapEvaluator(evaluator) {
    return async (input, config) => {
        const context = globals_js_1.testWrapperAsyncLocalStorageInstance.getStore();
        if (context === undefined || context.currentExample === undefined) {
            throw new Error([
                `Could not identify current LangSmith context.`,
                `Please ensure you are calling this matcher within "ls.test()"`,
                `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
            ].join("\n"));
        }
        let evalRunId = config?.runId ?? config?.id ?? (0, uuid_1.v4)();
        let evalResult;
        if ((0, globals_js_1.trackingEnabled)(context)) {
            const wrappedEvaluator = (0, traceable_js_1.traceable)(async (_runTree, params) => {
                return evaluator(params);
            }, {
                id: evalRunId,
                trace_id: evalRunId,
                on_end: (runTree) => {
                    // If tracing with OTEL, setting run id manually does not work.
                    // Instead get it at the end of the run.
                    evalRunId = runTree.id;
                },
                reference_example_id: context.currentExample.id,
                client: context.client,
                tracingEnabled: true,
                name: evaluator.name ?? "<evaluator>",
                project_name: "evaluators",
                ...config,
                extra: {
                    ...config?.extra,
                    ls_otel_root: true,
                },
            });
            evalResult = await wrappedEvaluator(traceable_js_1.ROOT, input);
        }
        else {
            evalResult = await evaluator(input);
        }
        let normalizedResult;
        if (!Array.isArray(evalResult)) {
            normalizedResult = [evalResult];
        }
        else {
            normalizedResult = evalResult;
        }
        for (const result of normalizedResult) {
            if (isEvaluationResult(result)) {
                (0, globals_js_1._logTestFeedback)({
                    exampleId: context?.currentExample?.id,
                    feedback: result,
                    context,
                    runTree: context.testRootRunTree,
                    client: context.client,
                    sourceRunId: evalRunId,
                });
            }
        }
        return evalResult;
    };
}
async function evaluatedBy(outputs, evaluator) {
    const context = globals_js_1.testWrapperAsyncLocalStorageInstance.getStore();
    if (context === undefined || context.currentExample === undefined) {
        throw new Error([
            `Could not identify current LangSmith context.`,
            `Please ensure you are calling this matcher within "ls.test()"`,
            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
        ].join("\n"));
    }
    const wrappedEvaluator = wrapEvaluator(evaluator);
    const evalRunId = (0, uuid_1.v4)();
    const evalResult = await wrappedEvaluator({
        inputs: context.currentExample?.inputs ?? {},
        referenceOutputs: context?.currentExample?.outputs ?? {},
        outputs,
    }, { runId: evalRunId });
    if (Array.isArray(evalResult)) {
        return evalResult.map((result) => result.score);
    }
    return evalResult.score;
}
