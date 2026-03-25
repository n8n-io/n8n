import { ModuleCacheMap } from 'vite-node/client';
import { g as getDefaultRequestStubs, s as startVitestExecutor } from './execute.BpmIjFTD.js';
import { p as provideWorkerState } from './utils.CgTj3MsC.js';

let _viteNode;
const moduleCache = new ModuleCacheMap();
const moduleExecutionInfo = new Map();
async function startViteNode(options) {
	if (_viteNode) {
		return _viteNode;
	}
	_viteNode = await startVitestExecutor(options);
	return _viteNode;
}
async function runBaseTests(method, state) {
	const { ctx } = state;
	state.moduleCache = moduleCache;
	state.moduleExecutionInfo = moduleExecutionInfo;
	provideWorkerState(globalThis, state);
	if (ctx.invalidates) {
		ctx.invalidates.forEach((fsPath) => {
			moduleCache.delete(fsPath);
			moduleCache.delete(`mock:${fsPath}`);
		});
	}
	ctx.files.forEach((i) => state.moduleCache.delete(typeof i === "string" ? i : i.filepath));
	const [executor, { run }] = await Promise.all([startViteNode({
		state,
		requestStubs: getDefaultRequestStubs()
	}), import('./runBaseTests.BV8m0B-u.js')]);
	const fileSpecs = ctx.files.map((f) => typeof f === "string" ? {
		filepath: f,
		testLocations: undefined
	} : f);
	await run(method, fileSpecs, ctx.config, {
		environment: state.environment,
		options: ctx.environment.options
	}, executor);
}

export { runBaseTests as r };
