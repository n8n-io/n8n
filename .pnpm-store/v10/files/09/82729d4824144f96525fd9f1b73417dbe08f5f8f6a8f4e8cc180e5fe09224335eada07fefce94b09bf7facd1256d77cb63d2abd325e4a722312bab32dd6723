
//#region src/pregel/types.ts
var Call = class {
	func;
	name;
	input;
	retry;
	cache;
	callbacks;
	__lg_type = "call";
	constructor({ func, name, input, retry, cache, callbacks }) {
		this.func = func;
		this.name = name;
		this.input = input;
		this.retry = retry;
		this.cache = cache;
		this.callbacks = callbacks;
	}
};
function isCall(value) {
	return typeof value === "object" && value !== null && "__lg_type" in value && value.__lg_type === "call";
}

//#endregion
exports.Call = Call;
exports.isCall = isCall;
//# sourceMappingURL=types.cjs.map