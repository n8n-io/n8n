import * as chai from 'chai';
import { resolve } from 'node:path';
import { l as loadDiffConfig, b as loadSnapshotSerializers, t as takeCoverageInsideWorker } from './setup-common.AQcDs321.js';
import { distDir } from '../path.js';
import { r as rpc } from './rpc.D9_013TY.js';
import { g as getWorkerState } from './utils.CgTj3MsC.js';

function setupChaiConfig(config) {
	Object.assign(chai.config, config);
}

async function resolveSnapshotEnvironment(config, executor) {
	if (!config.snapshotEnvironment) {
		const { VitestNodeSnapshotEnvironment } = await import('./node.3xsWotC9.js');
		return new VitestNodeSnapshotEnvironment();
	}
	const mod = await executor.executeId(config.snapshotEnvironment);
	if (typeof mod.default !== "object" || !mod.default) {
		throw new Error("Snapshot environment module must have a default export object with a shape of `SnapshotEnvironment`");
	}
	return mod.default;
}

const runnersFile = resolve(distDir, "runners.js");
async function getTestRunnerConstructor(config, executor) {
	if (!config.runner) {
		const { VitestTestRunner, NodeBenchmarkRunner } = await executor.executeFile(runnersFile);
		return config.mode === "test" ? VitestTestRunner : NodeBenchmarkRunner;
	}
	const mod = await executor.executeId(config.runner);
	if (!mod.default && typeof mod.default !== "function") {
		throw new Error(`Runner must export a default function, but got ${typeof mod.default} imported from ${config.runner}`);
	}
	return mod.default;
}
async function resolveTestRunner(config, executor) {
	const TestRunner = await getTestRunnerConstructor(config, executor);
	const testRunner = new TestRunner(config);
	Object.defineProperty(testRunner, "__vitest_executor", {
		value: executor,
		enumerable: false,
		configurable: false
	});
	if (!testRunner.config) {
		testRunner.config = config;
	}
	if (!testRunner.importFile) {
		throw new Error("Runner must implement \"importFile\" method.");
	}
	const [diffOptions] = await Promise.all([loadDiffConfig(config, executor), loadSnapshotSerializers(config, executor)]);
	testRunner.config.diffOptions = diffOptions;
	const originalOnTaskUpdate = testRunner.onTaskUpdate;
	testRunner.onTaskUpdate = async (task, events) => {
		const p = rpc().onTaskUpdate(task, events);
		await originalOnTaskUpdate?.call(testRunner, task, events);
		return p;
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
			state.durations.prepare = 0;
			state.durations.environment = 0;
		});
		rpc().onCollected(files);
		await originalOnCollected?.call(testRunner, files);
	};
	const originalOnAfterRun = testRunner.onAfterRunFiles;
	testRunner.onAfterRunFiles = async (files) => {
		const state = getWorkerState();
		const coverage = await takeCoverageInsideWorker(config.coverage, executor);
		if (coverage) {
			rpc().onAfterSuiteRun({
				coverage,
				testFiles: files.map((file) => file.name).sort(),
				transformMode: state.environment.transformMode,
				projectName: state.ctx.projectName
			});
		}
		await originalOnAfterRun?.call(testRunner, files);
	};
	const originalOnAfterRunTask = testRunner.onAfterRunTask;
	testRunner.onAfterRunTask = async (test) => {
		if (config.bail && test.result?.state === "fail") {
			const previousFailures = await rpc().getCountOfFailedTests();
			const currentFailures = 1 + previousFailures;
			if (currentFailures >= config.bail) {
				rpc().onCancel("test-failure");
				testRunner.onCancel?.("test-failure");
			}
		}
		await originalOnAfterRunTask?.call(testRunner, test);
	};
	return testRunner;
}

export { resolveSnapshotEnvironment as a, resolveTestRunner as r, setupChaiConfig as s };
