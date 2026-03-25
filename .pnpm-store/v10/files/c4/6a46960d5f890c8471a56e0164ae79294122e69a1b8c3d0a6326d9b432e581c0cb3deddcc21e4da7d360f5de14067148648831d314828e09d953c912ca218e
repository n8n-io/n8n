//#region src/serde/utils/fast-safe-stringify/index.ts
var LIMIT_REPLACE_NODE = "[...]";
var CIRCULAR_REPLACE_NODE = "[Circular]";
var arr = [];
var replacerStack = [];
function defaultOptions() {
	return {
		depthLimit: Number.MAX_SAFE_INTEGER,
		edgesLimit: Number.MAX_SAFE_INTEGER
	};
}
function stringify(obj, replacer, spacer, options) {
	if (typeof options === "undefined") options = defaultOptions();
	decirc(obj, "", 0, [], void 0, 0, options);
	var res;
	try {
		if (replacerStack.length === 0) res = JSON.stringify(obj, replacer, spacer);
		else res = JSON.stringify(obj, replaceGetterValues(replacer), spacer);
	} catch (_) {
		return JSON.stringify("[unable to serialize, circular reference is too complex to analyze]");
	} finally {
		while (arr.length !== 0) {
			var part = arr.pop();
			if (part.length === 4) Object.defineProperty(part[0], part[1], part[3]);
			else part[0][part[1]] = part[2];
		}
	}
	return res;
}
function setReplace(replace, val, k, parent) {
	var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k);
	if (propertyDescriptor.get !== void 0) if (propertyDescriptor.configurable) {
		Object.defineProperty(parent, k, { value: replace });
		arr.push([
			parent,
			k,
			val,
			propertyDescriptor
		]);
	} else replacerStack.push([
		val,
		k,
		replace
	]);
	else {
		parent[k] = replace;
		arr.push([
			parent,
			k,
			val
		]);
	}
}
function decirc(val, k, edgeIndex, stack, parent, depth, options) {
	depth += 1;
	var i;
	if (typeof val === "object" && val !== null) {
		for (i = 0; i < stack.length; i++) if (stack[i] === val) {
			setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
			return;
		}
		if (typeof options.depthLimit !== "undefined" && depth > options.depthLimit) {
			setReplace(LIMIT_REPLACE_NODE, val, k, parent);
			return;
		}
		if (typeof options.edgesLimit !== "undefined" && edgeIndex + 1 > options.edgesLimit) {
			setReplace(LIMIT_REPLACE_NODE, val, k, parent);
			return;
		}
		stack.push(val);
		if (Array.isArray(val)) for (i = 0; i < val.length; i++) decirc(val[i], i, i, stack, val, depth, options);
		else {
			var keys = Object.keys(val);
			for (i = 0; i < keys.length; i++) {
				var key = keys[i];
				decirc(val[key], key, i, stack, val, depth, options);
			}
		}
		stack.pop();
	}
}
function replaceGetterValues(replacer) {
	replacer = typeof replacer !== "undefined" ? replacer : function(k, v) {
		return v;
	};
	return function(key, val) {
		if (replacerStack.length > 0) for (var i = 0; i < replacerStack.length; i++) {
			var part = replacerStack[i];
			if (part[1] === key && part[0] === val) {
				val = part[2];
				replacerStack.splice(i, 1);
				break;
			}
		}
		return replacer.call(this, key, val);
	};
}

//#endregion
export { stringify };
//# sourceMappingURL=index.js.map