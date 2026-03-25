import { CallbackManager, ensureHandler } from "../callbacks/manager.js";
import { AsyncLocalStorageProviderSingleton } from "../singletons/async_local_storage/index.js";
import "../singletons/index.js";
//#region src/runnables/config.ts
async function getCallbackManagerForConfig(config) {
	return CallbackManager._configureSync(config?.callbacks, void 0, config?.tags, void 0, config?.metadata);
}
function mergeConfigs(...configs) {
	const copy = {};
	for (const options of configs.filter((c) => !!c)) for (const key of Object.keys(options)) if (key === "metadata") copy[key] = {
		...copy[key],
		...options[key]
	};
	else if (key === "tags") {
		const baseKeys = copy[key] ?? [];
		copy[key] = [...new Set(baseKeys.concat(options[key] ?? []))];
	} else if (key === "configurable") copy[key] = {
		...copy[key],
		...options[key]
	};
	else if (key === "timeout") {
		if (copy.timeout === void 0) copy.timeout = options.timeout;
		else if (options.timeout !== void 0) copy.timeout = Math.min(copy.timeout, options.timeout);
	} else if (key === "signal") {
		if (copy.signal === void 0) copy.signal = options.signal;
		else if (options.signal !== void 0) if ("any" in AbortSignal) copy.signal = AbortSignal.any([copy.signal, options.signal]);
		else copy.signal = options.signal;
	} else if (key === "callbacks") {
		const baseCallbacks = copy.callbacks;
		const providedCallbacks = options.callbacks;
		if (Array.isArray(providedCallbacks)) if (!baseCallbacks) copy.callbacks = providedCallbacks;
		else if (Array.isArray(baseCallbacks)) copy.callbacks = baseCallbacks.concat(providedCallbacks);
		else {
			const manager = baseCallbacks.copy();
			for (const callback of providedCallbacks) manager.addHandler(ensureHandler(callback), true);
			copy.callbacks = manager;
		}
		else if (providedCallbacks) if (!baseCallbacks) copy.callbacks = providedCallbacks;
		else if (Array.isArray(baseCallbacks)) {
			const manager = providedCallbacks.copy();
			for (const callback of baseCallbacks) manager.addHandler(ensureHandler(callback), true);
			copy.callbacks = manager;
		} else copy.callbacks = new CallbackManager(providedCallbacks._parentRunId, {
			handlers: baseCallbacks.handlers.concat(providedCallbacks.handlers),
			inheritableHandlers: baseCallbacks.inheritableHandlers.concat(providedCallbacks.inheritableHandlers),
			tags: Array.from(new Set(baseCallbacks.tags.concat(providedCallbacks.tags))),
			inheritableTags: Array.from(new Set(baseCallbacks.inheritableTags.concat(providedCallbacks.inheritableTags))),
			metadata: {
				...baseCallbacks.metadata,
				...providedCallbacks.metadata
			}
		});
	} else {
		const typedKey = key;
		copy[typedKey] = options[typedKey] ?? copy[typedKey];
	}
	return copy;
}
const PRIMITIVES = new Set([
	"string",
	"number",
	"boolean"
]);
/**
* Ensure that a passed config is an object with all required keys present.
*/
function ensureConfig(config) {
	const implicitConfig = AsyncLocalStorageProviderSingleton.getRunnableConfig();
	let empty = {
		tags: [],
		metadata: {},
		recursionLimit: 25,
		runId: void 0
	};
	if (implicitConfig) {
		const { runId, runName, ...rest } = implicitConfig;
		empty = Object.entries(rest).reduce((currentConfig, [key, value]) => {
			if (value !== void 0) currentConfig[key] = value;
			return currentConfig;
		}, empty);
	}
	if (config) empty = Object.entries(config).reduce((currentConfig, [key, value]) => {
		if (value !== void 0) currentConfig[key] = value;
		return currentConfig;
	}, empty);
	if (empty?.configurable) {
		for (const key of Object.keys(empty.configurable)) if (PRIMITIVES.has(typeof empty.configurable[key]) && !empty.metadata?.[key]) {
			if (!empty.metadata) empty.metadata = {};
			empty.metadata[key] = empty.configurable[key];
		}
	}
	if (empty.timeout !== void 0) {
		if (empty.timeout <= 0) throw new Error("Timeout must be a positive number");
		const originalTimeoutMs = empty.timeout;
		const timeoutSignal = AbortSignal.timeout(originalTimeoutMs);
		if (!empty.metadata) empty.metadata = {};
		if (empty.metadata.timeoutMs === void 0) empty.metadata.timeoutMs = originalTimeoutMs;
		if (empty.signal !== void 0) {
			if ("any" in AbortSignal) empty.signal = AbortSignal.any([empty.signal, timeoutSignal]);
		} else empty.signal = timeoutSignal;
		/**
		* We are deleting the timeout key for the following reasons:
		* - Idempotent normalization: ensureConfig may be called multiple times down the stack. If timeout remains,
		*   each call would synthesize new timeout signals and combine them, changing the effective timeout unpredictably.
		* - Single enforcement path: downstream code relies on signal to enforce cancellation. Leaving timeout means two
		*   competing mechanisms (numeric timeout and signal) can be applied, sometimes with different semantics.
		* - Propagation to children: pickRunnableConfigKeys would keep forwarding timeout to nested runnables, causing
		*   repeated re-normalization and stacked timeouts.
		* - Backward compatibility: a lot of components and tests assume ensureConfig removes timeout post-normalization;
		*   changing that would be a breaking change.
		*/
		delete empty.timeout;
	}
	return empty;
}
/**
* Helper function that patches runnable configs with updated properties.
*/
function patchConfig(config = {}, { callbacks, maxConcurrency, recursionLimit, runName, configurable, runId } = {}) {
	const newConfig = ensureConfig(config);
	if (callbacks !== void 0) {
		/**
		* If we're replacing callbacks we need to unset runName
		* since that should apply only to the same run as the original callbacks
		*/
		delete newConfig.runName;
		newConfig.callbacks = callbacks;
	}
	if (recursionLimit !== void 0) newConfig.recursionLimit = recursionLimit;
	if (maxConcurrency !== void 0) newConfig.maxConcurrency = maxConcurrency;
	if (runName !== void 0) newConfig.runName = runName;
	if (configurable !== void 0) newConfig.configurable = {
		...newConfig.configurable,
		...configurable
	};
	if (runId !== void 0) delete newConfig.runId;
	return newConfig;
}
function pickRunnableConfigKeys(config) {
	if (!config) return void 0;
	return {
		configurable: config.configurable,
		recursionLimit: config.recursionLimit,
		callbacks: config.callbacks,
		tags: config.tags,
		metadata: config.metadata,
		maxConcurrency: config.maxConcurrency,
		timeout: config.timeout,
		signal: config.signal,
		store: config.store
	};
}
//#endregion
export { ensureConfig, getCallbackManagerForConfig, mergeConfigs, patchConfig, pickRunnableConfigKeys };

//# sourceMappingURL=config.js.map