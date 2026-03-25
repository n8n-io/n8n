import { chai } from '@vitest/expect';
import { l as loadDiffConfig, b as loadSnapshotSerializers, t as takeCoverageInsideWorker } from './setup-common.Cm-kSBVi.js';
import { r as rpc } from './rpc.BoxB0q7B.js';
import { g as getWorkerState } from './utils.DvEY5TfP.js';
import { V as VitestTestRunner, N as NodeBenchmarkRunner } from './test.B8ej_ZHS.js';

function setupChaiConfig(config) {
	Object.assign(chai.config, config);
}

async function resolveSnapshotEnvironment(config, executor) {
	if (!config.snapshotEnvironment) {
		const { VitestNodeSnapshotEnvironment } = await import('./node.Ce0vMQM7.js');
		return new VitestNodeSnapshotEnvironment();
	}
	const mod = await executor.import(config.snapshotEnvironment);
	if (typeof mod.default !== "object" || !mod.default) throw new Error("Snapshot environment module must have a default export object with a shape of `SnapshotEnvironment`");
	return mod.default;
}

async function getTestRunnerConstructor(config, moduleRunner) {
	if (!config.runner) return config.mode === "test" ? VitestTestRunner : NodeBenchmarkRunner;
	const mod = await moduleRunner.import(config.runner);
	if (!mod.default && typeof mod.default !== "function") throw new Error(`Runner must export a default function, but got ${typeof mod.default} imported from ${config.runner}`);
	return mod.default;
}
async function resolveTestRunner(config, moduleRunner, traces) {
	const testRunner = new (await (getTestRunnerConstructor(config, moduleRunner)))(config);
	// inject private executor to every runner
	Object.defineProperty(testRunner, "moduleRunner", {
		value: moduleRunner,
		enumerable: false,
		configurable: false
	});
	if (!testRunner.config) testRunner.config = config;
	if (!testRunner.importFile) throw new Error("Runner must implement \"importFile\" method.");
	if ("__setTraces" in testRunner) testRunner.__setTraces(traces);
	const [diffOptions] = await Promise.all([loadDiffConfig(config, moduleRunner), loadSnapshotSerializers(config, moduleRunner)]);
	testRunner.config.diffOptions = diffOptions;
	// patch some methods, so custom runners don't need to call RPC
	const originalOnTaskUpdate = testRunner.onTaskUpdate;
	testRunner.onTaskUpdate = async (task, events) => {
		const p = rpc().onTaskUpdate(task, events);
		await originalOnTaskUpdate?.call(testRunner, task, events);
		return p;
	};
	// patch some methods, so custom runners don't need to call RPC
	const originalOnTestAnnotate = testRunner.onTestAnnotate;
	testRunner.onTestAnnotate = async (test, annotation) => {
		const p = rpc().onTaskArtifactRecord(test.id, {
			type: "internal:annotation",
			location: annotation.location,
			annotation
		});
		const overriddenResult = await originalOnTestAnnotate?.call(testRunner, test, annotation);
		const vitestResult = await p;
		return overriddenResult || vitestResult.annotation;
	};
	const originalOnTestArtifactRecord = testRunner.onTestArtifactRecord;
	testRunner.onTestArtifactRecord = async (test, artifact) => {
		const p = rpc().onTaskArtifactRecord(test.id, artifact);
		const overriddenResult = await originalOnTestArtifactRecord?.call(testRunner, test, artifact);
		const vitestResult = await p;
		return overriddenResult || vitestResult;
	};
	const originalOnCollectStart = testRunner.onCollectStart;
	testRunner.onCollectStart = async (file) => {
		await rpc().onQueued(file);
		await originalOnCollectStart?.call(testRunner, file);
	};
	const originalOnCollected = testRunner.onCollected;
	testRunner.onCollected = async (files) => {
		const state = getWorkerState();
		files.forEach((file) => {
			file.prepareDuration = state.durations.prepare;
			file.environmentLoad = state.durations.environment;
			// should be collected only for a single test file in a batch
			state.durations.prepare = 0;
			state.durations.environment = 0;
		});
		rpc().onCollected(files);
		await originalOnCollected?.call(testRunner, files);
	};
	const originalOnAfterRun = testRunner.onAfterRunFiles;
	testRunner.onAfterRunFiles = async (files) => {
		const state = getWorkerState();
		const coverage = await takeCoverageInsideWorker(config.coverage, moduleRunner);
		if (coverage) rpc().onAfterSuiteRun({
			coverage,
			testFiles: files.map((file) => file.name).sort(),
			environment: state.environment.viteEnvironment || state.environment.name,
			projectName: state.ctx.projectName
		});
		await originalOnAfterRun?.call(testRunner, files);
	};
	const originalOnAfterRunTask = testRunner.onAfterRunTask;
	testRunner.onAfterRunTask = async (test) => {
		if (config.bail && test.result?.state === "fail") {
			if (1 + await rpc().getCountOfFailedTests() >= config.bail) {
				rpc().onCancel("test-failure");
				testRunner.cancel?.("test-failure");
			}
		}
		await originalOnAfterRunTask?.call(testRunner, test);
	};
	return testRunner;
}

export { resolveSnapshotEnvironment as a, resolveTestRunner as r, setupChaiConfig as s };
