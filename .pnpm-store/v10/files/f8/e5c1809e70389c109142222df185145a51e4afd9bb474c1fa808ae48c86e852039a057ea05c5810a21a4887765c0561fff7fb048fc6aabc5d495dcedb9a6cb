import { Client } from "../index.js";
import { AttachmentInfo, Example, KVMap, Run, TracerSession } from "../schemas.js";
import { EvaluationResult, EvaluationResults, RunEvaluator } from "./evaluator.js";
import { ComparisonEvaluationResults, ComparativeEvaluator } from "./evaluate_comparative.js";
export type TargetConfigT = KVMap & {
    attachments?: Record<string, AttachmentInfo>;
    callbacks?: any;
};
type StandardTargetT<TInput = any, TOutput = KVMap> = ((input: TInput, config?: TargetConfigT) => Promise<TOutput>) | ((input: TInput, config?: TargetConfigT) => TOutput) | {
    invoke: (input: TInput, config?: TargetConfigT) => TOutput;
} | {
    invoke: (input: TInput, config?: TargetConfigT) => Promise<TOutput>;
};
type ComparativeTargetT = Array<string> | Array<Promise<ExperimentResults> | ExperimentResults>;
export type TargetT<TInput = any, TOutput = KVMap> = StandardTargetT<TInput, TOutput> | ComparativeTargetT;
export type DataT = string | AsyncIterable<Example> | Example[];
/** @deprecated Use object parameter version instead: (args: { runs, examples, inputs, outputs, referenceOutputs }) => ... */
type DeprecatedSyncSummaryEvaluator = (runs: Array<Run>, examples: Array<Example>) => EvaluationResult | EvaluationResult[] | EvaluationResults;
/** @deprecated Use object parameter version instead: (args: { runs, examples, inputs, outputs, referenceOutputs }) => ... */
type DeprecatedAsyncSummaryEvaluator = (runs: Array<Run>, examples: Array<Example>) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>;
export type SummaryEvaluatorT = DeprecatedSyncSummaryEvaluator | DeprecatedAsyncSummaryEvaluator | ((args: {
    runs: Array<Run>;
    examples: Array<Example>;
    inputs: Array<Record<string, any>>;
    outputs: Array<Record<string, any>>;
    referenceOutputs?: Array<Record<string, any>>;
}) => EvaluationResult | EvaluationResult[] | EvaluationResults) | ((args: {
    runs: Array<Run>;
    examples: Array<Example>;
    inputs: Array<Record<string, any>>;
    outputs: Array<Record<string, any>>;
    referenceOutputs?: Array<Record<string, any>>;
}) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>);
/** @deprecated Use object parameter version instead: (args: { run, example, inputs, outputs, referenceOutputs }) => ... */
type DeprecatedRunEvaluator = RunEvaluator;
/** @deprecated Use object parameter version instead: (args: { run, example, inputs, outputs, referenceOutputs }) => ... */
type DeprecatedFunctionEvaluator = (run: Run, example?: Example) => EvaluationResult | EvaluationResult[] | EvaluationResults;
/** @deprecated Use object parameter version instead: (args: { run, example, inputs, outputs, referenceOutputs }) => ... */
type DeprecatedAsyncFunctionEvaluator = (run: Run, example?: Example) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>;
export type EvaluatorT = DeprecatedRunEvaluator | DeprecatedFunctionEvaluator | DeprecatedAsyncFunctionEvaluator | ((args: {
    run: Run;
    example: Example;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    referenceOutputs?: Record<string, any>;
    attachments?: Record<string, any>;
}) => EvaluationResult | EvaluationResult[] | EvaluationResults) | ((args: {
    run: Run;
    example: Example;
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    referenceOutputs?: Record<string, any>;
    attachments?: Record<string, any>;
}) => Promise<EvaluationResult | EvaluationResult[] | EvaluationResults>);
interface _ForwardResults {
    run: Run;
    example: Example;
}
interface _ExperimentManagerArgs {
    data?: DataT;
    experiment?: TracerSession | string;
    metadata?: KVMap;
    client?: Client;
    runs?: AsyncGenerator<Run>;
    evaluationResults?: AsyncGenerator<EvaluationResults>;
    summaryResults?: AsyncGenerator<(runsArray: Run[]) => AsyncGenerator<EvaluationResults, any, unknown>, any, unknown>;
    examples?: Example[];
    numRepetitions?: number;
    _runsArray?: Run[];
    includeAttachments?: boolean;
}
type BaseEvaluateOptions = {
    /**
     * Metadata to attach to the experiment.
     * @default undefined
     */
    metadata?: KVMap;
    /**
     * A prefix to provide for your experiment name.
     * @default undefined
     */
    experimentPrefix?: string;
    /**
     * A free-form description of the experiment.
     */
    description?: string;
    /**
     * The maximum number of concurrent evaluations to run.
     * @default undefined
     */
    maxConcurrency?: number;
    /**
     * The LangSmith client to use.
     * @default undefined
     */
    client?: Client;
    /**
     * The number of repetitions to perform. Each example
     * will be run this many times.
     * @default 1
     */
    numRepetitions?: number;
};
export interface EvaluateOptions extends BaseEvaluateOptions {
    /**
     * A list of evaluators to run on each example.
     * @default undefined
     */
    evaluators?: Array<EvaluatorT>;
    /**
     * A list of summary evaluators to run on the entire dataset.
     * @default undefined
     */
    summaryEvaluators?: Array<SummaryEvaluatorT>;
    /**
     * The dataset to evaluate on. Can be a dataset name, a list of
     * examples, or a generator of examples.
     */
    data: DataT;
    /**
     * Whether to use attachments for the experiment.
     * @default false
     */
    includeAttachments?: boolean;
}
export interface ComparativeEvaluateOptions extends BaseEvaluateOptions {
    /**
     * A list of evaluators to run on each example.
     */
    evaluators: Array<ComparativeEvaluator>;
    /**
     * Whether to load all child runs for the experiment.
     * @default false
     */
    loadNested?: boolean;
    /**
     * Randomize the order of outputs for each evaluation
     * @default false
     */
    randomizeOrder?: boolean;
}
export declare function evaluate(target: ComparativeTargetT, options: ComparativeEvaluateOptions): Promise<ComparisonEvaluationResults>;
export declare function evaluate(target: StandardTargetT, options: EvaluateOptions): Promise<ExperimentResults>;
export interface ExperimentResultRow {
    run: Run;
    example: Example;
    evaluationResults: EvaluationResults;
}
/**
 * Manage the execution of experiments.
 *
 * Supports lazily running predictions and evaluations in parallel to facilitate
 * result streaming and early debugging.
 */
export declare class _ExperimentManager {
    _data?: DataT;
    _runs?: AsyncGenerator<Run>;
    _evaluationResults?: AsyncGenerator<EvaluationResults>;
    _summaryResults?: AsyncGenerator<(runsArray: Run[]) => AsyncGenerator<EvaluationResults, any, unknown>, any, unknown>;
    _examples?: Example[];
    _numRepetitions?: number;
    _runsArray?: Run[];
    client: Client;
    _experiment?: TracerSession;
    _experimentName: string;
    _metadata: KVMap;
    _description?: string;
    _includeAttachments?: boolean;
    get experimentName(): string;
    getExamples(): Promise<Array<Example>>;
    setExamples(examples: Example[]): void;
    get datasetId(): Promise<string>;
    get evaluationResults(): AsyncGenerator<EvaluationResults>;
    get runs(): AsyncGenerator<Run>;
    constructor(args: _ExperimentManagerArgs);
    _getExperiment(): TracerSession;
    _getExperimentMetadata(): Promise<KVMap>;
    _createProject(firstExample: Example, projectMetadata: KVMap): Promise<TracerSession>;
    _getProject(firstExample: Example): Promise<TracerSession>;
    protected _printExperimentStart(): Promise<void>;
    start(): Promise<_ExperimentManager>;
    withPredictions(target: StandardTargetT, options?: {
        maxConcurrency?: number;
    }): Promise<_ExperimentManager>;
    withEvaluators(evaluators: Array<EvaluatorT | RunEvaluator>, options?: {
        maxConcurrency?: number;
    }): Promise<_ExperimentManager>;
    withSummaryEvaluators(summaryEvaluators: Array<SummaryEvaluatorT>): Promise<_ExperimentManager>;
    getResults(): AsyncGenerator<ExperimentResultRow>;
    getSummaryScores(): Promise<EvaluationResults>;
    /**
     * Run the target function or runnable on the examples.
     * @param {StandardTargetT} target The target function or runnable to evaluate.
     * @param options
     * @returns {AsyncGenerator<_ForwardResults>} An async generator of the results.
     */
    _predict(target: StandardTargetT, options?: {
        maxConcurrency?: number;
    }): AsyncGenerator<_ForwardResults>;
    _runEvaluators(evaluators: Array<RunEvaluator>, currentResults: ExperimentResultRow, fields: {
        client: Client;
    }): Promise<ExperimentResultRow>;
    /**
     * Run the evaluators on the prediction stream.
     * Expects runs to be available in the manager.
     * (e.g. from a previous prediction step)
     * @param {Array<RunEvaluator>} evaluators
     * @param {number} maxConcurrency
     */
    _score(evaluators: Array<RunEvaluator>, options?: {
        maxConcurrency?: number;
    }): AsyncGenerator<ExperimentResultRow>;
    _applySummaryEvaluators(summaryEvaluators: Array<SummaryEvaluatorT>): AsyncGenerator<(runsArray: Run[]) => AsyncGenerator<EvaluationResults>>;
    _getDatasetVersion(): Promise<string | undefined>;
    _getDatasetSplits(): Promise<string[] | undefined>;
    _end(): Promise<void>;
}
/**
 * Represents the results of an evaluate() call.
 * This class provides an iterator interface to iterate over the experiment results
 * as they become available. It also provides methods to access the experiment name,
 * the number of results, and to wait for the results to be processed.
 */
declare class ExperimentResults implements AsyncIterableIterator<ExperimentResultRow> {
    private manager;
    results: ExperimentResultRow[];
    processedCount: number;
    summaryResults: EvaluationResults;
    constructor(experimentManager: _ExperimentManager);
    get experimentName(): string;
    [Symbol.asyncIterator](): AsyncIterableIterator<ExperimentResultRow>;
    next(): Promise<IteratorResult<ExperimentResultRow>>;
    processData(manager: _ExperimentManager): Promise<void>;
    get length(): number;
}
export {};
