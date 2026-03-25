import * as tinybench from 'tinybench';
import { VitestRunner, VitestRunnerImportSource, Suite, File, Task, CancelReason, TestContext } from '@vitest/runner';
export { VitestRunner } from '@vitest/runner';
import { a as SerializedConfig } from './chunks/config.d.UqE-KR0o.js';
import '@vitest/pretty-format';
import '@vitest/snapshot';
import '@vitest/snapshot/environment';
import '@vitest/utils/diff';

declare class NodeBenchmarkRunner implements VitestRunner {
	config: SerializedConfig;
	private __vitest_executor;
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
	private __vitest_executor;
	private cancelRun;
	private assertionsErrors;
	pool: string;
	constructor(config: SerializedConfig);
	importFile(filepath: string, source: VitestRunnerImportSource): unknown;
	onCollectStart(file: File): void;
	onAfterRunFiles(): void;
	onAfterRunSuite(suite: Suite): Promise<void>;
	onAfterRunTask(test: Task): void;
	onCancel(_reason: CancelReason): void;
	injectValue(key: string): any;
	onBeforeRunTask(test: Task): Promise<void>;
	onBeforeRunSuite(suite: Suite): Promise<void>;
	onBeforeTryTask(test: Task): void;
	onAfterTryTask(test: Task): void;
	extendTaskContext(context: TestContext): TestContext;
}

export { NodeBenchmarkRunner, VitestTestRunner };
