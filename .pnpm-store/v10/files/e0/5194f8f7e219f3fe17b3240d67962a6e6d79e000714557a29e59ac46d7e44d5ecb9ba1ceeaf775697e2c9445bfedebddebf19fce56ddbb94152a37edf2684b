const require_meta = require('./meta.cjs');
let zod_v4 = require("zod/v4");
let _langchain_core_utils_types = require("@langchain/core/utils/types");
let zod_v3 = require("zod/v3");

//#region src/graph/zod/plugin.ts
const metaSymbol = Symbol.for("langgraph-zod");
if (!(metaSymbol in globalThis)) globalThis[metaSymbol] = /* @__PURE__ */ new WeakSet();
function applyPluginPrototype(prototype) {
	const cache = globalThis[metaSymbol];
	if (cache.has(prototype)) return;
	Object.defineProperty(prototype, "langgraph", { get() {
		const zodThis = this;
		return {
			metadata(jsonSchemaExtra) {
				return require_meta.withLangGraph(zodThis, { jsonSchemaExtra });
			},
			reducer(fn, schema) {
				return require_meta.withLangGraph(zodThis, {
					default: (0, _langchain_core_utils_types.getInteropZodDefaultGetter)(zodThis),
					reducer: {
						schema,
						fn
					}
				});
			}
		};
	} });
	cache.add(prototype);
}
try {
	applyPluginPrototype(zod_v3.z.ZodType.prototype);
	applyPluginPrototype(zod_v4.z.ZodType.prototype);
} catch (error) {
	throw new Error("Failed to extend Zod with LangGraph-related methods. This is most likely a bug, consider opening an issue and/or using `withLangGraph` to augment your Zod schema.", { cause: error });
}

//#endregion
//# sourceMappingURL=plugin.cjs.map