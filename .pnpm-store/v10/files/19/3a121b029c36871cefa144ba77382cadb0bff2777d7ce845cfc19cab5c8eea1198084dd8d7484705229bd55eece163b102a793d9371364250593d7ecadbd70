import { readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'pathe';
import { ModuleRunner } from 'vite/module-runner';
import { b as VitestTransport } from './startModuleRunner.DpqpB8k3.js';
import { e as environments } from './index.BspFP3mn.js';
import { serializeError } from '@vitest/utils/error';
import { T as Traces } from './traces.U4xDYhzZ.js';
import { o as onCancel, a as rpcDone, c as createRuntimeRpc } from './rpc.BoxB0q7B.js';
import { createStackString, parseStacktrace } from '@vitest/utils/source-map';
import { s as setupInspect } from './inspector.CvyFGlXm.js';
import { V as VitestEvaluatedModules } from './evaluatedModules.Dg1zASAC.js';

function isBuiltinEnvironment(env) {
	return env in environments;
}
const isWindows = process.platform === "win32";
const _loaders = /* @__PURE__ */ new Map();
function createEnvironmentLoader(root, rpc) {
	const cachedLoader = _loaders.get(root);
	if (!cachedLoader || cachedLoader.isClosed()) {
		_loaders.delete(root);
		const moduleRunner = new ModuleRunner({
			hmr: false,
			sourcemapInterceptor: "prepareStackTrace",
			transport: new VitestTransport({
				async fetchModule(id, importer, options) {
					const result = await rpc.fetch(id, importer, "__vitest__", options);
					if ("cached" in result) return {
						code: readFileSync(result.tmp, "utf-8"),
						...result
					};
					if (isWindows && "externalize" in result)
 // TODO: vitest returns paths for external modules, but Vite returns file://
					// https://github.com/vitejs/vite/pull/20449
					result.externalize = isBuiltin(id) || /^(?:node:|data:|http:|https:|file:)/.test(id) ? result.externalize : pathToFileURL(result.externalize).toString();
					return result;
				},
				async resolveId(id, importer) {
					return rpc.resolve(id, importer, "__vitest__");
				}
			})
		});
		_loaders.set(root, moduleRunner);
	}
	return _loaders.get(root);
}
async function loadEnvironment(name, root, rpc, traces) {
	if (isBuiltinEnvironment(name)) return { environment: environments[name] };
	const loader = createEnvironmentLoader(root, rpc);
	const packageId = name[0] === "." || name[0] === "/" ? resolve(root, name) : (await traces.$("vitest.runtime.environment.resolve", () => rpc.resolve(`vitest-environment-${name}`, void 0, "__vitest__")))?.id ?? resolve(root, name);
	const pkg = await traces.$("vitest.runtime.environment.import", () => loader.import(packageId));
	if (!pkg || !pkg.default || typeof pkg.default !== "object") throw new TypeError(`Environment "${name}" is not a valid environment. Path "${packageId}" should export default object with a "setup" or/and "setupVM" method.`);
	const environment = pkg.default;
	if (environment.transformMode != null && environment.transformMode !== "web" && environment.transformMode !== "ssr") throw new TypeError(`Environment "${name}" is not a valid environment. Path "${packageId}" should export default object with a "transformMode" method equal to "ssr" or "web", received "${environment.transformMode}".`);
	if (environment.transformMode) {
		console.warn(`The Vitest environment ${environment.name} defines the "transformMode". This options was deprecated in Vitest 4 and will be removed in the next major version. Please, use "viteEnvironment" instead.`);
		// keep for backwards compat
		environment.viteEnvironment ??= environment.transformMode === "ssr" ? "ssr" : "client";
	}
	return {
		environment,
		loader
	};
}

const resolvingModules = /* @__PURE__ */ new Set();
const globalListeners = /* @__PURE__ */ new Set();
async function execute(method, ctx, worker, traces) {
	const prepareStart = performance.now();
	const cleanups = [setupInspect(ctx)];
	// RPC is used to communicate between worker (be it a thread worker or child process or a custom implementation) and the main thread
	const rpc = ctx.rpc;
	try {
		// do not close the RPC channel so that we can get the error messages sent to the main thread
		cleanups.push(async () => {
			await Promise.all(rpc.$rejectPendingCalls(({ method, reject }) => {
				reject(/* @__PURE__ */ new Error(`[vitest-worker]: Closing rpc while "${method}" was pending`));
			}));
		});
		const state = {
			ctx,
			evaluatedModules: new VitestEvaluatedModules(),
			resolvingModules,
			moduleExecutionInfo: /* @__PURE__ */ new Map(),
			config: ctx.config,
			environment: null,
			durations: {
				environment: 0,
				prepare: prepareStart
			},
			rpc,
			onCancel,
			onCleanup: (listener) => globalListeners.add(listener),
			providedContext: ctx.providedContext,
			onFilterStackTrace(stack) {
				return createStackString(parseStacktrace(stack));
			},
			metaEnv: createImportMetaEnvProxy()
		};
		const methodName = method === "collect" ? "collectTests" : "runTests";
		if (!worker[methodName] || typeof worker[methodName] !== "function") throw new TypeError(`Test worker should expose "runTests" method. Received "${typeof worker.runTests}".`);
		await worker[methodName](state, traces);
	} finally {
		await rpcDone().catch(() => {});
		await Promise.all(cleanups.map((fn) => fn())).catch(() => {});
	}
}
function run(ctx, worker, traces) {
	return execute("run", ctx, worker, traces);
}
function collect(ctx, worker, traces) {
	return execute("collect", ctx, worker, traces);
}
async function teardown() {
	await Promise.all([...globalListeners].map((l) => l()));
}
const env = process.env;
function createImportMetaEnvProxy() {
	// packages/vitest/src/node/plugins/index.ts:146
	const booleanKeys = [
		"DEV",
		"PROD",
		"SSR"
	];
	return new Proxy(env, {
		get(_, key) {
			if (typeof key !== "string") return;
			if (booleanKeys.includes(key)) return !!process.env[key];
			return process.env[key];
		},
		set(_, key, value) {
			if (typeof key !== "string") return true;
			if (booleanKeys.includes(key)) process.env[key] = value ? "1" : "";
			else process.env[key] = value;
			return true;
		}
	});
}

const __vitest_worker_response__ = true;
const memoryUsage = process.memoryUsage.bind(process);
let reportMemory = false;
let traces;
/** @experimental */
function init(worker) {
	worker.on(onMessage);
	let runPromise;
	let isRunning = false;
	let workerTeardown;
	let setupContext;
	function send(response) {
		worker.post(worker.serialize ? worker.serialize(response) : response);
	}
	async function onMessage(rawMessage) {
		const message = worker.deserialize ? worker.deserialize(rawMessage) : rawMessage;
		if (message?.__vitest_worker_request__ !== true) return;
		switch (message.type) {
			case "start": {
				process.env.VITEST_POOL_ID = String(message.poolId);
				process.env.VITEST_WORKER_ID = String(message.workerId);
				reportMemory = message.options.reportMemory;
				const tracesStart = performance.now();
				traces ??= await new Traces({
					enabled: message.traces.enabled,
					sdkPath: message.traces.sdkPath
				}).waitInit();
				const tracesEnd = performance.now();
				const { environment, config, pool } = message.context;
				const context = traces.getContextFromCarrier(message.traces.otelCarrier);
				// record telemetry as part of "start"
				traces.startSpan("vitest.runtime.traces", { startTime: tracesStart }, context).end(tracesEnd);
				try {
					setupContext = {
						environment,
						config,
						pool,
						rpc: createRuntimeRpc(worker),
						projectName: config.name || "",
						traces
					};
					workerTeardown = await traces.$("vitest.runtime.setup", { context }, () => worker.setup?.(setupContext));
					send({
						type: "started",
						__vitest_worker_response__
					});
				} catch (error) {
					send({
						type: "started",
						__vitest_worker_response__,
						error: serializeError(error)
					});
				}
				break;
			}
			case "run":
				// Prevent concurrent execution if worker is already running
				if (isRunning) {
					send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: serializeError(/* @__PURE__ */ new Error("[vitest-worker]: Worker is already running tests"))
					});
					return;
				}
				try {
					process.env.VITEST_WORKER_ID = String(message.context.workerId);
				} catch (error) {
					return send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: serializeError(error),
						usedMemory: reportMemory ? memoryUsage().heapUsed : void 0
					});
				}
				isRunning = true;
				try {
					const tracesContext = traces.getContextFromCarrier(message.otelCarrier);
					runPromise = traces.$("vitest.runtime.run", {
						context: tracesContext,
						attributes: {
							"vitest.worker.specifications": traces.isEnabled() ? getFilesWithLocations(message.context.files) : [],
							"vitest.worker.id": message.context.workerId
						}
					}, () => run({
						...setupContext,
						...message.context
					}, worker, traces).catch((error) => serializeError(error)));
					send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: await runPromise,
						usedMemory: reportMemory ? memoryUsage().heapUsed : void 0
					});
				} finally {
					runPromise = void 0;
					isRunning = false;
				}
				break;
			case "collect":
				// Prevent concurrent execution if worker is already running
				if (isRunning) {
					send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: serializeError(/* @__PURE__ */ new Error("[vitest-worker]: Worker is already running tests"))
					});
					return;
				}
				try {
					process.env.VITEST_WORKER_ID = String(message.context.workerId);
				} catch (error) {
					return send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: serializeError(error),
						usedMemory: reportMemory ? memoryUsage().heapUsed : void 0
					});
				}
				isRunning = true;
				try {
					const tracesContext = traces.getContextFromCarrier(message.otelCarrier);
					runPromise = traces.$("vitest.runtime.collect", {
						context: tracesContext,
						attributes: {
							"vitest.worker.specifications": traces.isEnabled() ? getFilesWithLocations(message.context.files) : [],
							"vitest.worker.id": message.context.workerId
						}
					}, () => collect({
						...setupContext,
						...message.context
					}, worker, traces).catch((error) => serializeError(error)));
					send({
						type: "testfileFinished",
						__vitest_worker_response__,
						error: await runPromise,
						usedMemory: reportMemory ? memoryUsage().heapUsed : void 0
					});
				} finally {
					runPromise = void 0;
					isRunning = false;
				}
				break;
			case "stop":
				await runPromise;
				try {
					const context = traces.getContextFromCarrier(message.otelCarrier);
					const error = await traces.$("vitest.runtime.teardown", { context }, async () => {
						const error = await teardown().catch((error) => serializeError(error));
						await workerTeardown?.();
						return error;
					});
					await traces.finish();
					send({
						type: "stopped",
						error,
						__vitest_worker_response__
					});
				} catch (error) {
					send({
						type: "stopped",
						error: serializeError(error),
						__vitest_worker_response__
					});
				}
				worker.teardown?.();
				break;
		}
	}
}
function getFilesWithLocations(files) {
	return files.flatMap((file) => {
		if (!file.testLocations) return file.filepath;
		return file.testLocations.map((location) => {
			return `${file}:${location}`;
		});
	});
}

export { init as i, loadEnvironment as l };
