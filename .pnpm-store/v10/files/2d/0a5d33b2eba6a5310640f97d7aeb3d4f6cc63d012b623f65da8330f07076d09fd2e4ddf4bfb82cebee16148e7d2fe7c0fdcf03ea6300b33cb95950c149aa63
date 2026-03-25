/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-namespace */
import crypto from "crypto";
import { v4, v5 } from "uuid";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { execSync } from "child_process";
import { getCurrentRunTree, traceable } from "../../traceable.js";
import { randomName } from "../../evaluation/_random_name.js";
import { toBeRelativeCloseTo, toBeAbsoluteCloseTo, toBeSemanticCloseTo, } from "./matchers.js";
import { evaluatorLogFeedbackPromises, testWrapperAsyncLocalStorageInstance, _logTestFeedback, syncExamplePromises, trackingEnabled, DEFAULT_TEST_CLIENT, } from "./globals.js";
import { wrapExpect } from "./vendor/chain.js";
import { getEnvironmentVariable, isJsDom } from "../env.js";
import { STRIP_ANSI_REGEX, TEST_ID_DELIMITER, UUID5_NAMESPACE, } from "./constants.js";
export function logFeedback(feedback, config) {
    const context = testWrapperAsyncLocalStorageInstance.getStore();
    if (context === undefined) {
        throw new Error([
            `Could not retrieve test context. Make sure your logFeedback call is nested within a "ls.describe()" block.`,
            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
        ].join("\n"));
    }
    if (context.currentExample === undefined) {
        throw new Error([
            `Could not retrieve current example. Make sure your logFeedback call is nested within a "ls.test()" block.`,
            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
        ].join("\n"));
    }
    _logTestFeedback({
        ...config,
        exampleId: context.currentExample.id,
        feedback: feedback,
        context,
        runTree: context.testRootRunTree,
        client: context.client,
    });
}
export function logOutputs(output) {
    const context = testWrapperAsyncLocalStorageInstance.getStore();
    if (context === undefined) {
        throw new Error(`Could not retrieve test context. Make sure your logFeedback call is nested within a "ls.describe()" block.`);
    }
    if (context.currentExample === undefined ||
        context.setLoggedOutput === undefined) {
        throw new Error([
            `Could not retrieve current example. Make sure your logFeedback call is nested within a "ls.test()" block.`,
            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
        ].join("\n"));
    }
    context.setLoggedOutput(output);
}
export function _objectHash(obj, depth = 0) {
    // Prevent infinite recursion
    if (depth > 50) {
        throw new Error("Object is too deep to check equality for serialization. Please use a simpler example.");
    }
    if (Array.isArray(obj)) {
        const arrayHash = obj.map((item) => _objectHash(item, depth + 1)).join(",");
        return crypto.createHash("sha256").update(arrayHash).digest("hex");
    }
    if (obj && typeof obj === "object") {
        const sortedHash = Object.keys(obj)
            .sort()
            .map((key) => `${key}:${_objectHash(obj[key], depth + 1)}`)
            .join(",");
        return crypto.createHash("sha256").update(sortedHash).digest("hex");
    }
    return (crypto
        .createHash("sha256")
        // Treat null and undefined as equal for serialization purposes
        .update(JSON.stringify(obj ?? null))
        .digest("hex"));
}
export function generateWrapperFromJestlikeMethods(methods, testRunnerName) {
    const { expect, test, describe, beforeAll, afterAll } = methods;
    async function _createProject(client, datasetId, projectConfig) {
        // Create the project, updating the experimentName until we find a unique one.
        let project;
        let experimentName = randomName();
        for (let i = 0; i < 10; i++) {
            try {
                project = await client.createProject({
                    projectName: experimentName,
                    ...projectConfig,
                    referenceDatasetId: datasetId,
                });
                return project;
            }
            catch (e) {
                // Naming collision
                if (e?.name === "LangSmithConflictError") {
                    const ent = v4().slice(0, 6);
                    experimentName = `${experimentName}-${ent}`;
                }
                else {
                    throw e;
                }
            }
        }
        throw new Error("Could not generate a unique experiment name within 10 attempts." +
            " Please try again.");
    }
    const datasetSetupInfo = new Map();
    function getExampleId(datasetId, inputs, outputs, providedId) {
        if (providedId) {
            return providedId;
        }
        const identifier = JSON.stringify({
            datasetId,
            inputsHash: _objectHash(inputs),
            outputsHash: _objectHash(outputs ?? {}),
        });
        return v5(identifier, UUID5_NAMESPACE);
    }
    async function syncExample(params) {
        const { client, exampleId, inputs, outputs, metadata, split, createdAt, datasetId, } = params;
        let example;
        try {
            example = await client.readExample(exampleId);
            const normalizedSplit = split
                ? typeof split === "string"
                    ? [split]
                    : split
                : undefined;
            const { dataset_split, ...restMetadata } = example.metadata ?? {};
            if (_objectHash(example.inputs) !== _objectHash(inputs) ||
                _objectHash(example.outputs ?? {}) !== _objectHash(outputs ?? {}) ||
                example.dataset_id !== datasetId ||
                (normalizedSplit !== undefined &&
                    _objectHash(dataset_split ?? []) !==
                        _objectHash(normalizedSplit ?? [])) ||
                (metadata !== undefined &&
                    _objectHash(restMetadata ?? {}) !== _objectHash(metadata ?? {}))) {
                await client.updateExample(exampleId, {
                    inputs,
                    outputs,
                    metadata,
                    split,
                    dataset_id: datasetId,
                });
            }
        }
        catch (e) {
            if (e.message.includes("not found")) {
                example = await client.createExample(inputs, outputs, {
                    exampleId,
                    datasetId,
                    createdAt: new Date(createdAt ?? new Date()),
                    split,
                    metadata,
                });
            }
            else {
                throw e;
            }
        }
        return example;
    }
    async function runDatasetSetup(context) {
        const { client: testClient, suiteName: datasetName, projectConfig, } = context;
        let storageValue;
        if (!trackingEnabled(context)) {
            storageValue = {
                createdAt: new Date().toISOString(),
            };
        }
        else {
            let dataset;
            try {
                dataset = await testClient.readDataset({
                    datasetName,
                });
            }
            catch (e) {
                if (e.message.includes("not found")) {
                    dataset = await testClient.createDataset(datasetName, {
                        description: `Dataset for unit tests created on ${new Date().toISOString()}`,
                        metadata: { __ls_runner: testRunnerName },
                    });
                }
                else {
                    throw e;
                }
            }
            const project = await _createProject(testClient, dataset.id, projectConfig);
            const datasetUrl = await testClient.getDatasetUrl({
                datasetId: dataset.id,
            });
            const experimentUrl = `${datasetUrl}/compare?selectedSessions=${project.id}`;
            console.log(`[LANGSMITH]: Experiment starting for dataset "${datasetName}"!\n[LANGSMITH]: View results at ${experimentUrl}`);
            storageValue = {
                dataset,
                project,
                client: testClient,
                experimentUrl,
            };
        }
        return storageValue;
    }
    function wrapDescribeMethod(method, methodName) {
        if (isJsDom()) {
            console.error(`[LANGSMITH]: You seem to be using a jsdom environment. This is not supported and you may experience unexpected behavior. Please set the "environment" or "testEnvironment" field in your test config file to "node".`);
        }
        return function (testSuiteName, fn, experimentConfig) {
            if (typeof method !== "function") {
                throw new Error(`"${methodName}" is not supported by your test runner.`);
            }
            if (testWrapperAsyncLocalStorageInstance.getStore() !== undefined) {
                throw new Error([
                    `You seem to be nesting an ls.describe block named "${testSuiteName}" inside another ls.describe block.`,
                    "This is not supported because each ls.describe block corresponds to a LangSmith dataset.",
                    "To logically group tests, nest the native Jest or Vitest describe methods instead.",
                ].join("\n"));
            }
            const client = experimentConfig?.client ?? DEFAULT_TEST_CLIENT;
            const suiteName = experimentConfig?.testSuiteName ?? testSuiteName;
            let setupPromiseResolver;
            const setupPromise = new Promise((resolve) => {
                setupPromiseResolver = resolve;
            });
            return method(suiteName, () => {
                const startTime = new Date();
                const suiteUuid = v4();
                const environment = experimentConfig?.metadata?.ENVIRONMENT ??
                    getEnvironmentVariable("ENVIRONMENT");
                const nodeEnv = experimentConfig?.metadata?.NODE_ENV ??
                    getEnvironmentVariable("NODE_ENV");
                const langsmithEnvironment = experimentConfig?.metadata?.LANGSMITH_ENVIRONMENT ??
                    getEnvironmentVariable("LANGSMITH_ENVIRONMENT");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const suiteMetadata = {
                    ...experimentConfig?.metadata,
                    __ls_runner: testRunnerName,
                };
                if (environment !== undefined) {
                    suiteMetadata.ENVIRONMENT = environment;
                }
                if (nodeEnv !== undefined) {
                    suiteMetadata.NODE_ENV = nodeEnv;
                }
                if (langsmithEnvironment !== undefined) {
                    suiteMetadata.LANGSMITH_ENVIRONMENT = langsmithEnvironment;
                }
                const context = {
                    suiteUuid,
                    suiteName,
                    client,
                    createdAt: new Date().toISOString(),
                    projectConfig: {
                        ...experimentConfig,
                        metadata: suiteMetadata,
                    },
                    enableTestTracking: experimentConfig?.enableTestTracking,
                    setupPromise,
                };
                beforeAll(async () => {
                    const storageValue = await runDatasetSetup(context);
                    datasetSetupInfo.set(suiteUuid, storageValue);
                    setupPromiseResolver();
                });
                afterAll(async () => {
                    await Promise.all([
                        client.awaitPendingTraceBatches(),
                        ...syncExamplePromises.values(),
                        ...evaluatorLogFeedbackPromises.values(),
                    ]);
                    if (!trackingEnabled(context)) {
                        return;
                    }
                    const examples = [...syncExamplePromises.values()];
                    if (examples.length === 0) {
                        return;
                    }
                    const endTime = new Date();
                    let branch;
                    let commit;
                    let dirty;
                    try {
                        branch = execSync("git rev-parse --abbrev-ref HEAD", {
                            stdio: ["ignore", "pipe", "ignore"],
                        })
                            .toString()
                            .trim();
                        commit = execSync("git rev-parse HEAD", {
                            stdio: ["ignore", "pipe", "ignore"],
                        })
                            .toString()
                            .trim();
                        dirty =
                            execSync("git status --porcelain", {
                                stdio: ["ignore", "pipe", "ignore"],
                            })
                                .toString()
                                .trim() !== "";
                    }
                    catch {
                        return;
                    }
                    if (branch === undefined || commit === undefined) {
                        return;
                    }
                    try {
                        let finalModifiedAt = examples.reduce((latestModifiedAt, example) => {
                            if (new Date(latestModifiedAt).getTime() >
                                new Date(example.modified_at).getTime()) {
                                return latestModifiedAt;
                            }
                            else {
                                return example.modified_at;
                            }
                        }, examples[0].modified_at);
                        if (new Date(finalModifiedAt).getTime() < startTime.getTime()) {
                            finalModifiedAt = endTime.toISOString();
                        }
                        const datasetInfo = datasetSetupInfo.get(suiteUuid);
                        await client.updateProject(datasetInfo.project.id, {
                            metadata: {
                                ...suiteMetadata,
                                commit,
                                branch,
                                dirty,
                            },
                        });
                        await client.updateDatasetTag({
                            datasetId: datasetInfo.dataset.id,
                            asOf: finalModifiedAt,
                            tag: `git:commit:${commit}`,
                        });
                    }
                    catch (e) {
                        console.error(e);
                        return;
                    }
                });
                /**
                 * We cannot rely on setting AsyncLocalStorage in beforeAll or beforeEach,
                 * due to https://github.com/jestjs/jest/issues/13653 and needing to use
                 * the janky .enterWith.
                 *
                 * We also cannot do async setup in describe due to Jest restrictions.
                 * However, .run without asynchronous logic works.
                 *
                 * We really just need a way to pass suiteUuid as global state to inner tests
                 * that can handle concurrently running test suites. If we drop the
                 * concurrency requirement, we can remove this hack.
                 */
                void testWrapperAsyncLocalStorageInstance.run(context, fn);
            });
        };
    }
    const lsDescribe = Object.assign(wrapDescribeMethod(describe, "describe"), {
        only: wrapDescribeMethod(describe.only, "describe.only"),
        skip: wrapDescribeMethod(describe.skip, "describe.skip"),
        concurrent: wrapDescribeMethod(describe.concurrent, "describe.concurrent"),
    });
    function wrapTestMethod(method) {
        return function (name, lsParams, testFn, timeout) {
            // Due to https://github.com/jestjs/jest/issues/13653,
            // we must access the local store value here before
            // doing anything async.
            const context = testWrapperAsyncLocalStorageInstance.getStore();
            if (context !== undefined &&
                lsParams.config?.enableTestTracking !== undefined) {
                context.enableTestTracking = lsParams.config.enableTestTracking;
            }
            const { id, config, inputs, split, metadata, ...rest } = lsParams;
            let referenceOutputs = rest.referenceOutputs;
            if (!referenceOutputs && "outputs" in rest) {
                referenceOutputs = rest.outputs;
            }
            const totalRuns = config?.repetitions ?? 1;
            for (let i = 0; i < totalRuns; i += 1) {
                const testUuid = v4().replace(/-/g, "").slice(0, 13);
                // Jest will not group tests under the same "describe" group if you await the test and
                // total runs is greater than 1.
                const resultsPath = path.join(os.tmpdir(), "langsmith_test_results", `${testUuid}.json`);
                void method(`${name}${totalRuns > 1 ? `, run ${i}` : ""}${TEST_ID_DELIMITER}${testUuid}`, async (...args) => {
                    // Jest will magically introspect args and pass a "done" callback if
                    // we use a non-spread parameter. To obtain and pass Vitest test context
                    // through into the test function, we must therefore refer to Vitest
                    // args using this signature
                    const jestlikeArgs = args[0];
                    if (context === undefined) {
                        throw new Error([
                            `Could not retrieve test context.`,
                            `Please make sure you have tracing enabled and you are wrapping all of your test cases in an "ls.describe()" function.`,
                            `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
                        ].join("\n"));
                    }
                    // Jest .concurrent is super buggy and doesn't wait for beforeAll to complete
                    // before running test functions, so we need to wait for the setup promise
                    // to resolve before we can continue.
                    // Seee https://github.com/jestjs/jest/issues/4281
                    await context.setupPromise;
                    if (!datasetSetupInfo.get(context.suiteUuid)) {
                        throw new Error("Dataset failed to initialize. Please check your LangSmith environment variables.");
                    }
                    const { dataset, createdAt, project, client, experimentUrl } = datasetSetupInfo.get(context.suiteUuid);
                    const testInput = inputs;
                    const testOutput = referenceOutputs ?? {};
                    const testFeedback = [];
                    const onFeedbackLogged = (feedback) => testFeedback.push(feedback);
                    let loggedOutput;
                    const setLoggedOutput = (value) => {
                        if (loggedOutput !== undefined) {
                            console.warn(`[WARN]: New "logOutputs()" call will override output set by previous "logOutputs()" call.`);
                        }
                        loggedOutput = value;
                    };
                    let exampleId;
                    const runTestFn = async () => {
                        let testContext = testWrapperAsyncLocalStorageInstance.getStore();
                        if (testContext === undefined) {
                            throw new Error("Could not identify test context. Please contact us for help.");
                        }
                        return testWrapperAsyncLocalStorageInstance.run({
                            ...testContext,
                            testRootRunTree: trackingEnabled(testContext)
                                ? getCurrentRunTree()
                                : undefined,
                        }, async () => {
                            testContext = testWrapperAsyncLocalStorageInstance.getStore();
                            if (testContext === undefined) {
                                throw new Error("Could not identify test context after setting test root run tree. Please contact us for help.");
                            }
                            try {
                                const res = await testFn(Object.assign(typeof jestlikeArgs === "object" && jestlikeArgs != null
                                    ? jestlikeArgs
                                    : {}, {
                                    ...rest,
                                    inputs: testInput,
                                    referenceOutputs: testOutput,
                                    testMetadata: {
                                        exampleId,
                                        experimentId: project?.id,
                                        datasetId: dataset?.id,
                                        testTrackingEnabled: trackingEnabled(testContext),
                                        repetition: i,
                                        split,
                                    },
                                }));
                                _logTestFeedback({
                                    exampleId,
                                    feedback: { key: "pass", score: true },
                                    context: testContext,
                                    runTree: testContext.testRootRunTree,
                                    client: testContext.client,
                                });
                                if (res != null) {
                                    if (loggedOutput !== undefined) {
                                        console.warn(`[WARN]: Returned value from test function will override output set by previous "logOutputs()" call.`);
                                    }
                                    loggedOutput =
                                        typeof res === "object"
                                            ? res
                                            : { result: res };
                                }
                                return loggedOutput;
                            }
                            catch (e) {
                                _logTestFeedback({
                                    exampleId,
                                    feedback: { key: "pass", score: false },
                                    context: testContext,
                                    runTree: testContext.testRootRunTree,
                                    client: testContext.client,
                                });
                                const rawError = e;
                                const strippedErrorMessage = e.message.replace(STRIP_ANSI_REGEX, "");
                                const langsmithFriendlyError = new Error(strippedErrorMessage);
                                langsmithFriendlyError.rawJestError = rawError;
                                throw langsmithFriendlyError;
                            }
                        });
                    };
                    try {
                        if (trackingEnabled(context)) {
                            const missingFields = [];
                            if (dataset === undefined) {
                                missingFields.push("dataset");
                            }
                            if (project === undefined) {
                                missingFields.push("project");
                            }
                            if (client === undefined) {
                                missingFields.push("client");
                            }
                            if (missingFields.length > 0) {
                                throw new Error(`Failed to initialize test tracking: Could not identify ${missingFields
                                    .map((field) => `"${field}"`)
                                    .join(", ")} while syncing to LangSmith. Please contact us for help.`);
                            }
                            exampleId = getExampleId(dataset.id, inputs, referenceOutputs, id);
                            // TODO: Create or update the example in the background
                            // Currently run end time has to be after example modified time
                            // for examples to render properly, so we must modify the example
                            // first before running the test.
                            if (syncExamplePromises.get(exampleId) === undefined) {
                                syncExamplePromises.set(exampleId, await syncExample({
                                    client,
                                    exampleId,
                                    datasetId: dataset.id,
                                    inputs,
                                    outputs: referenceOutputs ?? {},
                                    metadata,
                                    split,
                                    createdAt,
                                }));
                            }
                            const traceableOptions = {
                                reference_example_id: exampleId,
                                project_name: project.name,
                                metadata: {
                                    ...config?.metadata,
                                },
                                client,
                                tracingEnabled: true,
                                name,
                            };
                            // Pass inputs into traceable so tracing works correctly but
                            // provide both to the user-defined test function
                            const tracedFunction = traceable(async () => {
                                return testWrapperAsyncLocalStorageInstance.run({
                                    ...context,
                                    currentExample: {
                                        inputs,
                                        outputs: referenceOutputs,
                                        id: exampleId,
                                    },
                                    setLoggedOutput,
                                    onFeedbackLogged,
                                }, runTestFn);
                            }, {
                                ...traceableOptions,
                                ...config,
                            });
                            try {
                                await tracedFunction(testInput);
                            }
                            catch (e) {
                                // Extract raw Jest error from LangSmith formatted one and throw
                                if (e.rawJestError !== undefined) {
                                    throw e.rawJestError;
                                }
                                throw e;
                            }
                        }
                        else {
                            try {
                                await testWrapperAsyncLocalStorageInstance.run({
                                    ...context,
                                    currentExample: {
                                        inputs: testInput,
                                        outputs: testOutput,
                                    },
                                    setLoggedOutput,
                                    onFeedbackLogged,
                                }, runTestFn);
                            }
                            catch (e) {
                                // Extract raw Jest error from LangSmith formatted one and throw
                                if (e.rawJestError !== undefined) {
                                    throw e.rawJestError;
                                }
                                throw e;
                            }
                        }
                    }
                    finally {
                        await fs.mkdir(path.dirname(resultsPath), { recursive: true });
                        await fs.writeFile(resultsPath, JSON.stringify({
                            inputs,
                            referenceOutputs,
                            outputs: loggedOutput,
                            feedback: testFeedback,
                            experimentUrl,
                        }));
                    }
                }, timeout);
            }
        };
    }
    function createEachMethod(method) {
        function eachMethod(table, config) {
            const context = testWrapperAsyncLocalStorageInstance.getStore();
            if (context === undefined) {
                throw new Error([
                    `Could not retrieve test context. Make sure your test is nested within a "ls.describe()" block.`,
                    `See this page for more information: https://docs.smith.langchain.com/evaluation/how_to_guides/vitest_jest`,
                ].join("\n"));
            }
            return function (name, fn, timeout) {
                for (let i = 0; i < table.length; i += 1) {
                    const example = table[i];
                    wrapTestMethod(method)(`${name}, item ${i}`, {
                        ...example,
                        inputs: example.inputs,
                        referenceOutputs: example.referenceOutputs,
                        config,
                    }, fn, timeout);
                }
            };
        }
        return eachMethod;
    }
    // Roughly mirrors: https://jestjs.io/docs/api#methods
    const concurrentMethod = Object.assign(wrapTestMethod(test.concurrent), {
        each: createEachMethod(test.concurrent),
        only: Object.assign(wrapTestMethod(test.concurrent.only), {
            each: createEachMethod(test.concurrent.only),
        }),
        skip: Object.assign(wrapTestMethod(test.concurrent.skip), {
            each: createEachMethod(test.concurrent.skip),
        }),
    });
    const lsTest = Object.assign(wrapTestMethod(test), {
        only: Object.assign(wrapTestMethod(test.only), {
            each: createEachMethod(test.only),
        }),
        skip: Object.assign(wrapTestMethod(test.skip), {
            each: createEachMethod(test.skip),
        }),
        concurrent: concurrentMethod,
        each: createEachMethod(test),
    });
    const wrappedExpect = wrapExpect(expect);
    return {
        test: lsTest,
        it: lsTest,
        describe: lsDescribe,
        expect: wrappedExpect,
        toBeRelativeCloseTo,
        toBeAbsoluteCloseTo,
        toBeSemanticCloseTo,
    };
}
export function isInTestContext() {
    const context = testWrapperAsyncLocalStorageInstance.getStore();
    return context !== undefined;
}
export { wrapEvaluator } from "./vendor/evaluatedBy.js";
export * from "./types.js";
