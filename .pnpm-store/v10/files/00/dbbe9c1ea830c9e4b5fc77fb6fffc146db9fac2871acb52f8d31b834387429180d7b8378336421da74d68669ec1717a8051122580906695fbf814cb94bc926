import { AsyncLocalStorage } from "node:async_hooks";
import { Dataset, TracerSession, Example } from "../../schemas.js";
import { Client, CreateProjectParams } from "../../client.js";
import { RunTree } from "../../run_trees.js";
import { SimpleEvaluationResult } from "./types.js";
export declare const DEFAULT_TEST_CLIENT: Client;
export type TestWrapperAsyncLocalStorageData = {
    enableTestTracking?: boolean;
    dataset?: Dataset;
    createdAt: string;
    projectConfig?: Partial<CreateProjectParams>;
    project?: TracerSession;
    setLoggedOutput?: (value: Record<string, unknown>) => void;
    onFeedbackLogged?: (feedback: SimpleEvaluationResult) => void;
    currentExample?: Partial<Example> & {
        syncPromise?: Promise<Example>;
    };
    client: Client;
    suiteUuid: string;
    suiteName: string;
    testRootRunTree?: RunTree;
    setupPromise?: Promise<void>;
};
export declare const testWrapperAsyncLocalStorageInstance: AsyncLocalStorage<TestWrapperAsyncLocalStorageData>;
export declare function trackingEnabled(context: TestWrapperAsyncLocalStorageData): boolean;
export declare const evaluatorLogFeedbackPromises: Set<unknown>;
export declare const syncExamplePromises: Map<any, any>;
export declare function _logTestFeedback(params: {
    exampleId?: string;
    feedback: SimpleEvaluationResult;
    context: TestWrapperAsyncLocalStorageData;
    runTree?: RunTree;
    client: Client;
    sourceRunId?: string;
}): void;
