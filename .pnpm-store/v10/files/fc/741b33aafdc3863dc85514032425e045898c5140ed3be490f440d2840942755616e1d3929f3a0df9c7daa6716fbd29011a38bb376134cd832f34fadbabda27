const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_config = require('./pregel/utils/config.cjs');
const __langchain_core_singletons = require_rolldown_runtime.__toESM(require("@langchain/core/singletons"));
const __langchain_core_runnables = require_rolldown_runtime.__toESM(require("@langchain/core/runnables"));

//#region src/utils.ts
var RunnableCallable = class extends __langchain_core_runnables.Runnable {
	lc_namespace = ["langgraph"];
	func;
	tags;
	config;
	trace = true;
	recurse = true;
	constructor(fields) {
		super();
		this.name = fields.name ?? fields.func.name;
		this.func = fields.func;
		this.config = fields.tags ? { tags: fields.tags } : void 0;
		this.trace = fields.trace ?? this.trace;
		this.recurse = fields.recurse ?? this.recurse;
	}
	async _tracedInvoke(input, config, runManager) {
		return new Promise((resolve, reject) => {
			const childConfig = (0, __langchain_core_runnables.patchConfig)(config, { callbacks: runManager?.getChild() });
			__langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig(childConfig, async () => {
				try {
					const output = await this.func(input, childConfig);
					resolve(output);
				} catch (e) {
					reject(e);
				}
			});
		});
	}
	async invoke(input, options) {
		let returnValue;
		const config = require_config.ensureLangGraphConfig(options);
		const mergedConfig = (0, __langchain_core_runnables.mergeConfigs)(this.config, config);
		if (this.trace) returnValue = await this._callWithConfig(this._tracedInvoke, input, mergedConfig);
		else returnValue = await __langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => this.func(input, mergedConfig));
		if (__langchain_core_runnables.Runnable.isRunnable(returnValue) && this.recurse) return await __langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => returnValue.invoke(input, mergedConfig));
		return returnValue;
	}
};
function* prefixGenerator(generator, prefix) {
	if (prefix === void 0) yield* generator;
	else for (const value of generator) yield [prefix, value];
}
async function gatherIterator(i) {
	const out = [];
	for await (const item of await i) out.push(item);
	return out;
}
function gatherIteratorSync(i) {
	const out = [];
	for (const item of i) out.push(item);
	return out;
}
function patchConfigurable(config, patch) {
	if (!config) return { configurable: patch };
	else if (!("configurable" in config)) return {
		...config,
		configurable: patch
	};
	else return {
		...config,
		configurable: {
			...config.configurable,
			...patch
		}
	};
}
function isAsyncGeneratorFunction(val) {
	return val != null && typeof val === "function" && val instanceof Object.getPrototypeOf(async function* () {}).constructor;
}
function isGeneratorFunction(val) {
	return val != null && typeof val === "function" && val instanceof Object.getPrototypeOf(function* () {}).constructor;
}

//#endregion
exports.RunnableCallable = RunnableCallable;
exports.gatherIterator = gatherIterator;
exports.gatherIteratorSync = gatherIteratorSync;
exports.isAsyncGeneratorFunction = isAsyncGeneratorFunction;
exports.isGeneratorFunction = isGeneratorFunction;
exports.patchConfigurable = patchConfigurable;
exports.prefixGenerator = prefixGenerator;
//# sourceMappingURL=utils.cjs.map