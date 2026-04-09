import "./shared/binding-kg77KQCQ.mjs";
import "./shared/logs-CSQ_UMWp.mjs";
import "./shared/misc-CxyvWjTr.mjs";
import { a as makeBuiltinPluginCallable, n as BuiltinPlugin } from "./shared/normalize-string-or-regex-VlPkMWXA.mjs";
import { t as esmExternalRequirePlugin } from "./shared/constructors-CwAnOHmv.mjs";

//#region src/builtin-plugin/replace-plugin.ts
/**
* Replaces targeted strings in files while bundling.
*
* @example
* // Basic usage
* ```js
* replacePlugin({
*   'process.env.NODE_ENV': JSON.stringify('production'),
*    __buildVersion: 15
* })
* ```
* @example
* // With options
* ```js
* replacePlugin({
*   'process.env.NODE_ENV': JSON.stringify('production'),
*   __buildVersion: 15
* }, {
*   preventAssignment: false,
* })
* ```
*/
function replacePlugin(values = {}, options = {}) {
	Object.keys(values).forEach((key) => {
		const value = values[key];
		if (typeof value !== "string") values[key] = String(value);
	});
	return makeBuiltinPluginCallable(new BuiltinPlugin("builtin:replace", {
		...options,
		values
	}));
}

//#endregion
export { esmExternalRequirePlugin, replacePlugin };