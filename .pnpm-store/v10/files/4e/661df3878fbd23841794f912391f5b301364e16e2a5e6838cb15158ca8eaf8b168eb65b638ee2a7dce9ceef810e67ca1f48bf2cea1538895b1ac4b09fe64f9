import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import timers from 'node:timers';
import timersPromises from 'node:timers/promises';
import util from 'node:util';
import { startTests, collectTests } from '@vitest/runner';
import { KNOWN_ASSET_TYPES } from '@vitest/utils/constants';
import { s as setupChaiConfig, r as resolveTestRunner, a as resolveSnapshotEnvironment } from '../chunks/index.6Qv1eEA6.js';
import { c as setupCommonEnv, s as startCoverageInsideWorker, a as stopCoverageInsideWorker } from '../chunks/setup-common.Cm-kSBVi.js';
import { i as index } from '../chunks/index.Z5E_ObnR.js';
import { c as closeInspector } from '../chunks/inspector.CvyFGlXm.js';
import { g as getWorkerState } from '../chunks/utils.DvEY5TfP.js';
import { g as globalExpect } from '../chunks/vi.2VT5v0um.js';
import '@vitest/expect';
import '../chunks/rpc.BoxB0q7B.js';
import '@vitest/utils/timers';
import '../chunks/index.Chj8NDwU.js';
import '../chunks/test.B8ej_ZHS.js';
import '@vitest/utils/helpers';
import '../chunks/benchmark.B3N2zMcH.js';
import '@vitest/runner/utils';
import '@vitest/utils/error';
import 'pathe';
import '../chunks/coverage.D_JHT54q.js';
import '@vitest/snapshot';
import '../chunks/evaluatedModules.Dg1zASAC.js';
import 'vite/module-runner';
import 'expect-type';
import 'node:url';
import '@vitest/spy';
import '@vitest/utils/offset';
import '@vitest/utils/source-map';
import '../chunks/_commonjsHelpers.D26ty3Ew.js';
import '../chunks/date.Bq6ZW5rf.js';

async function run(method, files, config, moduleRunner, traces) {
	const workerState = getWorkerState();
	await traces.$("vitest.runtime.global_env", () => setupCommonEnv(config));
	Object.defineProperty(globalThis, "__vitest_index__", {
		value: index,
		enumerable: false
	});
	const viteEnvironment = workerState.environment.viteEnvironment || workerState.environment.name;
	globalExpect.setState({ environment: workerState.environment.name });
	if (viteEnvironment === "client") {
		const _require = createRequire(import.meta.url);
		// always mock "required" `css` files, because we cannot process them
		_require.extensions[".css"] = resolveCss;
		_require.extensions[".scss"] = resolveCss;
		_require.extensions[".sass"] = resolveCss;
		_require.extensions[".less"] = resolveCss;
		// since we are using Vite, we can assume how these will be resolved
		KNOWN_ASSET_TYPES.forEach((type) => {
			_require.extensions[`.${type}`] = resolveAsset;
		});
		process.env.SSR = "";
	} else process.env.SSR = "1";
	// @ts-expect-error not typed global for patched timers
	globalThis.__vitest_required__ = {
		util,
		timers,
		timersPromises
	};
	await traces.$("vitest.runtime.coverage.start", () => startCoverageInsideWorker(config.coverage, moduleRunner, { isolate: false }));
	if (config.chaiConfig) setupChaiConfig(config.chaiConfig);
	const [testRunner, snapshotEnvironment] = await Promise.all([traces.$("vitest.runtime.runner", () => resolveTestRunner(config, moduleRunner, traces)), traces.$("vitest.runtime.snapshot.environment", () => resolveSnapshotEnvironment(config, moduleRunner))]);
	config.snapshotOptions.snapshotEnvironment = snapshotEnvironment;
	testRunner.getWorkerContext = void 0;
	workerState.onCancel((reason) => {
		closeInspector(config);
		testRunner.cancel?.(reason);
	});
	workerState.durations.prepare = performance.now() - workerState.durations.prepare;
	const { vi } = index;
	await traces.$(`vitest.test.runner.${method}`, async () => {
		for (const file of files) {
			workerState.filepath = file.filepath;
			if (method === "run") await traces.$(`vitest.test.runner.${method}.module`, { attributes: { "code.file.path": file.filepath } }, () => startTests([file], testRunner));
			else await traces.$(`vitest.test.runner.${method}.module`, { attributes: { "code.file.path": file.filepath } }, () => collectTests([file], testRunner));
			// reset after tests, because user might call `vi.setConfig` in setupFile
			vi.resetConfig();
			// mocks should not affect different files
			vi.restoreAllMocks();
		}
	});
	await traces.$("vitest.runtime.coverage.stop", () => stopCoverageInsideWorker(config.coverage, moduleRunner, { isolate: false }));
}
function resolveCss(mod) {
	mod.exports = "";
}
function resolveAsset(mod, url) {
	mod.exports = url;
}

export { run };
