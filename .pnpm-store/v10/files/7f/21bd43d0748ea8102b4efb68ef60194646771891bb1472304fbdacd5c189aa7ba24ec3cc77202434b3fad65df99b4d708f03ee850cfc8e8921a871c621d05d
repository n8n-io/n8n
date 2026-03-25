"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._ExperimentManager = void 0;
exports.evaluate = evaluate;
const index_js_1 = require("../index.cjs");
const traceable_js_1 = require("../traceable.cjs");
const _git_js_1 = require("../utils/_git.cjs");
const _uuid_js_1 = require("../utils/_uuid.cjs");
const async_caller_js_1 = require("../utils/async_caller.cjs");
const atee_js_1 = require("../utils/atee.cjs");
const env_js_1 = require("../utils/env.cjs");
const error_js_1 = require("../utils/error.cjs");
const _random_name_js_1 = require("./_random_name.cjs");
const evaluator_js_1 = require("./evaluator.cjs");
const uuid_1 = require("uuid");
const evaluate_comparative_js_1 = require("./evaluate_comparative.cjs");
// Implementation signature
function evaluate(target, options) {
    return _evaluate(target, options);
}
/**
 * Manage the execution of experiments.
 *
 * Supports lazily running predictions and evaluations in parallel to facilitate
 * result streaming and early debugging.
 */
class _ExperimentManager {
    get experimentName() {
        if (this._experimentName) {
            return this._experimentName;
        }
        else {
            throw new Error("Experiment name not provided, and experiment not yet started.");
        }
    }
    async getExamples() {
        if (!this._examples) {
            if (!this._data) {
                throw new Error("Data not provided in this experiment.");
            }
            const unresolvedData = _resolveData(this._data, {
                client: this.client,
                includeAttachments: this._includeAttachments,
            });
            if (!this._examples) {
                this._examples = [];
            }
            const exs = [];
            for await (const example of unresolvedData) {
                exs.push(example);
            }
            if (this._numRepetitions && this._numRepetitions > 0) {
                const repeatedExamples = [];
                for (let i = 0; i < this._numRepetitions; i++) {
                    repeatedExamples.push(...exs);
                }
                this.setExamples(repeatedExamples);
            }
            else {
                this.setExamples(exs);
            }
        }
        return this._examples;
    }
    setExamples(examples) {
        this._examples = examples;
    }
    get datasetId() {
        return this.getExamples().then((examples) => {
            if (examples.length === 0) {
                throw new Error("No examples found in the dataset.");
            }
            if (this._experiment && this._experiment.reference_dataset_id) {
                return this._experiment.reference_dataset_id;
            }
            return examples[0].dataset_id;
        });
    }
    get evaluationResults() {
        if (this._evaluationResults === undefined) {
            return async function* () {
                for (const _ of await this.getExamples()) {
                    yield { results: [] };
                }
            }.call(this);
        }
        else {
            return this._evaluationResults;
        }
    }
    get runs() {
        if (this._runsArray && this._runsArray.length > 0) {
            throw new Error("Runs already provided as an array.");
        }
        if (this._runs === undefined) {
            throw new Error("Runs not provided in this experiment. Please predict first.");
        }
        else {
            return this._runs;
        }
    }
    constructor(args) {
        Object.defineProperty(this, "_data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_runs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_evaluationResults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_summaryResults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_examples", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_numRepetitions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_runsArray", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "client", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_experiment", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_experimentName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_metadata", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_description", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_includeAttachments", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.client = args.client ?? new index_js_1.Client();
        if (!args.experiment) {
            this._experimentName = (0, _random_name_js_1.randomName)();
        }
        else if (typeof args.experiment === "string") {
            this._experimentName = `${args.experiment}-${(0, uuid_1.v4)().slice(0, 8)}`;
        }
        else {
            if (!args.experiment.name) {
                throw new Error("Experiment must have a name");
            }
            this._experimentName = args.experiment.name;
            this._experiment = args.experiment;
        }
        let metadata = args.metadata || {};
        if (!("revision_id" in metadata)) {
            metadata = {
                revision_id: (0, env_js_1.getLangSmithEnvVarsMetadata)().revision_id,
                ...metadata,
            };
        }
        this._metadata = metadata;
        if (args.examples && args.examples.length) {
            this.setExamples(args.examples);
        }
        this._data = args.data;
        if (args._runsArray && args._runsArray.length) {
            this._runsArray = args._runsArray;
        }
        this._runs = args.runs;
        this._evaluationResults = args.evaluationResults;
        this._summaryResults = args.summaryResults;
        this._numRepetitions = args.numRepetitions;
        this._includeAttachments = args.includeAttachments;
    }
    _getExperiment() {
        if (!this._experiment) {
            throw new Error("Experiment not yet started.");
        }
        return this._experiment;
    }
    async _getExperimentMetadata() {
        let projectMetadata = this._metadata ?? {};
        const gitInfo = await (0, _git_js_1.getGitInfo)();
        if (gitInfo) {
            projectMetadata = {
                ...projectMetadata,
                git: gitInfo,
            };
        }
        if (this._experiment) {
            const experimentMetadata = this._experiment.extra && "metadata" in this._experiment.extra
                ? this._experiment.extra.metadata
                : {};
            projectMetadata = {
                ...experimentMetadata,
                ...projectMetadata,
            };
        }
        return projectMetadata;
    }
    async _createProject(firstExample, projectMetadata) {
        // Create the project, updating the experimentName until we find a unique one.
        let project;
        const originalExperimentName = this._experimentName;
        for (let i = 0; i < 10; i++) {
            try {
                project = await this.client.createProject({
                    projectName: this._experimentName,
                    referenceDatasetId: firstExample.dataset_id,
                    metadata: projectMetadata,
                    description: this._description,
                });
                return project;
            }
            catch (e) {
                // Naming collision
                if (e?.name === "LangSmithConflictError") {
                    const ent = (0, uuid_1.v4)().slice(0, 6);
                    this._experimentName = `${originalExperimentName}-${ent}`;
                }
                else {
                    throw e;
                }
            }
        }
        throw new Error("Could not generate a unique experiment name within 10 attempts." +
            " Please try again with a different name.");
    }
    async _getProject(firstExample) {
        let project;
        if (!this._experiment) {
            const projectMetadata = await this._getExperimentMetadata();
            project = await this._createProject(firstExample, projectMetadata);
            this._experiment = project;
        }
        return this._experiment;
    }
    async _printExperimentStart() {
        console.log(`Starting evaluation of experiment: ${this.experimentName}`);
        const firstExample = this._examples?.[0];
        const datasetId = firstExample?.dataset_id;
        if (!datasetId || !this._experiment)
            return;
        const datasetUrl = await this.client.getDatasetUrl({ datasetId });
        const compareUrl = `${datasetUrl}/compare?selectedSessions=${this._experiment.id}`;
        console.log(`View results at ${compareUrl}`);
    }
    async start() {
        const examples = await this.getExamples();
        const firstExample = examples[0];
        const project = await this._getProject(firstExample);
        await this._printExperimentStart();
        this._metadata["num_repetitions"] = this._numRepetitions;
        return new _ExperimentManager({
            examples,
            experiment: project,
            metadata: this._metadata,
            client: this.client,
            evaluationResults: this._evaluationResults,
            summaryResults: this._summaryResults,
            includeAttachments: this._includeAttachments,
        });
    }
    async withPredictions(target, options) {
        const experimentResults = this._predict(target, options);
        return new _ExperimentManager({
            examples: await this.getExamples(),
            experiment: this._experiment,
            metadata: this._metadata,
            client: this.client,
            runs: (async function* () {
                for await (const pred of experimentResults) {
                    yield pred.run;
                }
            })(),
            includeAttachments: this._includeAttachments,
        });
    }
    async withEvaluators(evaluators, options) {
        const resolvedEvaluators = _resolveEvaluators(evaluators);
        const experimentResults = this._score(resolvedEvaluators, options);
        const [r1, r2] = (0, atee_js_1.atee)(experimentResults);
        return new _ExperimentManager({
            examples: await this.getExamples(),
            experiment: this._experiment,
            metadata: this._metadata,
            client: this.client,
            runs: (async function* () {
                for await (const result of r1) {
                    yield result.run;
                }
            })(),
            evaluationResults: (async function* () {
                for await (const result of r2) {
                    yield result.evaluationResults;
                }
            })(),
            summaryResults: this._summaryResults,
            includeAttachments: this._includeAttachments,
        });
    }
    async withSummaryEvaluators(summaryEvaluators) {
        const aggregateFeedbackGen = this._applySummaryEvaluators(summaryEvaluators);
        return new _ExperimentManager({
            examples: await this.getExamples(),
            experiment: this._experiment,
            metadata: this._metadata,
            client: this.client,
            runs: this.runs,
            _runsArray: this._runsArray,
            evaluationResults: this._evaluationResults,
            summaryResults: aggregateFeedbackGen,
            includeAttachments: this._includeAttachments,
        });
    }
    async *getResults() {
        const examples = await this.getExamples();
        const evaluationResults = [];
        if (!this._runsArray) {
            this._runsArray = [];
            for await (const run of this.runs) {
                this._runsArray.push(run);
            }
        }
        for await (const evaluationResult of this.evaluationResults) {
            evaluationResults.push(evaluationResult);
        }
        for (let i = 0; i < this._runsArray.length; i++) {
            yield {
                run: this._runsArray[i],
                example: examples[i],
                evaluationResults: evaluationResults[i],
            };
        }
    }
    async getSummaryScores() {
        if (!this._summaryResults) {
            return { results: [] };
        }
        const results = [];
        for await (const evaluationResultsGenerator of this._summaryResults) {
            if (typeof evaluationResultsGenerator === "function") {
                // This is because runs array is not available until after this generator
                // is set, so we need to pass it like so.
                for await (const evaluationResults of evaluationResultsGenerator(this._runsArray ?? [])) {
                    results.push(...evaluationResults.results);
                }
            }
        }
        return { results };
    }
    // Private methods
    /**
     * Run the target function or runnable on the examples.
     * @param {StandardTargetT} target The target function or runnable to evaluate.
     * @param options
     * @returns {AsyncGenerator<_ForwardResults>} An async generator of the results.
     */
    async *_predict(target, options) {
        const maxConcurrency = options?.maxConcurrency ?? 0;
        const examples = await this.getExamples();
        if (maxConcurrency === 0) {
            for (const example of examples) {
                yield await _forward(target, example, this.experimentName, this._metadata, this.client, this._includeAttachments);
            }
        }
        else {
            const caller = new async_caller_js_1.AsyncCaller({
                maxConcurrency,
                debug: this.client.debug,
            });
            const futures = [];
            for await (const example of examples) {
                futures.push(caller.call(_forward, target, example, this.experimentName, this._metadata, this.client, this._includeAttachments));
            }
            for await (const future of futures) {
                yield future;
            }
        }
        // Close out the project.
        await this._end();
    }
    async _runEvaluators(evaluators, currentResults, fields) {
        const { run, example, evaluationResults } = currentResults;
        for (const evaluator of evaluators) {
            try {
                const options = {
                    reference_example_id: example.id,
                    project_name: "evaluators",
                    metadata: {
                        example_version: example.modified_at
                            ? new Date(example.modified_at).toISOString()
                            : new Date(example.created_at).toISOString(),
                    },
                    client: fields.client,
                    tracingEnabled: true,
                };
                const evaluatorResponse = await evaluator.evaluateRun(run, example, options);
                evaluationResults.results.push(...(await fields.client.logEvaluationFeedback(evaluatorResponse, run)));
            }
            catch (e) {
                console.error(`Error running evaluator ${evaluator.evaluateRun.name} on run ${run.id}: ${e}`);
                (0, error_js_1.printErrorStackTrace)(e);
            }
        }
        return {
            run,
            example,
            evaluationResults,
        };
    }
    /**
     * Run the evaluators on the prediction stream.
     * Expects runs to be available in the manager.
     * (e.g. from a previous prediction step)
     * @param {Array<RunEvaluator>} evaluators
     * @param {number} maxConcurrency
     */
    async *_score(evaluators, options) {
        const { maxConcurrency = 0 } = options || {};
        if (maxConcurrency === 0) {
            for await (const currentResults of this.getResults()) {
                yield this._runEvaluators(evaluators, currentResults, {
                    client: this.client,
                });
            }
        }
        else {
            const caller = new async_caller_js_1.AsyncCaller({
                maxConcurrency,
                debug: this.client.debug,
            });
            const futures = [];
            for await (const currentResults of this.getResults()) {
                futures.push(caller.call(this._runEvaluators, evaluators, currentResults, {
                    client: this.client,
                }));
            }
            for (const result of futures) {
                yield result;
            }
        }
    }
    async *_applySummaryEvaluators(summaryEvaluators) {
        const projectId = this._getExperiment().id;
        const examples = await this.getExamples();
        const options = Array.from({ length: summaryEvaluators.length }).map(() => ({
            project_name: "evaluators",
            experiment: this.experimentName,
            projectId: projectId,
        }));
        const wrappedEvaluators = await wrapSummaryEvaluators(summaryEvaluators, options);
        yield async function* (runsArray) {
            const aggregateFeedback = [];
            for (const evaluator of wrappedEvaluators) {
                try {
                    const summaryEvalResult = await evaluator(runsArray, examples);
                    const flattenedResults = this.client._selectEvalResults(summaryEvalResult);
                    aggregateFeedback.push(...flattenedResults);
                    for (const result of flattenedResults) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { targetRunId, key, ...feedback } = result;
                        const evaluatorInfo = feedback.evaluatorInfo;
                        delete feedback.evaluatorInfo;
                        await this.client.createFeedback(null, key, {
                            ...feedback,
                            projectId: projectId,
                            sourceInfo: evaluatorInfo,
                        });
                    }
                }
                catch (e) {
                    console.error(`Error running summary evaluator ${evaluator.name}: ${JSON.stringify(e, null, 2)}`);
                    (0, error_js_1.printErrorStackTrace)(e);
                }
            }
            yield {
                results: aggregateFeedback,
            };
        }.bind(this);
    }
    async _getDatasetVersion() {
        const examples = await this.getExamples();
        const modifiedAt = examples.map((ex) => ex.modified_at);
        // Python might return microseconds, which we need
        // to account for when comparing dates.
        const modifiedAtTime = modifiedAt.map((date) => {
            function getMiliseconds(isoString) {
                const time = isoString.split("T").at(1);
                if (!time)
                    return "";
                const regex = /[0-9]{2}:[0-9]{2}:[0-9]{2}.([0-9]+)/;
                const strMiliseconds = time.match(regex)?.[1];
                return strMiliseconds ?? "";
            }
            const jsDate = new Date(date);
            let source = getMiliseconds(date);
            let parsed = getMiliseconds(jsDate.toISOString());
            const length = Math.max(source.length, parsed.length);
            source = source.padEnd(length, "0");
            parsed = parsed.padEnd(length, "0");
            const microseconds = (Number.parseInt(source, 10) - Number.parseInt(parsed, 10)) / 1000;
            const time = jsDate.getTime() + microseconds;
            return { date, time };
        });
        if (modifiedAtTime.length === 0)
            return undefined;
        return modifiedAtTime.reduce((max, current) => (current.time > max.time ? current : max), modifiedAtTime[0]).date;
    }
    async _getDatasetSplits() {
        const examples = await this.getExamples();
        const allSplits = examples.reduce((acc, ex) => {
            if (ex.metadata && ex.metadata.dataset_split) {
                if (Array.isArray(ex.metadata.dataset_split)) {
                    ex.metadata.dataset_split.forEach((split) => acc.add(split));
                }
                else if (typeof ex.metadata.dataset_split === "string") {
                    acc.add(ex.metadata.dataset_split);
                }
            }
            return acc;
        }, new Set());
        return allSplits.size ? Array.from(allSplits) : undefined;
    }
    async _end() {
        const experiment = this._experiment;
        if (!experiment) {
            throw new Error("Experiment not yet started.");
        }
        const projectMetadata = await this._getExperimentMetadata();
        projectMetadata["dataset_version"] = await this._getDatasetVersion();
        projectMetadata["dataset_splits"] = await this._getDatasetSplits();
        // Update revision_id if not already set
        if (!projectMetadata["revision_id"]) {
            projectMetadata["revision_id"] = await (0, _git_js_1.getDefaultRevisionId)();
        }
        await this.client.updateProject(experiment.id, {
            metadata: projectMetadata,
        });
    }
}
exports._ExperimentManager = _ExperimentManager;
/**
 * Represents the results of an evaluate() call.
 * This class provides an iterator interface to iterate over the experiment results
 * as they become available. It also provides methods to access the experiment name,
 * the number of results, and to wait for the results to be processed.
 */
class ExperimentResults {
    constructor(experimentManager) {
        Object.defineProperty(this, "manager", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "results", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "processedCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "summaryResults", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.manager = experimentManager;
    }
    get experimentName() {
        return this.manager.experimentName;
    }
    [Symbol.asyncIterator]() {
        return this;
    }
    async next() {
        if (this.processedCount < this.results.length) {
            const result = this.results[this.processedCount];
            this.processedCount++;
            return Promise.resolve({ value: result, done: false });
        }
        else {
            return Promise.resolve({ value: undefined, done: true });
        }
    }
    async processData(manager) {
        for await (const item of manager.getResults()) {
            this.results.push(item);
            this.processedCount++;
        }
        this.summaryResults = await manager.getSummaryScores();
    }
    get length() {
        return this.results.length;
    }
}
async function _evaluate(target, fields) {
    // Add check for comparative evaluation
    if (Array.isArray(target)) {
        const comparativeOptions = fields;
        if (!comparativeOptions.evaluators) {
            throw new Error("Evaluators are required for comparative evaluation");
        }
        return (0, evaluate_comparative_js_1.evaluateComparative)(target, {
            evaluators: comparativeOptions.evaluators,
            client: comparativeOptions.client,
            metadata: comparativeOptions.metadata,
            experimentPrefix: comparativeOptions.experimentPrefix,
            description: comparativeOptions.description,
            maxConcurrency: comparativeOptions.maxConcurrency,
            loadNested: comparativeOptions.loadNested ?? false,
            randomizeOrder: comparativeOptions.randomizeOrder ?? false,
        });
    }
    const client = fields.client ?? new index_js_1.Client();
    const runs = _isCallable(target) ? null : target;
    const standardFields = fields;
    const [experiment_, newRuns] = await _resolveExperiment(fields.experiment ?? null, runs, client);
    let manager = await new _ExperimentManager({
        data: Array.isArray(standardFields.data) ? undefined : standardFields.data,
        examples: Array.isArray(standardFields.data)
            ? standardFields.data
            : undefined,
        client,
        metadata: fields.metadata,
        experiment: experiment_ ?? fields.experimentPrefix,
        runs: newRuns ?? undefined,
        numRepetitions: fields.numRepetitions ?? 1,
        includeAttachments: standardFields.includeAttachments,
    }).start();
    if (_isCallable(target)) {
        manager = await manager.withPredictions(target, {
            maxConcurrency: fields.maxConcurrency,
        });
    }
    if (standardFields.evaluators) {
        manager = await manager.withEvaluators(standardFields.evaluators, {
            maxConcurrency: fields.maxConcurrency,
        });
    }
    if (standardFields.summaryEvaluators) {
        manager = await manager.withSummaryEvaluators(standardFields.summaryEvaluators);
    }
    // Start consuming the results.
    const results = new ExperimentResults(manager);
    await results.processData(manager);
    await client.awaitPendingTraceBatches();
    return results;
}
async function _forward(fn, example, experimentName, metadata, client, includeAttachments) {
    let run = null;
    const _getRun = (r) => {
        run = r;
    };
    const defaultOptions = {
        reference_example_id: example.id,
        on_end: _getRun,
        project_name: experimentName,
        metadata: {
            ...metadata,
            example_version: example.modified_at
                ? new Date(example.modified_at).toISOString()
                : new Date(example.created_at).toISOString(),
        },
        client,
        tracingEnabled: true,
    };
    const wrappedFn = (0, traceable_js_1.isTraceableFunction)(fn)
        ? fn
        : "invoke" in fn
            ? (0, traceable_js_1.traceable)(async (inputs) => {
                let langChainCallbacks;
                try {
                    // TODO: Deprecate this and rely on interop on 0.2 minor bump.
                    const { getLangchainCallbacks } = await import("../langchain.js");
                    langChainCallbacks = await getLangchainCallbacks();
                }
                catch {
                    // no-op
                }
                // Issue with retrieving LangChain callbacks, rely on interop
                if (langChainCallbacks === undefined && !includeAttachments) {
                    return await fn.invoke(inputs);
                }
                else if (langChainCallbacks === undefined && includeAttachments) {
                    return await fn.invoke(inputs, {
                        attachments: example.attachments,
                    });
                }
                else if (!includeAttachments) {
                    return await fn.invoke(inputs, { callbacks: langChainCallbacks });
                }
                else {
                    return await fn.invoke(inputs, {
                        attachments: example.attachments,
                        callbacks: langChainCallbacks,
                    });
                }
            }, defaultOptions)
            : (0, traceable_js_1.traceable)(fn, defaultOptions);
    try {
        if (includeAttachments && !("invoke" in fn)) {
            await wrappedFn(example.inputs, { attachments: example.attachments });
        }
        else {
            await wrappedFn(example.inputs);
        }
    }
    catch (e) {
        console.error(`Error running target function: ${e}`);
        (0, error_js_1.printErrorStackTrace)(e);
    }
    if (!run) {
        throw new Error(`Run not created by target function.
This is most likely due to tracing not being enabled.\n
Try setting "LANGSMITH_TRACING=true" in your environment.`);
    }
    return {
        run,
        example,
    };
}
function _resolveData(data, options) {
    let isUUID = false;
    try {
        if (typeof data === "string") {
            (0, _uuid_js_1.assertUuid)(data);
            isUUID = true;
        }
    }
    catch (_) {
        isUUID = false;
    }
    if (typeof data === "string" && isUUID) {
        return options.client.listExamples({
            datasetId: data,
            includeAttachments: options.includeAttachments,
        });
    }
    if (typeof data === "string") {
        return options.client.listExamples({
            datasetName: data,
            includeAttachments: options.includeAttachments,
        });
    }
    return data;
}
async function wrapSummaryEvaluators(evaluators, optionsArray) {
    async function _wrap(evaluator) {
        const evalName = evaluator.name || "BatchEvaluator";
        const wrapperInner = (runs, examples) => {
            const wrapperSuperInner = (0, traceable_js_1.traceable)((_runs_, _examples_) => {
                // Check if the evaluator expects an object parameter
                if (evaluator.length === 1) {
                    const inputs = examples.map((ex) => ex.inputs);
                    const outputs = runs.map((run) => run.outputs || {});
                    const referenceOutputs = examples.map((ex) => ex.outputs || {});
                    return Promise.resolve(evaluator({
                        runs,
                        examples,
                        inputs,
                        outputs,
                        referenceOutputs,
                    }));
                }
                // Otherwise use the traditional (runs, examples) signature
                return Promise.resolve(evaluator(runs, examples));
            }, { ...optionsArray, name: evalName });
            return Promise.resolve(wrapperSuperInner(`Runs[] (Length=${runs.length})`, `Examples[] (Length=${examples.length})`));
        };
        return wrapperInner;
    }
    const results = [];
    for (let i = 0; i < evaluators.length; i++) {
        results.push(await _wrap(evaluators[i]));
    }
    return results;
}
function _resolveEvaluators(evaluators) {
    const results = [];
    for (const evaluator of evaluators) {
        if ("evaluateRun" in evaluator) {
            results.push(evaluator);
            // todo fix this by porting LangChainStringEvaluator to langsmith sdk
        }
        else if (evaluator.name === "LangChainStringEvaluator") {
            throw new Error("Not yet implemented");
        }
        else {
            results.push((0, evaluator_js_1.runEvaluator)(evaluator));
        }
    }
    return results;
}
async function _resolveExperiment(experiment, runs, client) {
    // TODO: Remove this, handle outside the manager
    if (experiment !== null) {
        if (!experiment.name) {
            throw new Error("Experiment name must be defined if provided.");
        }
        return [experiment, undefined];
    }
    // If we have runs, that means the experiment was already started.
    if (runs !== null) {
        const results = [];
        for await (const item of (0, atee_js_1.atee)(runs)) {
            results.push(item);
        }
        const [runsClone, runsOriginal] = results;
        const runsCloneIterator = runsClone[Symbol.asyncIterator]();
        // todo: this is `any`. does it work properly?
        const firstRun = await runsCloneIterator
            .next()
            .then((result) => result.value);
        const retrievedExperiment = await client.readProject(firstRun.sessionId);
        if (!retrievedExperiment.name) {
            throw new Error("Experiment name not found for provided runs.");
        }
        return [retrievedExperiment, runsOriginal];
    }
    return [undefined, undefined];
}
function _isCallable(target) {
    return Boolean(typeof target === "function" ||
        ("invoke" in target && typeof target.invoke === "function"));
}
