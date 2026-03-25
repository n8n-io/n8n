import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { getBufferString } from "../messages/utils.js";
import { getEnvironmentVariable } from "../utils/env.js";
import { BaseCallbackHandler, isBaseCallbackHandler } from "./base.js";
import { isBaseTracer } from "../tracers/base.js";
import { ConsoleCallbackHandler } from "../tracers/console.js";
import { LangChainTracer } from "../tracers/tracer_langchain.js";
import { consumeCallback } from "../singletons/callbacks.js";
import "./promises.js";
import { isTracingEnabled } from "../utils/callbacks.js";
import { _getConfigureHooks, getContextVariable } from "../singletons/async_local_storage/context.js";
import { v7 } from "uuid";
//#region src/callbacks/manager.ts
var manager_exports = /* @__PURE__ */ __exportAll({
	BaseCallbackManager: () => BaseCallbackManager,
	BaseRunManager: () => BaseRunManager,
	CallbackManager: () => CallbackManager,
	CallbackManagerForChainRun: () => CallbackManagerForChainRun,
	CallbackManagerForLLMRun: () => CallbackManagerForLLMRun,
	CallbackManagerForRetrieverRun: () => CallbackManagerForRetrieverRun,
	CallbackManagerForToolRun: () => CallbackManagerForToolRun,
	ensureHandler: () => ensureHandler,
	parseCallbackConfigArg: () => parseCallbackConfigArg
});
function parseCallbackConfigArg(arg) {
	if (!arg) return {};
	else if (Array.isArray(arg) || "name" in arg) return { callbacks: arg };
	else return arg;
}
/**
* Manage callbacks from different components of LangChain.
*/
var BaseCallbackManager = class {
	setHandler(handler) {
		return this.setHandlers([handler]);
	}
};
/**
* Base class for run manager in LangChain.
*/
var BaseRunManager = class {
	constructor(runId, handlers, inheritableHandlers, tags, inheritableTags, metadata, inheritableMetadata, _parentRunId) {
		this.runId = runId;
		this.handlers = handlers;
		this.inheritableHandlers = inheritableHandlers;
		this.tags = tags;
		this.inheritableTags = inheritableTags;
		this.metadata = metadata;
		this.inheritableMetadata = inheritableMetadata;
		this._parentRunId = _parentRunId;
	}
	get parentRunId() {
		return this._parentRunId;
	}
	async handleText(text) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			try {
				await handler.handleText?.(text, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleText: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleCustomEvent(eventName, data, _runId, _tags, _metadata) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			try {
				await handler.handleCustomEvent?.(eventName, data, this.runId, this.tags, this.metadata);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleCustomEvent: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
};
/**
* Manages callbacks for retriever runs.
*/
var CallbackManagerForRetrieverRun = class extends BaseRunManager {
	getChild(tag) {
		const manager = new CallbackManager(this.runId);
		manager.setHandlers(this.inheritableHandlers);
		manager.addTags(this.inheritableTags);
		manager.addMetadata(this.inheritableMetadata);
		if (tag) manager.addTags([tag], false);
		return manager;
	}
	async handleRetrieverEnd(documents) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreRetriever) try {
				await handler.handleRetrieverEnd?.(documents, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleRetriever`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleRetrieverError(err) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreRetriever) try {
				await handler.handleRetrieverError?.(err, this.runId, this._parentRunId, this.tags);
			} catch (error) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleRetrieverError: ${error}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
};
var CallbackManagerForLLMRun = class extends BaseRunManager {
	async handleLLMNewToken(token, idx, _runId, _parentRunId, _tags, fields) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreLLM) try {
				await handler.handleLLMNewToken?.(token, idx ?? {
					prompt: 0,
					completion: 0
				}, this.runId, this._parentRunId, this.tags, fields);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleLLMNewToken: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleLLMError(err, _runId, _parentRunId, _tags, extraParams) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreLLM) try {
				await handler.handleLLMError?.(err, this.runId, this._parentRunId, this.tags, extraParams);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleLLMError: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleLLMEnd(output, _runId, _parentRunId, _tags, extraParams) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreLLM) try {
				await handler.handleLLMEnd?.(output, this.runId, this._parentRunId, this.tags, extraParams);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleLLMEnd: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
};
var CallbackManagerForChainRun = class extends BaseRunManager {
	getChild(tag) {
		const manager = new CallbackManager(this.runId);
		manager.setHandlers(this.inheritableHandlers);
		manager.addTags(this.inheritableTags);
		manager.addMetadata(this.inheritableMetadata);
		if (tag) manager.addTags([tag], false);
		return manager;
	}
	async handleChainError(err, _runId, _parentRunId, _tags, kwargs) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreChain) try {
				await handler.handleChainError?.(err, this.runId, this._parentRunId, this.tags, kwargs);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleChainError: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleChainEnd(output, _runId, _parentRunId, _tags, kwargs) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreChain) try {
				await handler.handleChainEnd?.(output, this.runId, this._parentRunId, this.tags, kwargs);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleChainEnd: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleAgentAction(action) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreAgent) try {
				await handler.handleAgentAction?.(action, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleAgentAction: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleAgentEnd(action) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreAgent) try {
				await handler.handleAgentEnd?.(action, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleAgentEnd: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
};
var CallbackManagerForToolRun = class extends BaseRunManager {
	getChild(tag) {
		const manager = new CallbackManager(this.runId);
		manager.setHandlers(this.inheritableHandlers);
		manager.addTags(this.inheritableTags);
		manager.addMetadata(this.inheritableMetadata);
		if (tag) manager.addTags([tag], false);
		return manager;
	}
	async handleToolError(err) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreAgent) try {
				await handler.handleToolError?.(err, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleToolError: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleToolEvent(chunk) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreAgent) try {
				await handler.handleToolEvent?.(chunk, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	async handleToolEnd(output) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreAgent) try {
				await handler.handleToolEnd?.(output, this.runId, this._parentRunId, this.tags);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleToolEnd: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
};
/**
* @example
* ```typescript
* const prompt = PromptTemplate.fromTemplate("What is the answer to {question}?");
*
* // Example of using LLMChain with OpenAI and a simple prompt
* const chain = new LLMChain({
*   llm: new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.9 }),
*   prompt,
* });
*
* // Running the chain with a single question
* const result = await chain.call({
*   question: "What is the airspeed velocity of an unladen swallow?",
* });
* console.log("The answer is:", result);
* ```
*/
var CallbackManager = class CallbackManager extends BaseCallbackManager {
	handlers = [];
	inheritableHandlers = [];
	tags = [];
	inheritableTags = [];
	metadata = {};
	inheritableMetadata = {};
	name = "callback_manager";
	_parentRunId;
	constructor(parentRunId, options) {
		super();
		this.handlers = options?.handlers ?? this.handlers;
		this.inheritableHandlers = options?.inheritableHandlers ?? this.inheritableHandlers;
		this.tags = options?.tags ?? this.tags;
		this.inheritableTags = options?.inheritableTags ?? this.inheritableTags;
		this.metadata = options?.metadata ?? this.metadata;
		this.inheritableMetadata = options?.inheritableMetadata ?? this.inheritableMetadata;
		this._parentRunId = parentRunId;
	}
	/**
	* Gets the parent run ID, if any.
	*
	* @returns The parent run ID.
	*/
	getParentRunId() {
		return this._parentRunId;
	}
	async handleLLMStart(llm, prompts, runId = void 0, _parentRunId = void 0, extraParams = void 0, _tags = void 0, _metadata = void 0, runName = void 0) {
		return Promise.all(prompts.map(async (prompt, idx) => {
			const runId_ = idx === 0 && runId ? runId : v7();
			await Promise.all(this.handlers.map((handler) => {
				if (handler.ignoreLLM) return;
				if (isBaseTracer(handler)) handler._createRunForLLMStart(llm, [prompt], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
				return consumeCallback(async () => {
					try {
						await handler.handleLLMStart?.(llm, [prompt], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
					} catch (err) {
						(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleLLMStart: ${err}`);
						if (handler.raiseError) throw err;
					}
				}, handler.awaitHandlers);
			}));
			return new CallbackManagerForLLMRun(runId_, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
		}));
	}
	async handleChatModelStart(llm, messages, runId = void 0, _parentRunId = void 0, extraParams = void 0, _tags = void 0, _metadata = void 0, runName = void 0) {
		return Promise.all(messages.map(async (messageGroup, idx) => {
			const runId_ = idx === 0 && runId ? runId : v7();
			await Promise.all(this.handlers.map((handler) => {
				if (handler.ignoreLLM) return;
				if (isBaseTracer(handler)) handler._createRunForChatModelStart(llm, [messageGroup], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
				return consumeCallback(async () => {
					try {
						if (handler.handleChatModelStart) await handler.handleChatModelStart?.(llm, [messageGroup], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
						else if (handler.handleLLMStart) {
							const messageString = getBufferString(messageGroup);
							await handler.handleLLMStart?.(llm, [messageString], runId_, this._parentRunId, extraParams, this.tags, this.metadata, runName);
						}
					} catch (err) {
						(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleLLMStart: ${err}`);
						if (handler.raiseError) throw err;
					}
				}, handler.awaitHandlers);
			}));
			return new CallbackManagerForLLMRun(runId_, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
		}));
	}
	async handleChainStart(chain, inputs, runId = v7(), runType = void 0, _tags = void 0, _metadata = void 0, runName = void 0, _parentRunId = void 0, extra = void 0) {
		await Promise.all(this.handlers.map((handler) => {
			if (handler.ignoreChain) return;
			if (isBaseTracer(handler)) handler._createRunForChainStart(chain, inputs, runId, this._parentRunId, this.tags, this.metadata, runType, runName, extra);
			return consumeCallback(async () => {
				try {
					await handler.handleChainStart?.(chain, inputs, runId, this._parentRunId, this.tags, this.metadata, runType, runName, extra);
				} catch (err) {
					(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleChainStart: ${err}`);
					if (handler.raiseError) throw err;
				}
			}, handler.awaitHandlers);
		}));
		return new CallbackManagerForChainRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
	}
	async handleToolStart(tool, input, runId = v7(), _parentRunId = void 0, _tags = void 0, _metadata = void 0, runName = void 0, toolCallId = void 0) {
		await Promise.all(this.handlers.map((handler) => {
			if (handler.ignoreAgent) return;
			if (isBaseTracer(handler)) handler._createRunForToolStart(tool, input, runId, this._parentRunId, this.tags, this.metadata, runName);
			return consumeCallback(async () => {
				try {
					await handler.handleToolStart?.(tool, input, runId, this._parentRunId, this.tags, this.metadata, runName, toolCallId);
				} catch (err) {
					(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleToolStart: ${err}`);
					if (handler.raiseError) throw err;
				}
			}, handler.awaitHandlers);
		}));
		return new CallbackManagerForToolRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
	}
	async handleRetrieverStart(retriever, query, runId = v7(), _parentRunId = void 0, _tags = void 0, _metadata = void 0, runName = void 0) {
		await Promise.all(this.handlers.map((handler) => {
			if (handler.ignoreRetriever) return;
			if (isBaseTracer(handler)) handler._createRunForRetrieverStart(retriever, query, runId, this._parentRunId, this.tags, this.metadata, runName);
			return consumeCallback(async () => {
				try {
					await handler.handleRetrieverStart?.(retriever, query, runId, this._parentRunId, this.tags, this.metadata, runName);
				} catch (err) {
					(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleRetrieverStart: ${err}`);
					if (handler.raiseError) throw err;
				}
			}, handler.awaitHandlers);
		}));
		return new CallbackManagerForRetrieverRun(runId, this.handlers, this.inheritableHandlers, this.tags, this.inheritableTags, this.metadata, this.inheritableMetadata, this._parentRunId);
	}
	async handleCustomEvent(eventName, data, runId, _tags, _metadata) {
		await Promise.all(this.handlers.map((handler) => consumeCallback(async () => {
			if (!handler.ignoreCustomEvent) try {
				await handler.handleCustomEvent?.(eventName, data, runId, this.tags, this.metadata);
			} catch (err) {
				(handler.raiseError ? console.error : console.warn)(`Error in handler ${handler.constructor.name}, handleCustomEvent: ${err}`);
				if (handler.raiseError) throw err;
			}
		}, handler.awaitHandlers)));
	}
	addHandler(handler, inherit = true) {
		this.handlers.push(handler);
		if (inherit) this.inheritableHandlers.push(handler);
	}
	removeHandler(handler) {
		this.handlers = this.handlers.filter((_handler) => _handler !== handler);
		this.inheritableHandlers = this.inheritableHandlers.filter((_handler) => _handler !== handler);
	}
	setHandlers(handlers, inherit = true) {
		this.handlers = [];
		this.inheritableHandlers = [];
		for (const handler of handlers) this.addHandler(handler, inherit);
	}
	addTags(tags, inherit = true) {
		this.removeTags(tags);
		this.tags.push(...tags);
		if (inherit) this.inheritableTags.push(...tags);
	}
	removeTags(tags) {
		this.tags = this.tags.filter((tag) => !tags.includes(tag));
		this.inheritableTags = this.inheritableTags.filter((tag) => !tags.includes(tag));
	}
	addMetadata(metadata, inherit = true) {
		this.metadata = {
			...this.metadata,
			...metadata
		};
		if (inherit) this.inheritableMetadata = {
			...this.inheritableMetadata,
			...metadata
		};
	}
	removeMetadata(metadata) {
		for (const key of Object.keys(metadata)) {
			delete this.metadata[key];
			delete this.inheritableMetadata[key];
		}
	}
	copy(additionalHandlers = [], inherit = true) {
		const manager = new CallbackManager(this._parentRunId);
		for (const handler of this.handlers) {
			const inheritable = this.inheritableHandlers.includes(handler);
			manager.addHandler(handler, inheritable);
		}
		for (const tag of this.tags) {
			const inheritable = this.inheritableTags.includes(tag);
			manager.addTags([tag], inheritable);
		}
		for (const key of Object.keys(this.metadata)) {
			const inheritable = Object.keys(this.inheritableMetadata).includes(key);
			manager.addMetadata({ [key]: this.metadata[key] }, inheritable);
		}
		for (const handler of additionalHandlers) {
			if (manager.handlers.filter((h) => h.name === "console_callback_handler").some((h) => h.name === handler.name)) continue;
			manager.addHandler(handler, inherit);
		}
		return manager;
	}
	static fromHandlers(handlers) {
		class Handler extends BaseCallbackHandler {
			name = v7();
			constructor() {
				super();
				Object.assign(this, handlers);
			}
		}
		const manager = new this();
		manager.addHandler(new Handler());
		return manager;
	}
	static configure(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options) {
		return this._configureSync(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options);
	}
	static _configureSync(inheritableHandlers, localHandlers, inheritableTags, localTags, inheritableMetadata, localMetadata, options) {
		let callbackManager;
		if (inheritableHandlers || localHandlers) {
			if (Array.isArray(inheritableHandlers) || !inheritableHandlers) {
				callbackManager = new CallbackManager();
				callbackManager.setHandlers(inheritableHandlers?.map(ensureHandler) ?? [], true);
			} else callbackManager = inheritableHandlers;
			callbackManager = callbackManager.copy(Array.isArray(localHandlers) ? localHandlers.map(ensureHandler) : localHandlers?.handlers, false);
		}
		const verboseEnabled = getEnvironmentVariable("LANGCHAIN_VERBOSE") === "true" || options?.verbose;
		const traceableRunTree = LangChainTracer.getTraceableRunTree();
		const tracingV2Enabled = traceableRunTree?.tracingEnabled ?? isTracingEnabled();
		if (traceableRunTree?.tracingEnabled === false && callbackManager) {
			const inheritedTracers = callbackManager.handlers.filter((handler) => handler.name === "langchain_tracer");
			for (const tracer of inheritedTracers) callbackManager.removeHandler(tracer);
		}
		const tracingEnabled = tracingV2Enabled || (getEnvironmentVariable("LANGCHAIN_TRACING") ?? false);
		if (verboseEnabled || tracingEnabled) {
			if (!callbackManager) callbackManager = new CallbackManager();
			if (verboseEnabled && !callbackManager.handlers.some((handler) => handler.name === ConsoleCallbackHandler.prototype.name)) {
				const consoleHandler = new ConsoleCallbackHandler();
				callbackManager.addHandler(consoleHandler, true);
			}
			if (tracingEnabled && !callbackManager.handlers.some((handler) => handler.name === "langchain_tracer")) {
				if (tracingV2Enabled) {
					const tracerV2 = new LangChainTracer();
					callbackManager.addHandler(tracerV2, true);
				}
			}
			if (tracingV2Enabled) {
				if (traceableRunTree && callbackManager._parentRunId === void 0) {
					callbackManager._parentRunId = traceableRunTree.id;
					callbackManager.handlers.find((handler) => handler.name === "langchain_tracer")?.updateFromRunTree(traceableRunTree);
				}
			}
		}
		for (const { contextVar, inheritable = true, handlerClass, envVar } of _getConfigureHooks()) {
			const createIfNotInContext = envVar && getEnvironmentVariable(envVar) === "true" && handlerClass;
			let handler;
			const contextVarValue = contextVar !== void 0 ? getContextVariable(contextVar) : void 0;
			if (contextVarValue && isBaseCallbackHandler(contextVarValue)) handler = contextVarValue;
			else if (createIfNotInContext) handler = new handlerClass({});
			if (handler !== void 0) {
				if (!callbackManager) callbackManager = new CallbackManager();
				if (!callbackManager.handlers.some((h) => h.name === handler.name)) callbackManager.addHandler(handler, inheritable);
			}
		}
		if (inheritableTags || localTags) {
			if (callbackManager) {
				callbackManager.addTags(inheritableTags ?? []);
				callbackManager.addTags(localTags ?? [], false);
			}
		}
		if (inheritableMetadata || localMetadata) {
			if (callbackManager) {
				callbackManager.addMetadata(inheritableMetadata ?? {});
				callbackManager.addMetadata(localMetadata ?? {}, false);
			}
		}
		return callbackManager;
	}
};
function ensureHandler(handler) {
	if ("name" in handler) return handler;
	return BaseCallbackHandler.fromMethods(handler);
}
//#endregion
export { BaseCallbackManager, BaseRunManager, CallbackManager, CallbackManagerForChainRun, CallbackManagerForLLMRun, CallbackManagerForRetrieverRun, CallbackManagerForToolRun, ensureHandler, manager_exports, parseCallbackConfigArg };

//# sourceMappingURL=manager.js.map