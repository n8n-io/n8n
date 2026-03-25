import { Runnable, mergeConfigs } from "@langchain/core/runnables";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";

//#region src/agents/RunnableCallable.ts
var RunnableCallable = class extends Runnable {
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
		const mergedConfig = mergeConfigs(this.config, options);
		const returnValue = await AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => this.func(input, mergedConfig));
		if (Runnable.isRunnable(returnValue) && this.recurse) return await AsyncLocalStorageProviderSingleton.runWithConfig(mergedConfig, async () => returnValue.invoke(input, mergedConfig));
		this.#state = returnValue;
		return returnValue;
	}
};

//#endregion
export { RunnableCallable };
//# sourceMappingURL=RunnableCallable.js.map