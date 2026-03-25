const require_constants = require('../../constants.cjs');

//#region src/pregel/utils/index.ts
function getNullChannelVersion(currentVersions) {
	const startVersion = typeof currentVersions[require_constants.START];
	if (startVersion === "number") return 0;
	if (startVersion === "string") return "";
	for (const key in currentVersions) {
		if (!Object.prototype.hasOwnProperty.call(currentVersions, key)) continue;
		const versionType = typeof currentVersions[key];
		if (versionType === "number") return 0;
		if (versionType === "string") return "";
		break;
	}
	return void 0;
}
function getNewChannelVersions(previousVersions, currentVersions) {
	if (Object.keys(previousVersions).length > 0) {
		const nullVersion = getNullChannelVersion(currentVersions);
		return Object.fromEntries(Object.entries(currentVersions).filter(([k, v]) => v > (previousVersions[k] ?? nullVersion)));
	} else return currentVersions;
}
function _coerceToDict(value, defaultKey) {
	return value && !Array.isArray(value) && !(value instanceof Date) && typeof value === "object" ? value : { [defaultKey]: value };
}
function patchConfigurable(config, patch) {
	if (config === null) return { configurable: patch };
	else if (config?.configurable === void 0) return {
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
function patchCheckpointMap(config, metadata) {
	const parents = metadata?.parents ?? {};
	if (Object.keys(parents).length > 0) return patchConfigurable(config, { [require_constants.CONFIG_KEY_CHECKPOINT_MAP]: {
		...parents,
		[config.configurable?.checkpoint_ns ?? ""]: config.configurable?.checkpoint_id
	} });
	else return config;
}
/**
* Combine multiple abort signals into a single abort signal.
* @param signals - The abort signals to combine.
* @returns A combined abort signal and a dispose function to remove the abort listener if unused.
*/
function combineAbortSignals(...x) {
	const signals = [...new Set(x.filter(Boolean))];
	if (signals.length === 0) return {
		signal: void 0,
		dispose: void 0
	};
	if (signals.length === 1) return {
		signal: signals[0],
		dispose: void 0
	};
	const combinedController = new AbortController();
	const listener = () => {
		const reason = signals.find((s) => s.aborted)?.reason;
		combinedController.abort(reason);
		signals.forEach((s) => s.removeEventListener("abort", listener));
	};
	signals.forEach((s) => s.addEventListener("abort", listener, { once: true }));
	const hasAlreadyAbortedSignal = signals.find((s) => s.aborted);
	if (hasAlreadyAbortedSignal) combinedController.abort(hasAlreadyAbortedSignal.reason);
	return {
		signal: combinedController.signal,
		dispose: () => {
			signals.forEach((s) => s.removeEventListener("abort", listener));
		}
	};
}
/**
* Combine multiple callbacks into a single callback.
* @param callback1 - The first callback to combine.
* @param callback2 - The second callback to combine.
* @returns A single callback that is a combination of the input callbacks.
*/
const combineCallbacks = (callback1, callback2) => {
	if (!callback1 && !callback2) return void 0;
	if (!callback1) return callback2;
	if (!callback2) return callback1;
	if (Array.isArray(callback1) && Array.isArray(callback2)) return [...callback1, ...callback2];
	if (Array.isArray(callback1)) return [...callback1, callback2];
	if (Array.isArray(callback2)) return [callback1, ...callback2];
	return [callback1, callback2];
};

//#endregion
exports._coerceToDict = _coerceToDict;
exports.combineAbortSignals = combineAbortSignals;
exports.combineCallbacks = combineCallbacks;
exports.getNewChannelVersions = getNewChannelVersions;
exports.getNullChannelVersion = getNullChannelVersion;
exports.patchCheckpointMap = patchCheckpointMap;
exports.patchConfigurable = patchConfigurable;
//# sourceMappingURL=index.cjs.map