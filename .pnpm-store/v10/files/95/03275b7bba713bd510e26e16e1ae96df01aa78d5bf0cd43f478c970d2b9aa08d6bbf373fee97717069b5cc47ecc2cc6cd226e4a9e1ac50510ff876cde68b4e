import { _deepClone, _objectKeys, escapePathComponent, hasOwnProperty } from "./helpers.js";
import "./core.js";
//#region src/utils/fast-json-patch/src/duplex.ts
/*!
* https://github.com/Starcounter-Jack/JSON-Patch
* (c) 2013-2021 Joachim Wester
* MIT license
*/
function _generate(mirror, obj, patches, path, invertible) {
	if (obj === mirror) return;
	if (typeof obj.toJSON === "function") obj = obj.toJSON();
	var newKeys = _objectKeys(obj);
	var oldKeys = _objectKeys(mirror);
	var deleted = false;
	for (var t = oldKeys.length - 1; t >= 0; t--) {
		var key = oldKeys[t];
		var oldVal = mirror[key];
		if (hasOwnProperty(obj, key) && !(obj[key] === void 0 && oldVal !== void 0 && Array.isArray(obj) === false)) {
			var newVal = obj[key];
			if (typeof oldVal == "object" && oldVal != null && typeof newVal == "object" && newVal != null && Array.isArray(oldVal) === Array.isArray(newVal)) _generate(oldVal, newVal, patches, path + "/" + escapePathComponent(key), invertible);
			else if (oldVal !== newVal) {
				if (invertible) patches.push({
					op: "test",
					path: path + "/" + escapePathComponent(key),
					value: _deepClone(oldVal)
				});
				patches.push({
					op: "replace",
					path: path + "/" + escapePathComponent(key),
					value: _deepClone(newVal)
				});
			}
		} else if (Array.isArray(mirror) === Array.isArray(obj)) {
			if (invertible) patches.push({
				op: "test",
				path: path + "/" + escapePathComponent(key),
				value: _deepClone(oldVal)
			});
			patches.push({
				op: "remove",
				path: path + "/" + escapePathComponent(key)
			});
			deleted = true;
		} else {
			if (invertible) patches.push({
				op: "test",
				path,
				value: mirror
			});
			patches.push({
				op: "replace",
				path,
				value: obj
			});
		}
	}
	if (!deleted && newKeys.length == oldKeys.length) return;
	for (var t = 0; t < newKeys.length; t++) {
		var key = newKeys[t];
		if (!hasOwnProperty(mirror, key) && obj[key] !== void 0) patches.push({
			op: "add",
			path: path + "/" + escapePathComponent(key),
			value: _deepClone(obj[key])
		});
	}
}
/**
* Create an array of patches from the differences in two objects
*/
function compare(tree1, tree2, invertible = false) {
	var patches = [];
	_generate(tree1, tree2, patches, "", invertible);
	return patches;
}
//#endregion
export { compare };

//# sourceMappingURL=duplex.js.map