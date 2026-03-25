/**
 * The last known status of the current orchestration session, contains results from all the machines participating in the orchestration.
 *
 * @example
 * When all the tests are completed, the status will look like this:
 * ```json
 * {
 *    specs: {
 *       overall: 10,
 *       claimed: 5,
 *       completed: 3,
 *       passes: 2,
 *       failures: 1,
 *    },
 *    tests: {
 *       overall: 100,
 *       failures: 10,
 *       passes: 80,
 *       ignored: 5,
 *       flaky: 5,
 *    },
 * }
 * ```
 *
 *
 * @example
 * If no results were reported, all the value are `-1`
 *
 * ```json
 * {
 *    specs: {
 *       overall: -1,
 *       claimed: -1,
 *       completed: -1,
 *       passes: -1,
 *       failures: -1,
 *    },
 *    tests: {
 *       overall: -1,
 *       failures: -1,
 *       passes: -1,
 *       ignored: -1,
 *       flaky: -1,
 *    },
 * }
 * ```
 */
type OrchestrationStatus = {
    specs: {
        overall: number;
        claimed: number;
        completed: number;
        passes: number;
        failures: number;
    };
    tests: {
        overall: number;
        failures: number;
        passes: number;
        ignored: number;
        flaky: number;
    };
};

type ResetSignal = "SIGUSR1" | "SIGUSR2";
type CurrentsConfigOrchestration = {
    /**
     * OS signal to use for resetting the currently running spec files.
     */
    resetSignal?: ResetSignal;
    /**
     * Prevents injecting Currents reporter when running orchestrated tasks. Requires manually adding Currents reporter to Playwright configuration.
     */
    skipReporterInjection?: boolean;
    /**
     * An optional callback that will be called when the orchestration completed. * @see {@link OrchestrationStatus} for the returned data structure
     *
     * @param result the last knowns orchestration status
     * @returns
     */
    onFinish?: (status: OrchestrationStatus) => Promise<void>;
    /**
     * Configuration for setting the batch size for the orchestration. If provided batched orchestration will be executed.
     */
    batchSize?: "auto" | number;
};
type CurrentsConfigCoverage = {
    /**
     * The projects for which coverage will be collected.
     *
     * If set to `true`, coverage will be collected for all projects.
     * If set to an array of project names, coverage will be collected only for those specified projects.
     * If set to an empty array, coverage will be collected for all projects.
     * If not set or set to `false`, coverage collection will be disabled.
     */
    projects?: boolean | string[];
    /**
     * The directory where the coverage report will be read from.
     */
    dir?: string;
};
type CurrentsConfig = {
    /**
     * The id of the build to record the test run. Read more: https://docs.currents.dev/guides/ci-build-id
     */
    ciBuildId?: string;
    /**
     * The id of the project to record the test run.
     */
    projectId: string;
    /**
     * The record key to be used to record the results on the remote dashboard. Read more: https://docs.currents.dev/guides/record-key
     */
    recordKey: string;
    /**
     * A list of tags to be added to the test run.
     */
    tag?: string[];
    /**
     * experimental - enable reporting test-level results
     */
    enableTestResults?: boolean;
    /**
     * remove tags from test names, for example `Test name @smoke` becomes `Test name`
     */
    removeTitleTags?: boolean;
    /**
     * disable extracting tags from test title, e.g. `Test name @smoke` would not be tagged with `smoke`
     */
    disableTitleTags?: boolean;
    /**
     * Abort the run after the specified number of failed tests. Overrides the default Currents Project settings.
     * If set, must be a positive integer or "false" to disable
     */
    cancelAfterFailures?: number | false;
    /**
     * Path to the full test suite file for orchestration and reporting
     */
    testSuiteFile?: string;
    /**
     * Unique identifier of the machine running the tests. If not provided, it will be generated automatically. See: https://docs.currents.dev/?q=machineId
     */
    machineId?: string;
    /**
     * The orchestration id to be used to record the results on the remote dashboard. See: https://docs.currents.dev/?q=orchestrationId
     */
    orchestrationId?: string;
    /**
     * Path to the file where the run summary output will be written.
     * See: https://docs.currents.dev/?q=outputFile
     */
    outputFile?: string;
    /**
     * Configuration for Currents Orchestration
     */
    orchestration?: CurrentsConfigOrchestration;
    /**
     * Configuration for Currents Coverage
     */
    coverage?: CurrentsConfigCoverage;
};

export type { CurrentsConfig as C, OrchestrationStatus as O };
