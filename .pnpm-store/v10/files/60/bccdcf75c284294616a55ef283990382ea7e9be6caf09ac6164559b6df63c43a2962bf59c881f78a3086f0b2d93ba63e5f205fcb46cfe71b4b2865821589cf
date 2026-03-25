const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_meta = require('./meta.cjs');
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const zod = require_rolldown_runtime.__toESM(require("zod"));

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
				const defaultFn = (0, __langchain_core_utils_types.getInteropZodDefaultGetter)(zodThis);
				return require_meta.withLangGraph(zodThis, {
					default: defaultFn,
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
	applyPluginPrototype(zod.z.ZodType.prototype);
} catch (error) {
	throw new Error("Failed to extend Zod with LangGraph-related methods. This is most likely a bug, consider opening an issue and/or using `withLangGraph` to augment your Zod schema.", { cause: error });
}

//#endregion
//# sourceMappingURL=plugin.cjs.map