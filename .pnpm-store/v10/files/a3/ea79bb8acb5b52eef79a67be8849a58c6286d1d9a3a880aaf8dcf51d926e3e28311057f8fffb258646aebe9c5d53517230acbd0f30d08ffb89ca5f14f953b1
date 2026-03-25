import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { Serializable, get_lc_unique_name } from "../load/serializable.js";
import { getEnvironmentVariable } from "../utils/env.js";
import * as uuid from "uuid";
//#region src/callbacks/base.ts
var base_exports = /* @__PURE__ */ __exportAll({
	BaseCallbackHandler: () => BaseCallbackHandler,
	callbackHandlerPrefersStreaming: () => callbackHandlerPrefersStreaming,
	isBaseCallbackHandler: () => isBaseCallbackHandler
});
/**
* Abstract class that provides a set of optional methods that can be
* overridden in derived classes to handle various events during the
* execution of a LangChain application.
*/
var BaseCallbackHandlerMethodsClass = class {};
function callbackHandlerPrefersStreaming(x) {
	return "lc_prefer_streaming" in x && x.lc_prefer_streaming;
}
/**
* Abstract base class for creating callback handlers in the LangChain
* framework. It provides a set of optional methods that can be overridden
* in derived classes to handle various events during the execution of a
* LangChain application.
*/
var BaseCallbackHandler = class extends BaseCallbackHandlerMethodsClass {
	lc_serializable = false;
	get lc_namespace() {
		return [
			"langchain_core",
			"callbacks",
			this.name
		];
	}
	get lc_secrets() {}
	get lc_attributes() {}
	get lc_aliases() {}
	get lc_serializable_keys() {}
	/**
	* The name of the serializable. Override to provide an alias or
	* to preserve the serialized module name in minified environments.
	*
	* Implemented as a static method to support loading logic.
	*/
	static lc_name() {
		return this.name;
	}
	/**
	* The final serialized identifier for the module.
	*/
	get lc_id() {
		return [...this.lc_namespace, get_lc_unique_name(this.constructor)];
	}
	lc_kwargs;
	ignoreLLM = false;
	ignoreChain = false;
	ignoreAgent = false;
	ignoreRetriever = false;
	ignoreCustomEvent = false;
	raiseError = false;
	awaitHandlers = getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false";
	constructor(input) {
		super();
		this.lc_kwargs = input || {};
		if (input) {
			this.ignoreLLM = input.ignoreLLM ?? this.ignoreLLM;
			this.ignoreChain = input.ignoreChain ?? this.ignoreChain;
			this.ignoreAgent = input.ignoreAgent ?? this.ignoreAgent;
			this.ignoreRetriever = input.ignoreRetriever ?? this.ignoreRetriever;
			this.ignoreCustomEvent = input.ignoreCustomEvent ?? this.ignoreCustomEvent;
			this.raiseError = input.raiseError ?? this.raiseError;
			this.awaitHandlers = this.raiseError || (input._awaitHandler ?? this.awaitHandlers);
		}
	}
	copy() {
		return new this.constructor(this);
	}
	toJSON() {
		return Serializable.prototype.toJSON.call(this);
	}
	toJSONNotImplemented() {
		return Serializable.prototype.toJSONNotImplemented.call(this);
	}
	static fromMethods(methods) {
		class Handler extends BaseCallbackHandler {
			name = uuid.v7();
			constructor() {
				super();
				Object.assign(this, methods);
			}
		}
		return new Handler();
	}
};
const isBaseCallbackHandler = (x) => {
	const callbackHandler = x;
	return callbackHandler !== void 0 && typeof callbackHandler.copy === "function" && typeof callbackHandler.name === "string" && typeof callbackHandler.awaitHandlers === "boolean";
};
//#endregion
export { BaseCallbackHandler, base_exports, callbackHandlerPrefersStreaming, isBaseCallbackHandler };

//# sourceMappingURL=base.js.map