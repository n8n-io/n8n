import { withLangGraph } from "./meta.js";
import { z } from "zod/v4";
import { getInteropZodDefaultGetter } from "@langchain/core/utils/types";
import { z as z$1 } from "zod/v3";

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
				return withLangGraph(zodThis, { jsonSchemaExtra });
			},
			reducer(fn, schema) {
				return withLangGraph(zodThis, {
					default: getInteropZodDefaultGetter(zodThis),
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
	applyPluginPrototype(z$1.ZodType.prototype);
	applyPluginPrototype(z.ZodType.prototype);
} catch (error) {
	throw new Error("Failed to extend Zod with LangGraph-related methods. This is most likely a bug, consider opening an issue and/or using `withLangGraph` to augment your Zod schema.", { cause: error });
}

//#endregion
export {  };
//# sourceMappingURL=plugin.js.map