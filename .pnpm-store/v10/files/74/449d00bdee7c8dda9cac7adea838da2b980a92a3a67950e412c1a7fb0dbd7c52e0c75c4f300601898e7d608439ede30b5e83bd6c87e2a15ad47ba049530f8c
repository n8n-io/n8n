import { n as normalizeObjectHook } from "./context-Csj9j3eN.js";
import { isAbsolute, normalize } from "node:path";

//#region src/utils/webpack-like.ts
function transformUse(data, plugin, transformLoader) {
	if (data.resource == null) return [];
	const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
	if (plugin.transformInclude && !plugin.transformInclude(id)) return [];
	const { filter } = normalizeObjectHook("load", plugin.transform);
	if (!filter(id)) return [];
	return [{
		loader: transformLoader,
		options: { plugin },
		ident: plugin.name
	}];
}
/**
* Normalizes a given path when it's absolute. Normalizing means returning a new path by converting
* the input path to the native os format. This is useful in cases where we want to normalize
* the `id` argument of a hook. Any absolute ids should be in the default format
* of the operating system. Any relative imports or node_module imports should remain
* untouched.
*
* @param path - Path to normalize.
* @returns a new normalized path.
*/
function normalizeAbsolutePath(path$1) {
	if (isAbsolute(path$1)) return normalize(path$1);
	else return path$1;
}

//#endregion
export { transformUse as n, normalizeAbsolutePath as t };