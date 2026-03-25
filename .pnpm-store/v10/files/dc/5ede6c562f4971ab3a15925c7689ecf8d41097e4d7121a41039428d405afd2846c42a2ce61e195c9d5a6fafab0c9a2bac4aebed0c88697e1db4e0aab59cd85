//#region src/utils/namespace.ts
/**
* Create a symbol-based namespace for hierarchical `isInstance` checking.
*
* Each namespace level gets its own `Symbol.for(path)`. When a class is
* branded via `.brand()`, only the new symbol for that level is stamped
* on the prototype. Parent symbols are inherited implicitly through the
* class extension chain -- `symbol in obj` traverses the prototype chain,
* so a `ConfigError` instance is recognized by `LangChainError.isInstance()`
* because it extends `GoogleError` which extends `LangChainError`, whose
* prototype already carries the `langchain.error` symbol.
*
* @param path - The dot-separated namespace path (e.g. "langchain.error")
* @returns A Namespace object with `.brand()`, `.sub()`, and `.isInstance()`
*
* @example
* ```typescript
* const langchain = createNamespace("langchain");
* const errorNs = langchain.sub("error");
* const googleNs = errorNs.sub("google");
*
* class LangChainError extends errorNs.brand(Error) {}
* class GoogleError extends googleNs.brand(LangChainError) {}
* class ConfigError extends googleNs.brand(GoogleError, "configuration") {}
*
* const err = new ConfigError("bad config");
* LangChainError.isInstance(err); // true (checks langchain.error symbol)
* GoogleError.isInstance(err);    // true (checks langchain.error.google symbol)
* ConfigError.isInstance(err);    // true (checks langchain.error.google.configuration symbol)
* ```
*/
function createNamespace(path) {
	const symbol = Symbol.for(path);
	return {
		brand(Base, marker) {
			const brandSymbol = marker ? Symbol.for(`${path}.${marker}`) : symbol;
			class _Branded extends Base {
				[brandSymbol] = true;
				constructor(...args) {
					super(...args);
				}
				static isInstance(obj) {
					return typeof obj === "object" && obj !== null && brandSymbol in obj && obj[brandSymbol] === true;
				}
			}
			Object.defineProperty(_Branded, "name", { value: Base.name });
			return _Branded;
		},
		sub(childPath) {
			return createNamespace(`${path}.${childPath}`);
		},
		isInstance(obj) {
			return typeof obj === "object" && obj !== null && symbol in obj && obj[symbol] === true;
		}
	};
}
/** Base namespace used throughout LangChain */
const ns = createNamespace("langchain");
//#endregion
exports.ns = ns;

//# sourceMappingURL=namespace.cjs.map