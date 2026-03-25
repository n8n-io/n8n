import { Options } from "./options";

/*
 * The execution module provides information about the current test execution state.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-execution/
 */
declare namespace execution {
    /**
     * Information about the current scenario.
     */
    const scenario: {
        /**
         * The assigned name of the running scenario.
         */
        name: string;
        /**
         * The name of the running Executor type.
         */
        executor: string;
        /**
         * The Unix timestamp in milliseconds when the scenario started.
         */
        startTime: number;
        /**
         * Percentage in a 0 to 1 interval of the scenario progress.
         */
        progress: number;
        /**
         * The unique and zero-based sequential number of the current iteration in the scenario, across the current instance.
         */
        iterationInInstance: number;
        /**
         * The unique and zero-based sequential number of the current iteration in the scenario.
         */
        iterationInTest: number;
    };

    /**
     * Information about the current load generator instance.
     */
    const instance: {
        /**
         * The number of prematurely interrupted iterations in the current instance.
         */
        iterationsInterrupted: number;
        /**
         * The number of completed iterations in the current instance.
         */
        iterationsCompleted: number;
        /**
         * The number of active VUs.
         */
        vusActive: number;
        /**
         * The number of currently initialized VUs.
         */
        vusInitialized: number;
        /**
         * The time passed from the start of the current test run in milliseconds.
         */
        currentTestRunDuration: number;
    };

    /**
     * Control the test execution.
     */
    const test: {
        /**
         * Aborts the test run with the exit code 108.
         * https://grafana.com/docs/k6/latest/javascript-api/k6-execution/#test
         * @param input - Aborted message.
         * @example
         * import exec from "k6/execution";
         * exec.test.abort();
         * exec.test.abort('this is the reason');
         */
        abort(input?: string): void;

        options: Options;
    };

    /**
     * Information about the current virtual user.
     */
    const vu: {
        /**
         * The identifier of the iteration in the current instance.
         */
        iterationInInstance: number;
        /**
         * The identifier of the iteration in the current scenario.
         */
        iterationInScenario: number;
        /**
         * The identifier of the VU across the instance.
         */
        idInInstance: number;
        /**
         * 	The globally unique (across the whole test run) identifier of the VU.
         */
        idInTest: number;

        /**
         * 	Map to set or get VU tags.
         * 	@deprecated should use `metrics.tags` instead of just `tags`
         */
        tags: Record<string, number | string | boolean>;
        metrics: {
            /**
             * 	Map to set or get VU tags.
             */
            tags: Record<string, number | string | boolean>;
            /**
             * 	Map to set or get VU metadata.
             */
            metadata: Record<string, number | string | boolean>;
        };
    };
}

export default execution;
