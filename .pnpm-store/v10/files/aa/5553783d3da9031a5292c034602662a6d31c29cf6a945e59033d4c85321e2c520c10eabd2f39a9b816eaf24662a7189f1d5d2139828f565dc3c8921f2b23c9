import { withLangGraph } from "./meta.js";
import { getInteropZodDefaultGetter } from "@langchain/core/utils/types";
import { z } from "zod/v3";
import { z as z$1 } from "zod";

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
				const defaultFn = getInteropZodDefaultGetter(zodThis);
				return withLangGraph(zodThis, {
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
	applyPluginPrototype(z.ZodType.prototype);
	applyPluginPrototype(z$1.ZodType.prototype);
} catch (error) {
	throw new Error("Failed to extend Zod with LangGraph-related methods. This is most likely a bug, consider opening an issue and/or using `withLangGraph` to augment your Zod schema.", { cause: error });
}

//#endregion
export {  };
//# sourceMappingURL=plugin.js.map