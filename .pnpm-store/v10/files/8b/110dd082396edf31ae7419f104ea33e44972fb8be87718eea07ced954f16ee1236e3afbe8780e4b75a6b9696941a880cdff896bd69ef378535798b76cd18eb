import { printDiffOrStringify } from './diff.js';
import { f as format, s as stringify } from './chunk-_commonjsHelpers.js';
import '@vitest/pretty-format';
import 'tinyrainbow';
import './helpers.js';
import 'loupe';

const IS_RECORD_SYMBOL = "@@__IMMUTABLE_RECORD__@@";
const IS_COLLECTION_SYMBOL = "@@__IMMUTABLE_ITERABLE__@@";
function isImmutable(v) {
	return v && (v[IS_COLLECTION_SYMBOL] || v[IS_RECORD_SYMBOL]);
}
const OBJECT_PROTO = Object.getPrototypeOf({});
function getUnserializableMessage(err) {
	if (err instanceof Error) {
		return `<unserializable>: ${err.message}`;
	}
	if (typeof err === "string") {
		return `<unserializable>: ${err}`;
	}
	return "<unserializable>";
}
function serializeValue(val, seen = new WeakMap()) {
	if (!val || typeof val === "string") {
		return val;
	}
	if (typeof val === "function") {
		return `Function<${val.name || "anonymous"}>`;
	}
	if (typeof val === "symbol") {
		return val.toString();
	}
	if (typeof val !== "object") {
		return val;
	}
	if (isImmutable(val)) {
		return serializeValue(val.toJSON(), seen);
	}
	if (val instanceof Promise || val.constructor && val.constructor.prototype === "AsyncFunction") {
		return "Promise";
	}
	if (typeof Element !== "undefined" && val instanceof Element) {
		return val.tagName;
	}
	if (typeof val.asymmetricMatch === "function") {
		return `${val.toString()} ${format(val.sample)}`;
	}
	if (typeof val.toJSON === "function") {
		return serializeValue(val.toJSON(), seen);
	}
	if (seen.has(val)) {
		return seen.get(val);
	}
	if (Array.isArray(val)) {
		const clone = new Array(val.length);
		seen.set(val, clone);
		val.forEach((e, i) => {
			try {
				clone[i] = serializeValue(e, seen);
			} catch (err) {
				clone[i] = getUnserializableMessage(err);
			}
		});
		return clone;
	} else {
		const clone = Object.create(null);
		seen.set(val, clone);
		let obj = val;
		while (obj && obj !== OBJECT_PROTO) {
			Object.getOwnPropertyNames(obj).forEach((key) => {
				if (key in clone) {
					return;
				}
				try {
					clone[key] = serializeValue(val[key], seen);
				} catch (err) {
					delete clone[key];
					clone[key] = getUnserializableMessage(err);
				}
			});
			obj = Object.getPrototypeOf(obj);
		}
		return clone;
	}
}
function normalizeErrorMessage(message) {
	return message.replace(/__(vite_ssr_import|vi_import)_\d+__\./g, "");
}
function processError(_err, diffOptions, seen = new WeakSet()) {
	if (!_err || typeof _err !== "object") {
		return { message: String(_err) };
	}
	const err = _err;
	if (err.stack) {
		err.stackStr = String(err.stack);
	}
	if (err.name) {
		err.nameStr = String(err.name);
	}
	if (err.showDiff || err.showDiff === undefined && err.expected !== undefined && err.actual !== undefined) {
		err.diff = printDiffOrStringify(err.actual, err.expected, {
			...diffOptions,
			...err.diffOptions
		});
	}
	if (typeof err.expected !== "string") {
		err.expected = stringify(err.expected, 10);
	}
	if (typeof err.actual !== "string") {
		err.actual = stringify(err.actual, 10);
	}
	try {
		if (typeof err.message === "string") {
			err.message = normalizeErrorMessage(err.message);
		}
	} catch {}
	try {
		if (!seen.has(err) && typeof err.cause === "object") {
			seen.add(err);
			err.cause = processError(err.cause, diffOptions, seen);
		}
	} catch {}
	try {
		return serializeValue(err);
	} catch (e) {
		return serializeValue(new Error(`Failed to fully serialize error: ${e === null || e === void 0 ? void 0 : e.message}\nInner error message: ${err === null || err === void 0 ? void 0 : err.message}`));
	}
}

export { processError, serializeValue as serializeError, serializeValue };
