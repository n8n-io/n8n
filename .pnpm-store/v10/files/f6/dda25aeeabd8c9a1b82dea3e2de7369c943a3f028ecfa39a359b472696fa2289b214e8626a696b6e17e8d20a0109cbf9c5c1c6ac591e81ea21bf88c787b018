import * as tinybench from 'tinybench';
import { VitestRunner, VitestRunnerImportSource, Suite, File, Task, CancelReason, Test, TestContext, ImportDuration } from '@vitest/runner';
export { VitestRunner } from '@vitest/runner';
import { S as SerializedConfig } from './chunks/config.d.CzIjkicf.js';
import { T as Traces } from './chunks/traces.d.402V_yFI.js';
import '@vitest/pretty-format';
import '@vitest/snapshot';
import '@vitest/utils/diff';

declare class NodeBenchmarkRunner implements VitestRunner {
	config: SerializedConfig;
	private moduleRunner;
	constructor(config: SerializedConfig);
	importTinybench(): Promise<typeof tinybench>;
	importFile(filepath: string, source: VitestRunnerImportSource): unknown;
	runSuite(suite: Suite): Promise<void>;
	runTask(): Promise<void>;
}

declare class VitestTestRunner implements VitestRunner {
	config: SerializedConfig;
	private snapshotClient;
	private workerState;
	private moduleRunner;
	private cancelRun;
	private assertionsErrors;
	pool: string;
	private _otel;
	viteEnvironment: string;
	constructor(config: SerializedConfig);
	importFile(filepath: string, source: VitestRunnerImportSource): unknown;
	onCollectStart(file: File): void;
	onCleanupWorkerContext(listener: () => unknown): void;
	onAfterRunFiles(): void;
	getWorkerContext(): Record<string, unknown>;
	onAfterRunSuite(suite: Suite): Promise<void>;
	onAfterRunTask(test: Task): void;
	cancel(_reason: CancelReason): void;
	injectValue(key: string): any;
	onBeforeRunTask(test: Task): Promise<void>;
	onBeforeRunSuite(suite: Suite): Promise<void>;
	onBeforeTryTask(test: Task): void;
	onAfterTryTask(test: Test): void;
	extendTaskContext(context: TestContext): TestContext;
	getImportDurations(): Record<string, ImportDuration>;
	trace: <T>(name: string, attributes: Record<string, any> | (() => T), cb?: () => T) => T;
	__setTraces(traces: Traces): void;
}

export { NodeBenchmarkRunner, VitestTestRunner };
