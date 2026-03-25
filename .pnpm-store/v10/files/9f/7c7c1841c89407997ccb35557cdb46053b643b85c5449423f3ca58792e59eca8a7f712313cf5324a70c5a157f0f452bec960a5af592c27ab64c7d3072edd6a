import { getLangSmithEnvironmentVariable } from "../env.js";

//#region ../../node_modules/.pnpm/langsmith@0.3.74_@opentelemetry+api@1.9.0_openai@5.12.2_ws@8.18.3_bufferutil@4.0.9_utf-8-validate@6.0.5__zod@3.25.76_/node_modules/langsmith/dist/utils/fast-safe-stringify/index.js
var LIMIT_REPLACE_NODE = "[...]";
var CIRCULAR_REPLACE_NODE = { result: "[Circular]" };
var arr = [];
var replacerStack = [];
const encoder = new TextEncoder();
function defaultOptions() {
	return {
		depthLimit: Number.MAX_SAFE_INTEGER,
		edgesLimit: Number.MAX_SAFE_INTEGER
	};
}
function encodeString(str) {
	return encoder.encode(str);
}
function serializeWellKnownTypes(val) {
	if (val && typeof val === "object" && val !== null) {
		if (val instanceof Map) return Object.fromEntries(val);
		else if (val instanceof Set) return Array.from(val);
		else if (val instanceof Date) return val.toISOString();
		else if (val instanceof RegExp) return val.toString();
		else if (val instanceof Error) return {
			name: val.name,
			message: val.message
		};
	} else if (typeof val === "bigint") return val.toString();
	return val;
}
function createDefaultReplacer(userReplacer) {
	return function(key, val) {
		if (userReplacer) {
			const userResult = userReplacer.call(this, key, val);
			if (userResult !== void 0) return userResult;
		}
		return serializeWellKnownTypes(val);
	};
}
function serialize(obj, errorContext, replacer, spacer, options) {
	try {
		const str = JSON.stringify(obj, createDefaultReplacer(replacer), spacer);
		return encodeString(str);
	} catch (e) {
		if (!e.message?.includes("Converting circular structure to JSON")) {
			console.warn(`[WARNING]: LangSmith received unserializable value.${errorContext ? `\nContext: ${errorContext}` : ""}`);
			return encodeString("[Unserializable]");
		}
		getLangSmithEnvironmentVariable("SUPPRESS_CIRCULAR_JSON_WARNINGS") !== "true" && console.warn(`[WARNING]: LangSmith received circular JSON. This will decrease tracer performance. ${errorContext ? `\nContext: ${errorContext}` : ""}`);
		if (typeof options === "undefined") options = defaultOptions();
		decirc(obj, "", 0, [], void 0, 0, options);
		let res;
		try {
			if (replacerStack.length === 0) res = JSON.stringify(obj, replacer, spacer);
			else res = JSON.stringify(obj, replaceGetterValues(replacer), spacer);
		} catch (_) {
			return encodeString("[unable to serialize, circular reference is too complex to analyze]");
		} finally {
			while (arr.length !== 0) {
				const part = arr.pop();
				if (part.length === 4) Object.defineProperty(part[0], part[1], part[3]);
				else part[0][part[1]] = part[2];
			}
		}
		return encodeString(res);
	}
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
			val = serializeWellKnownTypes(val);
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
export { serialize };
//# sourceMappingURL=index.js.map