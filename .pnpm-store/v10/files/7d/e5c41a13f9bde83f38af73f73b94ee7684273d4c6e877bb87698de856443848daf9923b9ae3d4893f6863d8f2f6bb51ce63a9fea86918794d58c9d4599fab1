import { n as isPromiseLike, t as arraify } from "./shared/misc-DpQNcSw4.mjs";
import { and, code, exclude, id, include, moduleType, not, or, queries, query } from "@rolldown/pluginutils";

//#region src/plugin/with-filter.ts
function withFilterImpl(pluginOption, filterObjectList) {
	if (isPromiseLike(pluginOption)) return pluginOption.then((p) => withFilter(p, filterObjectList));
	if (pluginOption == false || pluginOption == null) return pluginOption;
	if (Array.isArray(pluginOption)) return pluginOption.map((p) => withFilter(p, filterObjectList));
	let plugin = pluginOption;
	let filterObjectIndex = findMatchedFilterObject(plugin.name, filterObjectList);
	if (filterObjectIndex === -1) return plugin;
	let filterObject = filterObjectList[filterObjectIndex];
	Object.keys(plugin).forEach((key) => {
		switch (key) {
			case "transform":
			case "resolveId":
			case "load":
				if (!plugin[key]) return;
				if (typeof plugin[key] === "object") plugin[key].filter = filterObject[key] ?? plugin[key].filter;
				else plugin[key] = {
					handler: plugin[key],
					filter: filterObject[key]
				};
				break;
			default: break;
		}
	});
	return plugin;
}
function withFilter(pluginOption, filterObject) {
	return withFilterImpl(pluginOption, arraify(filterObject));
}
function findMatchedFilterObject(pluginName, overrideFilterObjectList) {
	if (overrideFilterObjectList.length === 1 && overrideFilterObjectList[0].pluginNamePattern === void 0) return 0;
	for (let i = 0; i < overrideFilterObjectList.length; i++) for (let j = 0; j < (overrideFilterObjectList[i].pluginNamePattern ?? []).length; j++) {
		let pattern = overrideFilterObjectList[i].pluginNamePattern[j];
		if (typeof pattern === "string" && pattern === pluginName) return i;
		else if (pattern instanceof RegExp && pattern.test(pluginName)) return i;
	}
	return -1;
}

//#endregion
export { and, code, exclude, id, include, moduleType, not, or, queries, query, withFilter };