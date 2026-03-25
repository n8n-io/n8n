const require_rolldown_runtime = require('../rolldown-runtime.cjs');
const vue = require_rolldown_runtime.__toESM(require("vue"));

//#region src/shared/createContext.ts
/**
* @param providerComponentName - The name(s) of the component(s) providing the context.
*
* There are situations where context can come from multiple components. In such cases, you might need to give an array of component names to provide your context, instead of just a single string.
*
* @param contextName The description for injection key symbol.
*/
function createContext(providerComponentName, contextName) {
	const symbolDescription = typeof providerComponentName === "string" && !contextName ? `${providerComponentName}Context` : contextName;
	const injectionKey = Symbol(symbolDescription);
	/**
	* @param fallback The context value to return if the injection fails.
	*
	* @throws When context injection failed and no fallback is specified.
	* This happens when the component injecting the context is not a child of the root component providing the context.
	*/
	const injectContext = (fallback) => {
		const context = (0, vue.inject)(injectionKey, fallback);
		if (context) return context;
		if (context === null) return context;
		throw new Error(`Injection \`${injectionKey.toString()}\` not found. Component must be used within ${Array.isArray(providerComponentName) ? `one of the following components: ${providerComponentName.join(", ")}` : `\`${providerComponentName}\``}`);
	};
	const provideContext = (contextValue) => {
		(0, vue.provide)(injectionKey, contextValue);
		return contextValue;
	};
	return [injectContext, provideContext];
}

//#endregion
Object.defineProperty(exports, 'createContext', {
  enumerable: true,
  get: function () {
    return createContext;
  }
});
//# sourceMappingURL=createContext.cjs.map