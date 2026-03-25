//#region src/utils/fast-json-patch/src/helpers.ts
/*!
* https://github.com/Starcounter-Jack/JSON-Patch
* (c) 2017-2022 Joachim Wester
* MIT licensed
*/
const _hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, key) {
	return _hasOwnProperty.call(obj, key);
}
function _objectKeys(obj) {
	if (Array.isArray(obj)) {
		const keys = new Array(obj.length);
		for (let k = 0; k < keys.length; k++) keys[k] = "" + k;
		return keys;
	}
	if (Object.keys) return Object.keys(obj);
	let keys = [];
	for (let i in obj) if (hasOwnProperty(obj, i)) keys.push(i);
	return keys;
}
/**
* Deeply clone the object.
* https://jsperf.com/deep-copy-vs-json-stringify-json-parse/25 (recursiveDeepCopy)
* @param  {any} obj value to clone
* @return {any} cloned obj
*/
function _deepClone(obj) {
	switch (typeof obj) {
		case "object": return JSON.parse(JSON.stringify(obj));
		case "undefined": return null;
		default: return obj;
	}
}
function isInteger(str) {
	let i = 0;
	const len = str.length;
	let charCode;
	while (i < len) {
		charCode = str.charCodeAt(i);
		if (charCode >= 48 && charCode <= 57) {
			i++;
			continue;
		}
		return false;
	}
	return true;
}
/**
* Escapes a json pointer path
* @param path The raw pointer
* @return the Escaped path
*/
function escapePathComponent(path) {
	if (path.indexOf("/") === -1 && path.indexOf("~") === -1) return path;
	return path.replace(/~/g, "~0").replace(/\//g, "~1");
}
/**
* Unescapes a json pointer path
* @param path The escaped pointer
* @return The unescaped path
*/
function unescapePathComponent(path) {
	return path.replace(/~1/g, "/").replace(/~0/g, "~");
}
/**
* Recursively checks whether an object has any undefined values inside.
*/
function hasUndefined(obj) {
	if (obj === void 0) return true;
	if (obj) {
		if (Array.isArray(obj)) {
			for (let i = 0, len = obj.length; i < len; i++) if (hasUndefined(obj[i])) return true;
		} else if (typeof obj === "object") {
			const objKeys = _objectKeys(obj);
			const objKeysLength = objKeys.length;
			for (var i = 0; i < objKeysLength; i++) if (hasUndefined(obj[objKeys[i]])) return true;
		}
	}
	return false;
}
function patchErrorMessageFormatter(message, args) {
	const messageParts = [message];
	for (const key in args) {
		const value = typeof args[key] === "object" ? JSON.stringify(args[key], null, 2) : args[key];
		if (typeof value !== "undefined") messageParts.push(`${key}: ${value}`);
	}
	return messageParts.join("\n");
}
var PatchError = class extends Error {
	constructor(message, name, index, operation, tree) {
		super(patchErrorMessageFormatter(message, {
			name,
			index,
			operation,
			tree
		}));
		this.name = name;
		this.index = index;
		this.operation = operation;
		this.tree = tree;
		Object.setPrototypeOf(this, new.target.prototype);
		this.message = patchErrorMessageFormatter(message, {
			name,
			index,
			operation,
			tree
		});
	}
};
//#endregion
export { PatchError, _deepClone, _objectKeys, escapePathComponent, hasOwnProperty, hasUndefined, isInteger, unescapePathComponent };

//# sourceMappingURL=helpers.js.map