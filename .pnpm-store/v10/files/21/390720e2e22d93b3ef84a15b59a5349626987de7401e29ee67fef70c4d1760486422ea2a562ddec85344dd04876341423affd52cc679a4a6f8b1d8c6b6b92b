import { RunEvalConfig } from "./config.js";
import { Runnable } from "@langchain/core/runnables";
import { Client, Feedback } from "langsmith";
import { TraceableFunction } from "langsmith/singletons/traceable";

//#region src/smith/runner_utils.d.ts
type ChainOrFactory = Runnable | (() => Runnable) | AnyTraceableFunction | ((obj: any) => any) | ((obj: any) => Promise<any>) | (() => (obj: unknown) => unknown) | (() => (obj: unknown) => Promise<unknown>);
type AnyTraceableFunction = TraceableFunction<(...any: any[]) => any>;
interface RunOnDatasetParams extends Omit<RunEvalConfig, "customEvaluators"> {
  /**
   * Name of the project for logging and tracking.
   */
  projectName?: string;
  /**
   * Additional metadata for the project.
   */
  projectMetadata?: Record<string, unknown>;
  /**
   * Client instance for LangSmith service interaction.
   */
  client?: Client;
  /**
   * Maximum concurrency level for dataset processing.
   */
  maxConcurrency?: number;
  /**
   * @deprecated Pass keys directly to the RunOnDatasetParams instead
   */
  evaluationConfig?: RunEvalConfig;
}
type EvalResults = {
  projectName: string;
  results: {
    [key: string]: {
      execution_time?: number;
      run_id: string;
      feedback: Feedback[];
    };
  };
};
/**
 * Evaluates a given model or chain against a specified LangSmith dataset.
 *
 * This function fetches example records from the specified dataset,
 * runs the model or chain against each example, and returns the evaluation
 * results.
 *
 * @param chainOrFactory - A model or factory/constructor function to be evaluated. It can be a
 * Runnable instance, a factory function that returns a Runnable, or a user-defined
 * function or factory.
 *
 * @param datasetName - The name of the dataset against which the evaluation will be
 * performed. This dataset should already be defined and contain the relevant data
 * for evaluation.
 *
 * @param options - (Optional) Additional parameters for the evaluation process:
 *   - `evaluators` (RunEvalType[]): Evaluators to apply to a dataset run.
 *   - `formatEvaluatorInputs` (EvaluatorInputFormatter): Convert the evaluation data into formats that can be used by the evaluator.
 *   - `projectName` (string): Name of the project for logging and tracking.
 *   - `projectMetadata` (Record<string, unknown>): Additional metadata for the project.
 *   - `client` (Client): Client instance for LangSmith service interaction.
 *   - `maxConcurrency` (number): Maximum concurrency level for dataset processing.
 *
 * @returns A promise that resolves to an `EvalResults` object. This object includes
 * detailed results of the evaluation, such as execution time, run IDs, and feedback
 * for each entry in the dataset.
 *
 * @example
 * ```typescript
 * // Example usage for evaluating a model on a dataset
 * async function evaluateModel() {
 *   const chain = /* ...create your model or chain...*\//
 *   const datasetName = 'example-dataset';
 *   const client = new Client(/* ...config... *\//);
 *
 *   const results = await runOnDataset(chain, datasetName, {
 *     evaluators: [/* ...evaluators... *\//],
 *     client,
 *   });
 *
 *   console.log('Evaluation Results:', results);
 * }
 *
 * evaluateModel();
 * ```
 * In this example, `runOnDataset` is used to evaluate a language model (or a chain of models) against
 * a dataset named 'example-dataset'. The evaluation process is configured using `RunOnDatasetParams["evaluators"]`, which can
 * include both standard and custom evaluators. The `Client` instance is used to interact with LangChain services.
 * The function returns the evaluation results, which can be logged or further processed as needed.
 */
declare function runOnDataset(chainOrFactory: ChainOrFactory, datasetName: string, options?: RunOnDatasetParams): Promise<EvalResults>;
//#endregion
export { EvalResults, RunOnDatasetParams, runOnDataset };
//# sourceMappingURL=runner_utils.d.ts.map