import { t as require_binding } from "./binding-DkT6owYZ.mjs";
import { c as logPluginError, n as error } from "./logs-CSQ_UMWp.mjs";

//#region src/builtin-plugin/utils.ts
var import_binding = require_binding();
var BuiltinPlugin = class {
	constructor(name, _options) {
		this.name = name;
		this._options = _options;
	}
};
function makeBuiltinPluginCallable(plugin) {
	let callablePlugin = new import_binding.BindingCallableBuiltinPlugin(bindingifyBuiltInPlugin(plugin));
	const wrappedPlugin = plugin;
	for (const key in callablePlugin) wrappedPlugin[key] = async function(...args) {
		try {
			return await callablePlugin[key](...args);
		} catch (e) {
			if (e instanceof Error && !e.stack?.includes("at ")) Error.captureStackTrace(e, wrappedPlugin[key]);
			return error(logPluginError(e, plugin.name, {
				hook: key,
				id: key === "transform" ? args[2] : void 0
			}));
		}
	};
	return wrappedPlugin;
}
function bindingifyBuiltInPlugin(plugin) {
	return {
		__name: plugin.name,
		options: plugin._options
	};
}

//#endregion
//#region src/utils/normalize-string-or-regex.ts
function normalizedStringOrRegex(pattern) {
	if (!pattern) return;
	if (!isReadonlyArray(pattern)) return [pattern];
	return pattern;
}
function isReadonlyArray(input) {
	return Array.isArray(input);
}

//#endregion
export { makeBuiltinPluginCallable as i, BuiltinPlugin as n, bindingifyBuiltInPlugin as r, normalizedStringOrRegex as t };