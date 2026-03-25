const require_runtime = require('../_virtual/_rolldown/runtime.cjs');
let _langchain_core_runnables = require("@langchain/core/runnables");
let _langchain_core_singletons = require("@langchain/core/singletons");

//#region src/agents/RunnableCallable.ts
var RunnableCallable = class extends _langchain_core_runnables.Runnable {
	lc_namespace = ["langgraph"];
	func;
	tags;
	config;
	trace = true;
	recurse = true;
	#state;
	constructor(fields) {
		super();
		this.name = fields.name ?? fields.func.name;
		this.func = fields.func;
		this.config = fields.tags ? { tags: fields.tags } : void 0;
		this.recurse = fields.recurse ?? this.recurse;
	}
	getState() {
		return this.#state;
	}
	/**
	* This allows us to set the state of the runnable, e.g. for model and middleware nodes.
	* @internal
	*/
	setState(state) {
		this.#state = {
			...this.#state,
			...state
		};
	}
	async invoke(input, options) {
		const mergedConfig = (0, _langchain_core_runnables.mergeConfigs)(this.config, options);
		const returnValue = await _langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => this.func(input, mergedConfig));
		if (_langchain_core_runnables.Runnable.isRunnable(returnValue) && this.recurse) return await _langchain_core_singletons.AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => returnValue.invoke(input, mergedConfig));
		this.#state = returnValue;
		return returnValue;
	}
};

//#endregion
exports.RunnableCallable = RunnableCallable;
//# sourceMappingURL=RunnableCallable.cjs.map