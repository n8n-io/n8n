import { v4 as uuid4, validate } from "uuid";
import { Client } from "../index.js";
import { shuffle } from "../utils/shuffle.js";
import { AsyncCaller } from "../utils/async_caller.js";
import pRetry from "../utils/p-retry/index.js";
import { getCurrentRunTree, traceable } from "../traceable.js";
function isExperimentResultsList(value) {
    return value.some((x) => typeof x !== "string");
}
async function loadExperiment(client, experiment) {
    const value = typeof experiment === "string" ? experiment : experiment.experimentName;
    return client.readProject(validate(value) ? { projectId: value } : { projectName: value });
}
async function loadTraces(client, experiment, options) {
    const executionOrder = options.loadNested ? undefined : 1;
    const runs = await client.listRuns(validate(experiment)
        ? { projectId: experiment, executionOrder }
        : { projectName: experiment, executionOrder });
    const treeMap = {};
    const runIdMap = {};
    const results = [];
    for await (const run of runs) {
        if (run.parent_run_id != null) {
            treeMap[run.parent_run_id] ??= [];
            treeMap[run.parent_run_id].push(run);
        }
        else {
            results.push(run);
        }
        runIdMap[run.id] = run;
    }
    for (const [parentRunId, childRuns] of Object.entries(treeMap)) {
        const parentRun = runIdMap[parentRunId];
        parentRun.child_runs = childRuns.sort((a, b) => {
            if (a.dotted_order == null || b.dotted_order == null)
                return 0;
            return a.dotted_order.localeCompare(b.dotted_order);
        });
    }
    return results;
}
/** @deprecated Use `evaluate` and pass two experiments as targets. */
export async function evaluateComparative(experiments, options) {
    if (experiments.length < 2) {
        throw new Error("Comparative evaluation requires at least 2 experiments.");
    }
    if (!options.evaluators.length) {
        throw new Error("At least one evaluator is required for comparative evaluation.");
    }
    if (options.maxConcurrency && options.maxConcurrency < 0) {
        throw new Error("maxConcurrency must be a positive number.");
    }
    const client = options.client ?? new Client();
    const resolvedExperiments = await Promise.all(experiments);
    const projects = await (() => {
        if (!isExperimentResultsList(resolvedExperiments)) {
            return Promise.all(resolvedExperiments.map((experiment) => loadExperiment(client, experiment)));
        }
        // if we know the number of runs beforehand, check if the
        // number of runs in the project matches the expected number of runs
        return Promise.all(resolvedExperiments.map((experiment) => pRetry(async () => {
            const project = await loadExperiment(client, experiment);
            if (project.run_count !== experiment?.results.length) {
                throw new Error("Experiment is missing runs. Retrying.");
            }
            return project;
        }, { factor: 2, minTimeout: 1000, retries: 10 })));
    })();
    if (new Set(projects.map((p) => p.reference_dataset_id)).size > 1) {
        throw new Error("All experiments must have the same reference dataset.");
    }
    const referenceDatasetId = projects.at(0)?.reference_dataset_id;
    if (!referenceDatasetId) {
        throw new Error("Reference dataset is required for comparative evaluation.");
    }
    if (new Set(projects.map((p) => p.extra?.metadata?.dataset_version)).size > 1) {
        console.warn("Detected multiple dataset versions used by experiments, which may lead to inaccurate results.");
    }
    const datasetVersion = projects.at(0)?.extra?.metadata?.dataset_version;
    const id = uuid4();
    const experimentName = (() => {
        if (!options.experimentPrefix) {
            const names = projects
                .map((p) => p.name)
                .filter(Boolean)
                .join(" vs. ");
            return `${names}-${uuid4().slice(0, 4)}`;
        }
        return `${options.experimentPrefix}-${uuid4().slice(0, 4)}`;
    })();
    // TODO: add URL to the comparative experiment
    console.log(`Starting pairwise evaluation of: ${experimentName}`);
    const comparativeExperiment = await client.createComparativeExperiment({
        id,
        name: experimentName,
        experimentIds: projects.map((p) => p.id),
        description: options.description,
        metadata: options.metadata,
        referenceDatasetId: projects.at(0)?.reference_dataset_id,
    });
    const viewUrl = await (async () => {
        const projectId = projects.at(0)?.id ?? projects.at(1)?.id;
        const datasetId = comparativeExperiment?.reference_dataset_id;
        if (projectId && datasetId) {
            const hostUrl = (await client.getProjectUrl({ projectId }))
                .split("/projects/p/")
                .at(0);
            const result = new URL(`${hostUrl}/datasets/${datasetId}/compare`);
            result.searchParams.set("selectedSessions", projects.map((p) => p.id).join(","));
            result.searchParams.set("comparativeExperiment", comparativeExperiment.id);
            return result.toString();
        }
        return null;
    })();
    if (viewUrl != null) {
        console.log(`View results at: ${viewUrl}`);
    }
    const experimentRuns = await Promise.all(projects.map((p) => loadTraces(client, p.id, { loadNested: !!options.loadNested })));
    let exampleIdsIntersect;
    for (const runs of experimentRuns) {
        const exampleIdsSet = new Set(runs
            .map((r) => r.reference_example_id)
            .filter((x) => x != null));
        if (!exampleIdsIntersect) {
            exampleIdsIntersect = exampleIdsSet;
        }
        else {
            exampleIdsIntersect = new Set([...exampleIdsIntersect].filter((x) => exampleIdsSet.has(x)));
        }
    }
    const exampleIds = [...(exampleIdsIntersect ?? [])];
    if (!exampleIds.length) {
        throw new Error("No examples found in common between experiments.");
    }
    const exampleMap = {};
    for (let start = 0; start < exampleIds.length; start += 99) {
        const exampleIdsChunk = exampleIds.slice(start, start + 99);
        for await (const example of client.listExamples({
            datasetId: referenceDatasetId,
            exampleIds: exampleIdsChunk,
            asOf: datasetVersion,
        })) {
            exampleMap[example.id] = example;
        }
    }
    const runMapByExampleId = {};
    for (const runs of experimentRuns) {
        for (const run of runs) {
            if (run.reference_example_id == null ||
                !exampleIds.includes(run.reference_example_id)) {
                continue;
            }
            runMapByExampleId[run.reference_example_id] ??= [];
            runMapByExampleId[run.reference_example_id].push(run);
        }
    }
    const caller = new AsyncCaller({
        maxConcurrency: options.maxConcurrency,
        debug: client.debug,
    });
    async function evaluateAndSubmitFeedback(runs, example, evaluator) {
        const expectedRunIds = new Set(runs.map((r) => r.id));
        // Check if evaluator expects an object parameter
        const result = evaluator.length === 1
            ? await evaluator({
                runs: options.randomizeOrder ? shuffle(runs) : runs,
                example,
                inputs: example.inputs,
                outputs: runs.map((run) => run.outputs || {}),
                referenceOutputs: example.outputs || {},
            })
            : await evaluator(runs, example);
        // Build a lookup for run metadata
        const runsById = new Map(runs.map((r) => [r.id, r]));
        for (const [runId, score] of Object.entries(result.scores)) {
            // validate if the run id
            if (!expectedRunIds.has(runId)) {
                throw new Error(`Returning an invalid run id ${runId} from evaluator.`);
            }
            const run = runsById.get(runId);
            await client.createFeedback(runId, result.key, {
                score,
                sourceRunId: result.source_run_id,
                comparativeExperimentId: comparativeExperiment.id,
                sessionId: run?.session_id,
                startTime: run?.start_time,
            });
        }
        return result;
    }
    const tracedEvaluators = options.evaluators.map((evaluator) => traceable(async (runs, example) => {
        const evaluatorRun = getCurrentRunTree();
        const result = evaluator.length === 1
            ? await evaluator({
                runs: options.randomizeOrder ? shuffle(runs) : runs,
                example,
                inputs: example.inputs,
                outputs: runs.map((run) => run.outputs || {}),
                referenceOutputs: example.outputs || {},
            })
            : await evaluator(runs, example);
        // sanitise the payload before sending to LangSmith
        evaluatorRun.inputs = { runs: runs, example: example };
        evaluatorRun.outputs = result;
        return {
            ...result,
            source_run_id: result.source_run_id ?? evaluatorRun.id,
        };
    }, {
        project_name: "evaluators",
        name: evaluator.name || "evaluator",
    }));
    const promises = Object.entries(runMapByExampleId).flatMap(([exampleId, runs]) => {
        const example = exampleMap[exampleId];
        if (!example)
            throw new Error(`Example ${exampleId} not found.`);
        return tracedEvaluators.map((evaluator) => caller.call(evaluateAndSubmitFeedback, runs, exampleMap[exampleId], evaluator));
    });
    const results = await Promise.all(promises);
    await client.awaitPendingTraceBatches();
    return { experimentName, results };
}
