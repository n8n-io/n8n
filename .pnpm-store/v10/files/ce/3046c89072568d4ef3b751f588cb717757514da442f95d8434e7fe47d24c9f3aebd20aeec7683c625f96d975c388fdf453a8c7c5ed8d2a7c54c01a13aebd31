
//#region src/index.ts
const table = /* @__PURE__ */ new WeakMap();
let counter = 0;
const { toString } = Object.prototype;
const isType = (arg, type) => toString.call(arg) === `[object ${type}]`;
const isPlainObject = (val) => {
	const prototype = Object.getPrototypeOf(val);
	return prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null;
};
function stableHash(arg, crossRealm) {
	const type = typeof arg;
	const constructor = arg === null || arg === void 0 ? void 0 : arg.constructor;
	const isDate = crossRealm ? isType(arg, "Date") : constructor === Date;
	if (Object(arg) === arg && !isDate && !(crossRealm ? isType(arg, "RegExp") : constructor === RegExp)) {
		const arg_ = arg;
		let result = table.get(arg_);
		if (result) return result;
		result = ++counter + "~";
		table.set(arg_, result);
		let index;
		if (crossRealm ? Array.isArray(arg) : constructor === Array) {
			const arg_$1 = arg;
			result = "@";
			for (index = 0; index < arg_$1.length; index++) result += stableHash(arg_$1[index], crossRealm) + ",";
			table.set(arg_$1, result);
		} else if (crossRealm ? isPlainObject(arg_) : constructor === null || constructor === Object) {
			result = "#";
			const keys = Object.keys(arg_).sort();
			while ((index = keys.pop()) !== void 0) {
				const index_ = index;
				if (arg_[index_] !== void 0) result += index + ":" + stableHash(arg_[index_], crossRealm) + ",";
			}
			table.set(arg_, result);
		}
		return result;
	}
	if (isDate) return arg.toJSON();
	if (type === "symbol") return arg.toString();
	return type === "string" ? JSON.stringify(arg) : "" + arg;
}

//#endregion
exports.hash = stableHash;
exports.stableHash = stableHash;