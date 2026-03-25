import { ROOT, traceable } from "../../../traceable.js";
import { testWrapperAsyncLocalStorageInstance, _logTestFeedback, trackingEnabled, } from "../globals.js";
import { v4 } from "uuid";
function isEvaluationResult(x) {
    return (x != null &&
        typeof x === "object" &&
        "key" in x &&
        typeof x.key === "string" &&
        "score" in x);
}
export function wrapEvaluator(evaluator) {
    return async (input, config) => {
        const context = testWrapperAsyncLocalStorageInstance.getStore();
        if (context === undefined || context.currentExample === undefined) {
            throw new Error([
                `Could not identify current LangSmith context.`,
                `Please ensure you are calling this matcher within "ls.test()"`,
                `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
            ].join("\n"));
        }
        let evalRunId = config?.runId ?? config?.id ?? v4();
        let evalResult;
        if (trackingEnabled(context)) {
            const wrappedEvaluator = traceable(async (_runTree, params) => {
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
            evalResult = await wrappedEvaluator(ROOT, input);
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
                _logTestFeedback({
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
export async function evaluatedBy(outputs, evaluator) {
    const context = testWrapperAsyncLocalStorageInstance.getStore();
    if (context === undefined || context.currentExample === undefined) {
        throw new Error([
            `Could not identify current LangSmith context.`,
            `Please ensure you are calling this matcher within "ls.test()"`,
            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
        ].join("\n"));
    }
    const wrappedEvaluator = wrapEvaluator(evaluator);
    const evalRunId = v4();
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
