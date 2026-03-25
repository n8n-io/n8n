
//#region src/index.ts
const table = /* @__PURE__ */ new WeakMap();
let counter = 0;
function stableHash(arg) {
	const type = typeof arg;
	const constructor = arg === null || arg === void 0 ? void 0 : arg.constructor;
	const isDate = constructor === Date;
	if (Object(arg) === arg && !isDate && constructor != RegExp) {
		const arg_ = arg;
		let result = table.get(arg_);
		if (result) return result;
		result = ++counter + "~";
		table.set(arg_, result);
		let index;
		if (constructor === Array) {
			const arg_$1 = arg;
			result = "@";
			for (index = 0; index < arg_$1.length; index++) result += stableHash(arg_$1[index]) + ",";
			table.set(arg_$1, result);
		} else if (constructor === Object) {
			result = "#";
			const keys = Object.keys(arg_).sort();
			while ((index = keys.pop()) !== void 0) {
				const index_ = index;
				if (arg_[index_] !== void 0) result += index + ":" + stableHash(arg_[index_]) + ",";
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