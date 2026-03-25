/*
 * Program options.
 * https://grafana.com/docs/k6/latest/using-k6/k6-options/
 */

import { CipherSuite } from "./http";

/**
 * Program options.
 * https://grafana.com/docs/k6/latest/using-k6/k6-options/
 */
export interface Options {
    /** Maximum parallel `http.batch()` connections per VU. */
    batch?: number;

    /** Maximum parallel `http.batch()` host connections per VU. */
    batchPerHost?: number;

    /** Blacklist IP ranges from being called. */
    blacklistIPs?: string[];

    /** Blacklist hostnames from being called. Wildcards are supported. */
    blockHostnames?: string[];

    /** Discard response bodies. */
    discardResponseBodies?: boolean;

    /** DNS resolution behavior. https://grafana.com/docs/k6/latest/using-k6/k6-options#dns */
    dns?: {
        /** 0, inf, or any time duration(60s, 5m30s, 10m, 2h). */
        ttl: string;

        select: "first" | "random" | "roundRobin";

        policy: "preferIPv4" | "preferIPv6" | "onlyIPv4" | "onlyIPv6" | "any";
    };

    /** Test duration. */
    duration?: string;

    /** Partition the test run in different segments. https://grafana.com/docs/k6/latest/using-k6/k6-options#execution-segment */
    executionSegment?: string;

    /** Define the sequence segment to run. https://grafana.com/docs/k6/latest/using-k6/k6-options#execution-segment */
    executionSegmentSequence?: string;

    /** Third party collector configuration. */
    ext?: { [name: string]: CollectorOptions };

    /** Cloud options */
    cloud?: CloudOptions;

    /** Static hostname mapping. */
    hosts?: { [name: string]: string };

    /** Log all HTTP requests and responses. */
    httpDebug?: string;

    /** Disable TLS verification. Insecure. */
    insecureSkipTLSVerify?: boolean;

    /** Iterations to execute. */
    iterations?: number;

    /** Persist the k6 process after test completion. */
    linger?: boolean;

    /** Maximum HTTP redirects to follow. */
    maxRedirects?: number;

    /** Minimum test iteration duration. */
    minIterationDuration?: string;

    /** Disable keepalive connections. */
    noConnectionReuse?: boolean;

    /** This disables the default behavior of resetting the cookie jar after each VU iteration. If it's enabled, saved cookies will be persisted across VU iterations.. */
    noCookiesReset?: boolean;

    /** Disable usage reports. */
    noUsageReport?: boolean;

    /** Disable cross-VU TCP connection reuse. */
    noVUConnectionReuse?: boolean;

    /** Start test in paused state. */
    paused?: boolean;

    /** Maximum requests per second across all VUs. */
    rps?: number;

    /** Scenario specifications. */
    scenarios?: { [name: string]: Scenario };

    /** Setup function timeout. */
    setupTimeout?: string;

    /** Test stage specifications. Program of target VU stages. */
    stages?: Stage[];

    /** Define stats for trend metrics. */
    summaryTrendStats?: string[];

    /** Which system tags to include in collected metrics. */
    systemTags?: string[];

    /** Tags to set test wide across all metrics. */
    tags?: { [name: string]: string };

    /** Teardown function timeout. */
    teardownTimeout?: string;

    /** Threshold specifications. Defines pass and fail conditions. */
    thresholds?: { [name: string]: Threshold[] };

    /** Throw error on failed HTTP request. */
    throw?: boolean;

    /** TLS client certificates. */
    tlsAuth?: Certificate[];

    /** Allowed TLS cipher suites. */
    tlsCipherSuites?: CipherSuite[];

    /** Allowed TLS version. Use `http.SSL_*` `http.TLS_*` constants. */
    tlsVersion?: string | { min: string; max: string };

    /** User agent string to include in HTTP requests. */
    userAgent?: string;

    /** Number of VUs to run concurrently. */
    vus?: number;

    /** Maximum VUs. Preallocates VUs to enable faster scaling. */
    vusMax?: number;
}

/**
 * Third party collector configuration.
 */
export interface CollectorOptions {
    [name: string]: any;
}

/**
 * Options for the cloud.
 */
export interface CloudOptions {
    [name: string]: any;
}

/**
 * Test stage.
 */
export interface Stage {
    /** Stage duration. */
    duration: string;

    /** Target number of VUs. */
    target: number;
}

/**
 * Threshold specification.
 * https://grafana.com/docs/k6/latest/using-k6/thresholds/
 */
export type Threshold = string | ObjectThreshold;

/**
 * Object form threshold specification.
 * https://grafana.com/docs/k6/latest/using-k6/thresholds/
 */
export interface ObjectThreshold {
    /** Abort test if threshold violated. */
    abortOnFail?: boolean;

    /** Duration to delay evaluation. Enables collecting additional metrics. */
    delayAbortEval?: string;

    /** Threshold expression. */
    threshold: string;
}

/**
 * TLS client certificate.
 */
export interface Certificate {
    /** PEM encoded certificate. */
    cert: string;

    /** Domains certificate is valid for. */
    domains?: string[];

    /** PEM encoded certificate key. */
    key: string;

    /** PEM passphrase. */
    password?: string;
}

export type ExecutorOptions =
    | "shared-iterations"
    | "per-vu-iterations"
    | "constant-vus"
    | "ramping-vus"
    | "constant-arrival-rate"
    | "ramping-arrival-rate"
    | "externally-controlled";

/**
 * BaseScenario.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/
 */
export abstract class BaseScenario {
    /**
     * Executor type.  Options available:
     * - `shared-iterations`
     * - `per-vu-iterations`
     * - `constant-vus`
     * - `ramping-vus`
     * - `constant-arrival-rate`
     * - `ramping-arrival-rate`
     * - `externally-controlled`
     */
    executor: ExecutorOptions;

    /**
     * Time offset since the start of the test, at which point this scenario should begin execution.
     *
     * Default value is 0s.
     */
    startTime?: string;

    /**
     * Time to wait for iterations to finish executing before stopping them forcefully.
     * See https://grafana.com/docs/k6/latest/using-k6/scenarios#graceful-stop-and-ramp-down/
     *
     * Default value is 30s
     */
    gracefulStop?: string;

    /**
     * Name of exported JS function to execute.
     *
     * The default value is "default".
     */
    exec?: string;

    /** Environment variables specific to this scenario.  */
    env?: { [name: string]: string };

    /** Tags specific to this scenario. */
    tags?: { [name: string]: string };

    /** Additional options for each scenario */
    options?: ScenarioOptions;
}

/**
 * A fixed amount of iterations are shared between a number of VUs.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/shared-iterations/
 */
export interface SharedIterationsScenario extends BaseScenario {
    executor: "shared-iterations";
    /**
     * Number of VUs to run concurrently.
     *
     * The default value is 1.
     */
    vus?: number;

    /**
     * Number of iterations to execute across all VUs.
     *
     * The default value is 1.
     */
    iterations?: number;

    /**
     * Maximum scenario duration before it's forcibly stopped (excluding gracefulStop).
     *
     * The default value is 10m.
     */
    maxDuration?: string;
}

/**
 * Each VU executes an exact number of iterations.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/
 */
export interface PerVUIterationsScenario extends BaseScenario {
    executor: "per-vu-iterations";
    /**
     * Number of VUs to run concurrently.
     *
     * The default value is 1.
     */
    vus?: number;

    /**
     * Number of iterations to execute across per VU.
     *
     * The default value is 1.
     */
    iterations?: number;

    /**
     * Maximum scenario duration before it's forcibly stopped (excluding gracefulStop).
     *
     * The default value is 10m.
     */
    maxDuration?: string;
}

/**
 * A fixed number of VUs execute as many iterations as possible for a specified amount of time.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-vus/
 */
export interface ConstantVUsScenario extends BaseScenario {
    executor: "constant-vus";

    /**
     * Number of VUs to run concurrently.
     *
     * The default value is 1.
     */
    vus?: number;

    /**
     * Total scenario duration (excluding `gracefulStop`)
     */
    duration: string;
}

/**
 * A variable number of VUs execute as many iterations as possible for a specified amount of time.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-vus/
 */
export interface RampingVUsScenario extends BaseScenario {
    executor: "ramping-vus";

    /** Array of objects that specify the number of VUs to ramp up or down to. */
    stages: Stage[];

    /**
     * Number of VUs to run at test start.
     *
     * The default value is 1.
     */
    startVUs?: number;

    /**
     * Time to wait for an already started iteration to finish before stopping it during a ramp down.
     *
     * The default value is 30s.
     */
    gracefulRampDown?: string;
}

/**
 * A fixed number of iterations are executed in a specified period of time.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/
 */
export interface ConstantArrivalRateScenario extends BaseScenario {
    executor: "constant-arrival-rate";

    /** Total scenario duration (excluding `gracefulStop`) */
    duration: string;

    /** Number of iterations to execute each `timeUnit` period. */
    rate: number;

    /**
     * Period of time to apply the `rate` value.
     *
     * The default value is 1s.
     */
    timeUnit?: string;

    /** Number of VUs to pre-allocate before test start in order to preserve runtime resources. */
    preAllocatedVUs: number;

    /**
     * Maximum number of VUs to allow during the test run.
     *
     * The default value is the value of the `preAllocatedVUs` option.
     */
    maxVUs?: number;
}

/**
 * A variable number of iterations are executed in a specified period of time.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/
 */
export interface RampingArrivalRateScenario extends BaseScenario {
    executor: "ramping-arrival-rate";

    /** Maximum number of VUs to allow during the test run. */
    maxVUs?: number;

    /** Array of objects that specify the number of iterations to ramp up or down to. */
    stages: Stage[];

    /** Number of iterations to execute each `timeUnit` period at test start. */
    startRate?: number;

    /**
     * Period of time to apply the `startRate` the `stages` target value..
     *
     * The default value is 1s.
     */
    timeUnit?: string;

    /** Number of VUs to pre-allocate before test start in order to preserve runtime resources. */
    preAllocatedVUs: number;
}

/**
 * Control and scale execution at runtime via k6's REST API or the CLI.
 *
 * https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/externally-controlled/
 */
export interface ExternallyControlledScenario extends BaseScenario {
    executor: "externally-controlled";

    /**
     * Number of VUs to run concurrently.
     *
     * The default value is 1.
     */
    vus?: number;

    /** Total scenario duration (excluding `gracefulStop`) */
    duration: string;

    /** Maximum number of VUs to allow during the test run. */
    maxVUs?: number;
}

export type Scenario =
    | SharedIterationsScenario
    | PerVUIterationsScenario
    | ConstantVUsScenario
    | RampingVUsScenario
    | ConstantArrivalRateScenario
    | RampingArrivalRateScenario
    | ExternallyControlledScenario;

export interface ScenarioOptions {
    /** Browser specific options */
    browser?: any;
}
