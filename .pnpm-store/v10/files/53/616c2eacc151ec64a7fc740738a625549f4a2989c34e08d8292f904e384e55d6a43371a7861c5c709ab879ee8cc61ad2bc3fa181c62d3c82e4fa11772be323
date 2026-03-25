import { Suite, FullConfig, Reporter, TestError } from '@playwright/test/reporter';
import { C as CurrentsConfig } from '../config-CpBTcbgS.js';
import { FullConfig as FullConfig$1 } from '@playwright/test';

type DebugMode = boolean | "remote" | "full";

type LastRunStatus = "failed" | "passed";
type LastRunFileData = {
    status: LastRunStatus;
    failedTests: string[];
};
type LastRunDataForProject = {
    project: string;
    path: string;
    data: LastRunFileData | null;
};
type LastRunData = LastRunDataForProject[];

declare function getFullTestSuite(suite: Suite, config: FullConfig): {
    name: string;
    tags: string[];
    tests: {
        isOnly: boolean;
        title: string[];
        spec: string;
        tags: string[];
        testId: string;
    }[];
}[];

type DebugSource = "pwc" | "core" | "pwc-p" | "or8n";
declare class RemoteDebug {
    private source;
    static instance: RemoteDebug;
    static factory(source?: DebugSource): RemoteDebug;
    private pipelines;
    private mode;
    private debug;
    private constructor();
    getDebugMode(): DebugMode;
    finalize({ runId }?: {
        runId?: string;
    }): Promise<void>;
    uploadDebug(id: string, runId: string): Promise<void>;
    private shouldEnableDebug;
    private shouldUploadRemoteDebug;
    private shouldMuteLocalStdout;
}

declare class OrchestrationPrinter {
    readonly pwConfig: FullConfig$1;
    readonly suite: Suite;
    readonly currentsConfig: CurrentsConfig | null;
    constructor(pwConfig: FullConfig$1, suite: Suite, currentsConfig?: CurrentsConfig | null);
    getIntro(params: {
        sessionId?: string;
        ciBuildId: string | null;
        machineId: string | null;
    }): string;
}

declare class OrchestrationReporter implements Reporter {
    private configLoader;
    pwConfig: FullConfig | null;
    pwSuite: Suite | null;
    lastRunData: LastRunData | null;
    fullSuite: ReturnType<typeof getFullTestSuite> | null;
    printer: OrchestrationPrinter | null;
    remoteDebug: RemoteDebug;
    constructor(reporterOptions: Partial<CurrentsConfig>);
    printsToStdio(): boolean;
    onBegin(config: FullConfig, suite: Suite): void;
    onError(err: TestError): void;
    private getOrchestrationAPI;
    onEnd(): Promise<void>;
}

export { OrchestrationReporter as default };
