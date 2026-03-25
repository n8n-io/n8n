
//#region src/logging/index.ts
const GLOBAL_LOGGER = Symbol.for("langgraph.api.sdk-logger");
/**
* Retrieves the global logger instance for LangGraph Platform.
*
* The logger provides structured logging capabilities with
* various log levels (error, warn, info, debug, etc.) and extra metadata such as node name etc.
*
* @returns {Logger} The global logger instance with leveled logging methods
*
* @throws {Error} When the logger is not available in the current environment
*
* @example
* ```typescript
* // Safe usage with fallback
* const logger = getLogger();
* logger.info("This will only work in LangGraph Platform environment");
* ```
*
* @remarks
* This method is designed to work specifically within the LangGraph Platform
* environment where a global logger is automatically registered. If you're
* developing locally or in an environment where LangGraph Platform is not
* available, this function will throw an error.
*/
const getLogger = () => {
	const maybeGlobal = globalThis;
	if (GLOBAL_LOGGER in maybeGlobal) return maybeGlobal[GLOBAL_LOGGER];
	throw new Error("Logger not available in current environment. This method requires LangGraph Platform environment where a global logger is automatically registered. If you're developing locally, consider using `console.log` or a local logging library instead.");
};

//#endregion
exports.getLogger = getLogger;
//# sourceMappingURL=index.cjs.map