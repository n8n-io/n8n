require("../../_virtual/_rolldown/runtime.cjs");
const require_globals = require("./globals.cjs");
const require_callbacks_manager = require("../../callbacks/manager.cjs");
let langsmith = require("langsmith");
//#region src/singletons/async_local_storage/index.ts
var MockAsyncLocalStorage = class {
	getStore() {}
	run(_store, callback) {
		return callback();
	}
	enterWith(_store) {}
};
const mockAsyncLocalStorage = new MockAsyncLocalStorage();
const LC_CHILD_KEY = Symbol.for("lc:child_config");
var AsyncLocalStorageProvider = class {
	getInstance() {
		return require_globals.getGlobalAsyncLocalStorageInstance() ?? mockAsyncLocalStorage;
	}
	getRunnableConfig() {
		return this.getInstance().getStore()?.extra?.[LC_CHILD_KEY];
	}
	runWithConfig(config, callback, avoidCreatingRootRunTree) {
		const callbackManager = require_callbacks_manager.CallbackManager._configureSync(config?.callbacks, void 0, config?.tags, void 0, config?.metadata);
		const storage = this.getInstance();
		const previousValue = storage.getStore();
		const parentRunId = callbackManager?.getParentRunId();
		const langChainTracer = callbackManager?.handlers?.find((handler) => handler?.name === "langchain_tracer");
		let runTree;
		if (langChainTracer && parentRunId) runTree = langChainTracer.getRunTreeWithTracingConfig(parentRunId);
		else if (!avoidCreatingRootRunTree) runTree = new langsmith.RunTree({
			name: "<runnable_lambda>",
			tracingEnabled: false
		});
		if (runTree) runTree.extra = {
			...runTree.extra,
			[LC_CHILD_KEY]: config
		};
		if (previousValue !== void 0 && previousValue[require_globals._CONTEXT_VARIABLES_KEY] !== void 0) {
			if (runTree === void 0) runTree = {};
			runTree[require_globals._CONTEXT_VARIABLES_KEY] = previousValue[require_globals._CONTEXT_VARIABLES_KEY];
		}
		return storage.run(runTree, callback);
	}
	initializeGlobalInstance(instance) {
		if (require_globals.getGlobalAsyncLocalStorageInstance() === void 0) require_globals.setGlobalAsyncLocalStorageInstance(instance);
	}
};
const AsyncLocalStorageProviderSingleton = new AsyncLocalStorageProvider();
//#endregion
exports.AsyncLocalStorageProviderSingleton = AsyncLocalStorageProviderSingleton;
exports.MockAsyncLocalStorage = MockAsyncLocalStorage;

//# sourceMappingURL=index.cjs.map