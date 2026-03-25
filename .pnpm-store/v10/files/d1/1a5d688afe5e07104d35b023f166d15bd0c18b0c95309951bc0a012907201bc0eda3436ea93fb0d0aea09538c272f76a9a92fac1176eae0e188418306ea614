"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicRunEvaluator = void 0;
exports.runEvaluator = runEvaluator;
const uuid_1 = require("uuid");
const traceable_js_1 = require("../traceable.cjs");
/**
 * Wraps an evaluator function + implements the RunEvaluator interface.
 */
class DynamicRunEvaluator {
    constructor(evaluator) {
        Object.defineProperty(this, "func", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.func = ((input) => {
            const { run, example } = input.langSmithRunAndExample;
            return evaluator({
                ...run,
                run,
                example,
                inputs: example?.inputs,
                outputs: run?.outputs,
                referenceOutputs: example?.outputs,
                attachments: example?.attachments,
            }, example);
        });
    }
    isEvaluationResults(x) {
        return (typeof x === "object" &&
            x != null &&
            "results" in x &&
            Array.isArray(x.results) &&
            x.results.length > 0);
    }
    coerceEvaluationResults(results, sourceRunId) {
        if (this.isEvaluationResults(results)) {
            return {
                results: results.results.map((r) => this.coerceEvaluationResult(r, sourceRunId, false)),
            };
        }
        return this.coerceEvaluationResult(results, sourceRunId, true);
    }
    coerceEvaluationResult(result, sourceRunId, allowNoKey = false) {
        if ("key" in result) {
            if (!result.sourceRunId) {
                result.sourceRunId = sourceRunId;
            }
            return result;
        }
        if (!("key" in result)) {
            if (allowNoKey) {
                result["key"] = this.func.name;
            }
        }
        return {
            sourceRunId,
            ...result,
        };
    }
    /**
     * Evaluates a run with an optional example and returns the evaluation result.
     * @param run The run to evaluate.
     * @param example The optional example to use for evaluation.
     * @returns A promise that extracts to the evaluation result.
     */
    async evaluateRun(run, example, options) {
        let sourceRunId = (0, uuid_1.v4)();
        const metadata = {
            targetRunId: run.id,
        };
        if ("session_id" in run) {
            metadata["experiment"] = run.session_id;
        }
        if (typeof this.func !== "function") {
            throw new Error("Target must be runnable function");
        }
        const wrappedTraceableFunc = (0, traceable_js_1.traceable)(this.func, {
            project_name: "evaluators",
            name: "evaluator",
            on_end: (runTree) => {
                // If tracing with OTEL, setting run id manually does not work.
                // Instead get it at the end of the run.
                sourceRunId = runTree.id;
            },
            ...options,
        });
        const result = await wrappedTraceableFunc(
        // Pass data via `langSmithRunAndExample` key to avoid conflicts with other
        // inputs. This key is extracted in the wrapped function, with `run` and
        // `example` passed to evaluator function as arguments.
        { langSmithRunAndExample: { run, example } }, { metadata });
        // Check the one required property of EvaluationResult since 'instanceof' is not possible
        if ("key" in result) {
            if (!result.sourceRunId) {
                result.sourceRunId = sourceRunId;
            }
            return result;
        }
        if (Array.isArray(result)) {
            return {
                results: result.map((r) => this.coerceEvaluationResult(r, sourceRunId, false)),
            };
        }
        if (typeof result !== "object") {
            throw new Error("Evaluator function must return an object.");
        }
        return this.coerceEvaluationResults(result, sourceRunId);
    }
}
exports.DynamicRunEvaluator = DynamicRunEvaluator;
function runEvaluator(func) {
    return new DynamicRunEvaluator(func);
}
