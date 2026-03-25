const require_context = require('./context-CQfDPcdE.cjs');
let node_path = require("node:path");
node_path = require_context.__toESM(node_path);

//#region src/utils/webpack-like.ts
function transformUse(data, plugin, transformLoader) {
	if (data.resource == null) return [];
	const id = normalizeAbsolutePath(data.resource + (data.resourceQuery || ""));
	if (plugin.transformInclude && !plugin.transformInclude(id)) return [];
	const { filter } = require_context.normalizeObjectHook("load", plugin.transform);
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
function normalizeAbsolutePath(path) {
	if ((0, node_path.isAbsolute)(path)) return (0, node_path.normalize)(path);
	else return path;
}

//#endregion
Object.defineProperty(exports, 'normalizeAbsolutePath', {
  enumerable: true,
  get: function () {
    return normalizeAbsolutePath;
  }
});
Object.defineProperty(exports, 'transformUse', {
  enumerable: true,
  get: function () {
    return transformUse;
  }
});