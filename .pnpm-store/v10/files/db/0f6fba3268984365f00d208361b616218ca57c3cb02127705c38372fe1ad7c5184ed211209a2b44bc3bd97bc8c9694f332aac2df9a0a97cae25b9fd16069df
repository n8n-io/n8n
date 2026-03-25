Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_utils_async_caller = require("./async_caller.cjs");
let js_tiktoken_lite = require("js-tiktoken/lite");
//#region src/utils/tiktoken.ts
var tiktoken_exports = /* @__PURE__ */ require_runtime.__exportAll({
	encodingForModel: () => encodingForModel,
	getEncoding: () => getEncoding
});
const cache = {};
const caller = /* @__PURE__ */ new require_utils_async_caller.AsyncCaller({});
async function getEncoding(encoding) {
	if (!(encoding in cache)) cache[encoding] = caller.fetch(`https://tiktoken.pages.dev/js/${encoding}.json`).then((res) => res.json()).then((data) => new js_tiktoken_lite.Tiktoken(data)).catch((e) => {
		delete cache[encoding];
		throw e;
	});
	return await cache[encoding];
}
async function encodingForModel(model) {
	return getEncoding((0, js_tiktoken_lite.getEncodingNameForModel)(model));
}
//#endregion
exports.encodingForModel = encodingForModel;
exports.getEncoding = getEncoding;
Object.defineProperty(exports, "tiktoken_exports", {
	enumerable: true,
	get: function() {
		return tiktoken_exports;
	}
});

//# sourceMappingURL=tiktoken.cjs.map