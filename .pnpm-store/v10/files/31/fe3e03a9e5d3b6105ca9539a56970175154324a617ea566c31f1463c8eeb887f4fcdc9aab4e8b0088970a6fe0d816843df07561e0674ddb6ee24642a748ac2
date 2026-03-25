import * as playwright_test from 'playwright/test';
import { BrowserContext } from '@playwright/test';
import { C as CurrentsConfig } from './config-CpBTcbgS.js';
export { O as OrchestrationStatus } from './config-CpBTcbgS.js';
import { Reporter, TestCase, TestResult, FullConfig, Suite, TestError, TestStep, FullResult } from '@playwright/test/reporter';

type GhaEventData = {
    headRef: string;
    headSha: string;
    baseRef: string;
    baseSha: string;
    issueUrl: string;
    htmlUrl: string;
    prTitle: string;
    senderAvatarUrl: string;
    senderHtmlUrl: string;
};
type Commit = {
    sha: string;
    branch: string;
    authorName: string;
    authorEmail: string;
    message: string;
    remoteOrigin: string;
    defaultBranch: null;
    ghaEventData?: GhaEventData;
};

declare const OPS: {
    readonly EQ: "eq";
    readonly NEQ: "neq";
    readonly IN: "in";
    readonly NOTIN: "notIn";
    readonly ANY: "any";
    readonly EMPTY: "empty";
    readonly INC: "inc";
    readonly NOTINC: "notInc";
    readonly INCALL: "incAll";
    readonly NOTINCALL: "notIncAll";
};
type OP = (typeof OPS)[keyof typeof OPS];
declare const ACTION_TYPE: {
    readonly SKIP: "skip";
    readonly QUARANTINE: "quarantine";
    readonly TAG: "tag";
};
type ACTION_TYPE = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

type RuleSkipAction = {
    op: Extract<ACTION_TYPE, "skip">;
    details: null;
};
type RuleQuarantineAction = {
    op: Extract<ACTION_TYPE, "quarantine">;
    details: null;
};
type RuleTagAction = {
    op: Extract<ACTION_TYPE, "tag">;
    details: {
        tags: string[];
    };
};
type RuleAction = RuleSkipAction | RuleQuarantineAction | RuleTagAction;
type RuleCombinator = "AND" | "OR";
type RuleCondOperator = OP;
type RuleMatcherValue = string | string[] | null;
type RuleMatcherCond = {
    op: RuleCondOperator;
    value: RuleMatcherValue;
    type: "testId" | "project" | "title" | "titlePath" | "tag" | "annotation" | "file" | "git_branch" | "git_authorName" | "git_authorEmail" | "git_remoteOrigin" | "git_message" | "error_message";
};
type RuleMatcher = {
    cond: RuleMatcherCond[];
    op: RuleCombinator;
};
type Action = {
    _id?: string;
    v: number;
    name: string;
    description?: string | null;
    action: RuleAction[];
    matcher: RuleMatcher;
    createdAt: Date;
    createdBy: string;
    updatedAt?: Date;
    updatedBy?: string;
    disabledAt?: Date;
    disabledBy?: string;
    archivedAt?: Date;
    archivedBy?: string;
    expiresAfter?: Date;
};

/**
 * Currents test fixtures for playwright test runner
 *
 * @property {Action[]} currentsActions - All the actions for your Currents project
 * @property {BrowserContext} context - The playwright browser context used for coverage
 *
 * @example
 * ```typescript
 * import { fixtures, CurrentsFixtures, CurrentsWorkerFixtures } from "@currents/playwright";
 * import { test as base } from "@playwright/test";
 *
 * export const test = base.extend<CurrentsFixtures, CurrentsWorkerFixtures>({...fixtures.baseFixtures, ...fixtures.coverageFixtures, ...fixtures.actionsFixtures});
 * ```
 */
type CurrentsFixtures = {
    currentsActions: Action[];
    context: BrowserContext;
    currentsBatchSize?: "auto" | number;
};
/**
 * Currents worker fixtures for playwright test runner
 *
 * @property {Partial<CurrentsConfig>} currentsConfig - The fully parsed Currents configuration
 * @property {Partial<CurrentsConfig>} currentsConfigOptions - Currents configuration provided through the playwright config
 * @property {boolean} currentsFixturesEnabled - Whether the Currents fixtures are enabled, defaults to true
 * @property {Commit} gitInfo - The git commit information if available
 *
 * @example
 * ```typescript
 * import { fixtures, CurrentsFixtures, CurrentsWorkerFixtures } from "@currents/playwright";
 * import { test as base } from "@playwright/test";
 *
 * export const test = base.extend<CurrentsFixtures, CurrentsWorkerFixtures>(fixtures.baseFixtures);
 * ```
 */
type CurrentsWorkerFixtures = {
    currentsConfig: Partial<CurrentsConfig>;
    currentsConfigOptions: Partial<CurrentsConfig>;
    currentsFixturesEnabled: boolean;
    gitInfo: Commit;
};

declare class DefaultReporter implements Reporter {
    private configLoader;
    private errors;
    private _testActor;
    private readonly startTime;
    private fullConfig;
    private remoteDebug;
    constructor(reporterOptions?: Partial<CurrentsConfig>);
    printsToStdio(): boolean;
    onStdOut(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void;
    onStdErr(chunk: string | Buffer, test: void | TestCase, result: void | TestResult): void;
    onBegin(config: FullConfig, suite: Suite): void;
    onError(error: TestError): void;
    onStepBegin(test: TestCase, result: TestResult, step: TestStep): void;
    onStepEnd(test: TestCase, result: TestResult, step: TestStep): void;
    onTestBegin(test: TestCase): void;
    onTestEnd(test: TestCase, result: TestResult): void;
    onEnd(fullResult: FullResult): Promise<FullResult | {
        status: "failed" | "passed";
    }>;
    private onC12ConfigLoaded;
    private get testActor();
    private isOr8nEventMode;
}

type CurrentsTestState = "failed" | "passed" | "pending" | "skipped";

type ProjectId = string;
type ExecutionJSONSummary = {
    runId: string | null;
    url: string | null;
    ciBuildId: string | null;
    discovery?: any;
    results: {
        tests: {
            overall: number;
            flaky: number;
            failed: number;
            skipped: number;
            passed: number;
        };
    };
    details: {
        projectId: ProjectId;
        url: string | null;
        specName: string;
        title: string[];
        status: CurrentsTestState;
        isFlaky: boolean;
        durationMs: number;
        attempts: {
            attemptIndex: number;
            status: string;
            errorMessage: string | null;
        }[];
    }[];
};

/**
 * Create {@link https://currents.dev/playwright | Currents Reporter} to be used with playwright test runner
 *
 * @augments CurrentsConfig
 * @param {CurrentsConfig} config - Currents Reporter {@link https://docs.currents.dev/integration-with-playwright/currents-playwright | configuration}
 * @returns {["@currents/playwright", CurrentsConfig]} a tuple of reporter name and config
 */
declare const currentsReporter: (config?: CurrentsConfig) => [string, CurrentsConfig];
/**
 * @namespace fixtures
 * @description Currents fixtures for playwright test runner
 */
declare const fixtures: {
    /**
     * Default Currents fixtures for playwright test runner
     *
     * @property {Partial<CurrentsConfig>} currentsConfig - The fully parsed Currents configuration
     * @property {Partial<CurrentsConfig>} currentsConfigOptions - Currents configuration provided through the playwright config
     * @property {boolean} currentsFixturesEnabled - Whether the Currents fixtures are enabled, defaults to true
     * @property {Commit} gitInfo - The git commit information if available
     *
     * @example
     * ```typescript
     * import { fixtures, CurrentsFixtures, CurrentsWorkerFixtures } from "@currents/playwright";
     * import { test as base } from "@playwright/test";
     *
     * export const test = base.extend<CurrentsFixtures, CurrentsWorkerFixtures>({...fixtures.baseFixtures, ...coverageFixtures});
     * ```
     */
    baseFixtures: playwright_test.Fixtures<CurrentsFixtures, CurrentsWorkerFixtures, playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
    /**
     * Coverage Fixtures for playwright test runner
     *
     * @property {BrowserContext} context - The playwright browser context used for coverage
     */
    coverageFixtures: playwright_test.Fixtures<CurrentsFixtures, CurrentsWorkerFixtures, playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
    /**
     * Currents Actions Fixtures for playwright test runner
     *
     * @property {Action[]} currentsActions - All the actions for your Currents project
     */
    actionFixtures: playwright_test.Fixtures<CurrentsFixtures, CurrentsWorkerFixtures, playwright_test.PlaywrightTestArgs & playwright_test.PlaywrightTestOptions, playwright_test.PlaywrightWorkerArgs & playwright_test.PlaywrightWorkerOptions>;
};
/**
 * @namespace configHelpers
 * @description Currents configuration helpers
 */
declare const configHelpers: {
    /**
     * Include Currents wrappers by wrapping your `use` statements in this helper
     *
     * @param {Partial<CurrentsConfig>} config - Currents config to be used
     * @param {PlaywrightTestConfig["use"]} use - Your normal playwright `use` configuration
     * @returns {PlaywrightTestConfig["use"]} The playwright `use` configuration with Currents wrappers
     *
     * @example
     * ```typescript
     * import { configHelpers } from "@currents/playwright";
     * import { defineConfig, devices } from "@playwright/test";
     *
     *
     * const config = defineConfig({
     *   reporter: [currentsReporter({})],
     *
     *   use: configHelpers.includeCurrentsWrappers({}, {
     *     trace: "on",
     *   }),
     *
     *   projects: [
     *     {
     *       name: "chromium",
     *       use: {
     *         ...devices["Desktop Chrome"],
     *       },
     *     },
     *   ],
     * });
     *
     * export default config;
     * ```
     */
    includeCurrentsWrappers: <T, W>(use?: playwright_test.PlaywrightTestConfig<T & CurrentsFixtures, W & CurrentsWorkerFixtures>["use"]) => (Partial<playwright_test.PlaywrightWorkerOptions & {}> & Partial<playwright_test.PlaywrightTestOptions & {}>) | undefined;
};

export { type Commit, CurrentsConfig, type CurrentsFixtures, type CurrentsWorkerFixtures, type ExecutionJSONSummary, configHelpers, currentsReporter, DefaultReporter as default, fixtures };
