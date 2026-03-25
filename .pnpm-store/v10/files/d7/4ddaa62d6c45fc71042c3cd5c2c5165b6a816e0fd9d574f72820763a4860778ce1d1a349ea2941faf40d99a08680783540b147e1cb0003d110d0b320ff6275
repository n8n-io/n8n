const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_loader = require('../evaluation/loader.cjs');
const require_client = require('../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry_api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/client.cjs');
const require_run_trees = require('../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry_api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/run_trees.cjs');
require('../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry_api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/index.cjs');
const require_config = require('./config.cjs');
const require_name_generation = require('./name_generation.cjs');
const require_progress = require('./progress.cjs');
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));
const __langchain_core_messages = require_rolldown_runtime.__toESM(require("@langchain/core/messages"));
const __langchain_core_tracers_base = require_rolldown_runtime.__toESM(require("@langchain/core/tracers/base"));
const __langchain_core_tracers_tracer_langchain = require_rolldown_runtime.__toESM(require("@langchain/core/tracers/tracer_langchain"));
const __langchain_core_utils_async_caller = require_rolldown_runtime.__toESM(require("@langchain/core/utils/async_caller"));

//#region src/smith/runner_utils.ts
var SingleRunIdExtractor = class {
	runIdPromiseResolver;
	runIdPromise;
	constructor() {
		this.runIdPromise = new Promise((extract) => {
			this.runIdPromiseResolver = extract;
		});
	}
	handleChainStart = (_chain, _inputs, runId) => {
		this.runIdPromiseResolver(runId);
	};
	async extract() {
		return this.runIdPromise;
	}
};
var SingleRunExtractor = class extends __langchain_core_tracers_base.BaseTracer {
	runPromiseResolver;
	runPromise;
	/** The name of the callback handler. */
	name = "single_run_extractor";
	constructor() {
		super();
		this.runPromise = new Promise((extract) => {
			this.runPromiseResolver = extract;
		});
	}
	async persistRun(run) {
		this.runPromiseResolver(run);
	}
	async extract() {
		return this.runPromise;
	}
};
/**
* Wraps an evaluator function + implements the RunEvaluator interface.
*/
var DynamicRunEvaluator = class {
	evaluator;
	constructor(evaluator) {
		this.evaluator = new __langchain_core_runnables.RunnableLambda({ func: evaluator });
	}
	/**
	* Evaluates a run with an optional example and returns the evaluation result.
	* @param run The run to evaluate.
	* @param example The optional example to use for evaluation.
	* @returns A promise that extracts to the evaluation result.
	*/
	async evaluateRun(run, example) {
		const extractor = new SingleRunIdExtractor();
		const tracer = new __langchain_core_tracers_tracer_langchain.LangChainTracer({ projectName: "evaluators" });
		const result = await this.evaluator.invoke({
			run,
			example,
			input: run.inputs,
			prediction: run.outputs,
			reference: example?.outputs
		}, { callbacks: [extractor, tracer] });
		const runId = await extractor.extract();
		return {
			sourceRunId: runId,
			...result
		};
	}
};
function isLLMStringEvaluator(evaluator) {
	return evaluator && typeof evaluator.evaluateStrings === "function";
}
/**
* Internal implementation of RunTree, which uses the
* provided callback manager instead of the internal LangSmith client.
*
* The goal of this class is to ensure seamless interop when intergrated
* with other Runnables.
*/
var CallbackManagerRunTree = class CallbackManagerRunTree extends require_run_trees.RunTree {
	callbackManager;
	activeCallbackManager = void 0;
	constructor(config, callbackManager) {
		super(config);
		this.callbackManager = callbackManager;
	}
	createChild(config) {
		const child = new CallbackManagerRunTree({
			...config,
			parent_run: this,
			project_name: this.project_name,
			client: this.client
		}, this.activeCallbackManager?.getChild() ?? this.callbackManager);
		this.child_runs.push(child);
		return child;
	}
	async postRun() {
		this.activeCallbackManager = await this.callbackManager.handleChainStart(typeof this.serialized !== "object" && this.serialized != null && "lc" in this.serialized ? this.serialized : {
			id: [
				"langchain",
				"smith",
				"CallbackManagerRunTree"
			],
			lc: 1,
			type: "not_implemented"
		}, this.inputs, this.id, this.run_type, void 0, void 0, this.name);
	}
	async patchRun() {
		if (this.error) await this.activeCallbackManager?.handleChainError(this.error, this.id, this.parent_run?.id, void 0, void 0);
		else await this.activeCallbackManager?.handleChainEnd(this.outputs ?? {}, this.id, this.parent_run?.id, void 0, void 0);
	}
};
var RunnableTraceable = class extends __langchain_core_runnables.Runnable {
	lc_serializable = false;
	lc_namespace = ["langchain_core", "runnables"];
	func;
	constructor(fields) {
		super(fields);
		if (!isLangsmithTraceableFunction(fields.func)) throw new Error("RunnableTraceable requires a function that is wrapped in traceable higher-order function");
		this.func = fields.func;
	}
	async invoke(input, options) {
		const [config] = this._getOptionsList(options ?? {}, 1);
		const callbackManager = await (0, __langchain_core_runnables.getCallbackManagerForConfig)(config);
		const partialConfig = "langsmith:traceable" in this.func ? this.func["langsmith:traceable"] : { name: "<lambda>" };
		if (!callbackManager) throw new Error("CallbackManager not found");
		const runTree = new CallbackManagerRunTree({
			...partialConfig,
			parent_run: callbackManager?._parentRunId ? new require_run_trees.RunTree({
				name: "<parent>",
				id: callbackManager?._parentRunId
			}) : void 0
		}, callbackManager);
		if (typeof input === "object" && input != null && Object.keys(input).length === 1) {
			if ("args" in input && Array.isArray(input)) return await this.func(runTree, ...input);
			if ("input" in input && !(typeof input === "object" && input != null && !Array.isArray(input) && !(input instanceof Date))) try {
				return await this.func(runTree, input.input);
			} catch {
				return await this.func(runTree, input);
			}
		}
		return await this.func(runTree, input);
	}
};
/**
* Wraps an off-the-shelf evaluator (loaded using loadEvaluator; of EvaluatorType[T])
* and composes with a prepareData function so the user can prepare the trace and
* dataset data for the evaluator.
*/
var PreparedRunEvaluator = class PreparedRunEvaluator {
	evaluator;
	formatEvaluatorInputs;
	isStringEvaluator;
	evaluationName;
	constructor(evaluator, evaluationName, formatEvaluatorInputs) {
		this.evaluator = evaluator;
		this.isStringEvaluator = typeof evaluator?.evaluateStrings === "function";
		this.evaluationName = evaluationName;
		this.formatEvaluatorInputs = formatEvaluatorInputs;
	}
	static async fromEvalConfig(config) {
		const evaluatorType = typeof config === "string" ? config : config.evaluatorType;
		const evalConfig = typeof config === "string" ? {} : config;
		const evaluator = await require_loader.loadEvaluator(evaluatorType, evalConfig);
		const feedbackKey = evalConfig?.feedbackKey ?? evaluator?.evaluationName;
		if (!isLLMStringEvaluator(evaluator)) throw new Error(`Evaluator of type ${evaluatorType} not yet supported. Please use a string evaluator, or implement your evaluation logic as a custom evaluator.`);
		if (!feedbackKey) throw new Error(`Evaluator of type ${evaluatorType} must have an evaluationName or feedbackKey. Please manually provide a feedbackKey in the EvalConfig.`);
		return new PreparedRunEvaluator(evaluator, feedbackKey, evalConfig?.formatEvaluatorInputs);
	}
	/**
	* Evaluates a run with an optional example and returns the evaluation result.
	* @param run The run to evaluate.
	* @param example The optional example to use for evaluation.
	* @returns A promise that extracts to the evaluation result.
	*/
	async evaluateRun(run, example) {
		const { prediction, input, reference } = this.formatEvaluatorInputs({
			rawInput: run.inputs,
			rawPrediction: run.outputs,
			rawReferenceOutput: example?.outputs,
			run
		});
		const extractor = new SingleRunIdExtractor();
		const tracer = new __langchain_core_tracers_tracer_langchain.LangChainTracer({ projectName: "evaluators" });
		if (this.isStringEvaluator) {
			const evalResult = await this.evaluator.evaluateStrings({
				prediction,
				reference,
				input
			}, { callbacks: [extractor, tracer] });
			const runId = await extractor.extract();
			return {
				key: this.evaluationName,
				comment: evalResult?.reasoning,
				sourceRunId: runId,
				...evalResult
			};
		}
		throw new Error("Evaluator not yet supported. Please use a string evaluator, or implement your evaluation logic as a custom evaluator.");
	}
};
var LoadedEvalConfig = class LoadedEvalConfig {
	constructor(evaluators) {
		this.evaluators = evaluators;
	}
	static async fromRunEvalConfig(config) {
		const customEvaluators = (config?.customEvaluators ?? config.evaluators?.filter(require_config.isCustomEvaluator))?.map((evaluator) => {
			if (typeof evaluator === "function") return new DynamicRunEvaluator(evaluator);
			else return evaluator;
		});
		const offTheShelfEvaluators = await Promise.all(config?.evaluators?.filter(require_config.isOffTheShelfEvaluator)?.map(async (evaluator) => await PreparedRunEvaluator.fromEvalConfig(evaluator)) ?? []);
		return new LoadedEvalConfig((customEvaluators ?? []).concat(offTheShelfEvaluators ?? []));
	}
};
/**
* Internals expect a constructor () -> Runnable. This function wraps/coerces
* the provided LangChain object, custom function, or factory function into
* a constructor of a runnable.
* @param modelOrFactory The model or factory to create a wrapped model from.
* @returns A function that returns the wrapped model.
* @throws Error if the modelOrFactory is invalid.
*/
const createWrappedModel = async (modelOrFactory) => {
	if (__langchain_core_runnables.Runnable.isRunnable(modelOrFactory)) return () => modelOrFactory;
	if (typeof modelOrFactory === "function") {
		if (isLangsmithTraceableFunction(modelOrFactory)) {
			const wrappedModel = new RunnableTraceable({ func: modelOrFactory });
			return () => wrappedModel;
		}
		try {
			let res = modelOrFactory();
			if (res && typeof res.then === "function") res = await res;
			return modelOrFactory;
		} catch {
			const wrappedModel = new __langchain_core_runnables.RunnableLambda({ func: modelOrFactory });
			return () => wrappedModel;
		}
	}
	throw new Error("Invalid modelOrFactory");
};
const loadExamples = async ({ datasetName, client, projectName }) => {
	const exampleIterator = client.listExamples({ datasetName });
	const configs = [];
	const runExtractors = [];
	const examples = [];
	for await (const example of exampleIterator) {
		const runExtractor = new SingleRunExtractor();
		configs.push({ callbacks: [new __langchain_core_tracers_tracer_langchain.LangChainTracer({
			exampleId: example.id,
			projectName
		}), runExtractor] });
		examples.push(example);
		runExtractors.push(runExtractor);
	}
	return {
		configs,
		examples,
		runExtractors
	};
};
const applyEvaluators = async ({ evaluation, runs, examples, client, maxConcurrency }) => {
	const { evaluators } = evaluation;
	const progress = new require_progress.ProgressBar({
		total: examples.length,
		format: "Running Evaluators: {bar} {percentage}% | {value}/{total}\n"
	});
	const caller = new __langchain_core_utils_async_caller.AsyncCaller({ maxConcurrency });
	const requests = runs.map(async (run, i) => caller.call(async () => {
		const evaluatorResults = await Promise.allSettled(evaluators.map((evaluator) => client.evaluateRun(run, evaluator, {
			referenceExample: examples[i],
			loadChildRuns: false
		})));
		progress.increment();
		return {
			execution_time: run?.end_time && run.start_time ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime() : void 0,
			feedback: evaluatorResults.map((evalResult) => evalResult.status === "fulfilled" ? evalResult.value : evalResult.reason),
			run_id: run.id
		};
	}));
	const results = await Promise.all(requests);
	return results.reduce((acc, result, i) => ({
		...acc,
		[examples[i].id]: result
	}), {});
};
const getExamplesInputs = (examples, chainOrFactory, dataType) => {
	if (dataType === "chat") return examples.map(({ inputs }) => (0, __langchain_core_messages.mapStoredMessagesToChatMessages)(inputs.input));
	const isLanguageModel = typeof chainOrFactory === "object" && typeof chainOrFactory._llmType === "function";
	if (isLanguageModel && examples.every(({ inputs }) => Object.keys(inputs).length === 1)) return examples.map(({ inputs }) => Object.values(inputs)[0]);
	return examples.map(({ inputs }) => inputs);
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
async function runOnDataset(chainOrFactory, datasetName, options) {
	const { projectName, projectMetadata, client, maxConcurrency } = options ?? {};
	const evaluationConfig = options?.evaluationConfig ?? (options?.evaluators != null ? {
		evaluators: options.evaluators,
		formatEvaluatorInputs: options.formatEvaluatorInputs
	} : void 0);
	const wrappedModel = await createWrappedModel(chainOrFactory);
	const testClient = client ?? new require_client.Client();
	const testProjectName = projectName ?? require_name_generation.randomName();
	const dataset = await testClient.readDataset({ datasetName });
	const datasetId = dataset.id;
	const testConcurrency = maxConcurrency ?? 5;
	const { configs, examples, runExtractors } = await loadExamples({
		datasetName,
		client: testClient,
		projectName: testProjectName,
		maxConcurrency: testConcurrency
	});
	await testClient.createProject({
		projectName: testProjectName,
		referenceDatasetId: datasetId,
		projectExtra: { metadata: { ...projectMetadata } }
	});
	const wrappedRunnable = new __langchain_core_runnables.RunnableLambda({ func: wrappedModel }).withConfig({ runName: "evaluationRun" });
	const runInputs = getExamplesInputs(examples, chainOrFactory, dataset.data_type);
	const progress = new require_progress.ProgressBar({
		total: runInputs.length,
		format: "Predicting: {bar} {percentage}% | {value}/{total}"
	});
	await wrappedRunnable.withListeners({ onEnd: () => progress.increment() }).batch(runInputs, configs, {
		maxConcurrency,
		returnExceptions: true
	});
	progress.complete();
	const runs = [];
	for (let i = 0; i < examples.length; i += 1) runs.push(await runExtractors[i].extract());
	let evalResults = {};
	if (evaluationConfig) {
		const loadedEvalConfig = await LoadedEvalConfig.fromRunEvalConfig(evaluationConfig);
		evalResults = await applyEvaluators({
			evaluation: loadedEvalConfig,
			runs,
			examples,
			client: testClient,
			maxConcurrency: testConcurrency
		});
	}
	const results = {
		projectName: testProjectName,
		results: evalResults ?? {}
	};
	return results;
}
function isLangsmithTraceableFunction(x) {
	return typeof x === "function" && "langsmith:traceable" in x;
}

//#endregion
exports.runOnDataset = runOnDataset;
//# sourceMappingURL=runner_utils.cjs.map