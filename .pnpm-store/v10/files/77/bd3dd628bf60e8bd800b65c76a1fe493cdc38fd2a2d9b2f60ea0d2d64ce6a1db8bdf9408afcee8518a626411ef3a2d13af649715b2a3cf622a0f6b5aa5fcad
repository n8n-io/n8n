Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_callbacks_base = require("../callbacks/base.cjs");
const require_callbacks_manager = require("../callbacks/manager.cjs");
const require_utils_stream = require("../utils/stream.cjs");
const require_outputs = require("../outputs.cjs");
const require_language_models_base = require("./base.cjs");
const require_utils = require("./utils.cjs");
//#region src/language_models/llms.ts
var llms_exports = /* @__PURE__ */ require_runtime.__exportAll({
	BaseLLM: () => BaseLLM,
	LLM: () => LLM
});
/**
* LLM Wrapper. Takes in a prompt (or prompts) and returns a string.
*/
var BaseLLM = class BaseLLM extends require_language_models_base.BaseLanguageModel {
	lc_namespace = [
		"langchain",
		"llms",
		this._llmType()
	];
	/**
	* This method takes an input and options, and returns a string. It
	* converts the input to a prompt value and generates a result based on
	* the prompt.
	* @param input Input for the LLM.
	* @param options Options for the LLM call.
	* @returns A string result based on the prompt.
	*/
	async invoke(input, options) {
		const promptValue = BaseLLM._convertInputToPromptValue(input);
		return (await this.generatePrompt([promptValue], options, options?.callbacks)).generations[0][0].text;
	}
	async *_streamResponseChunks(_input, _options, _runManager) {
		throw new Error("Not implemented.");
	}
	_separateRunnableConfigFromCallOptionsCompat(options) {
		const [runnableConfig, callOptions] = super._separateRunnableConfigFromCallOptions(options);
		callOptions.signal = runnableConfig.signal;
		return [runnableConfig, callOptions];
	}
	async *_streamIterator(input, options) {
		if (this._streamResponseChunks === BaseLLM.prototype._streamResponseChunks) yield this.invoke(input, options);
		else {
			const prompt = BaseLLM._convertInputToPromptValue(input);
			const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(options);
			const invocationParams = this?.invocationParams(callOptions);
			const metadataInvocationParams = require_utils.parseMetadataInvocationParams(invocationParams);
			const callbackManager_ = require_callbacks_manager.CallbackManager.configure(runnableConfig.callbacks, this.callbacks, runnableConfig.tags, this.tags, runnableConfig.metadata, {
				...metadataInvocationParams,
				...this.metadata
			}, { verbose: this.verbose });
			const extra = {
				options: callOptions,
				invocation_params: invocationParams,
				batch_size: 1
			};
			const runManagers = await callbackManager_?.handleLLMStart(this.toJSON(), [prompt.toString()], runnableConfig.runId, void 0, extra, void 0, void 0, runnableConfig.runName);
			let generation = new require_outputs.GenerationChunk({ text: "" });
			try {
				for await (const chunk of this._streamResponseChunks(prompt.toString(), callOptions, runManagers?.[0])) {
					if (!generation) generation = chunk;
					else generation = generation.concat(chunk);
					if (typeof chunk.text === "string") yield chunk.text;
				}
			} catch (err) {
				await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMError(err)));
				throw err;
			}
			await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMEnd({ generations: [[generation]] })));
		}
	}
	/**
	* This method takes prompt values, options, and callbacks, and generates
	* a result based on the prompts.
	* @param promptValues Prompt values for the LLM.
	* @param options Options for the LLM call.
	* @param callbacks Callbacks for the LLM call.
	* @returns An LLMResult based on the prompts.
	*/
	async generatePrompt(promptValues, options, callbacks) {
		const prompts = promptValues.map((promptValue) => promptValue.toString());
		return this.generate(prompts, options, callbacks);
	}
	/**
	* Get the parameters used to invoke the model
	*/
	invocationParams(_options) {
		return {};
	}
	_flattenLLMResult(llmResult) {
		const llmResults = [];
		for (let i = 0; i < llmResult.generations.length; i += 1) {
			const genList = llmResult.generations[i];
			if (i === 0) llmResults.push({
				generations: [genList],
				llmOutput: llmResult.llmOutput
			});
			else {
				const llmOutput = llmResult.llmOutput ? {
					...llmResult.llmOutput,
					tokenUsage: {}
				} : void 0;
				llmResults.push({
					generations: [genList],
					llmOutput
				});
			}
		}
		return llmResults;
	}
	/** @ignore */
	async _generateUncached(prompts, parsedOptions, handledOptions, startedRunManagers) {
		let runManagers;
		if (startedRunManagers !== void 0 && startedRunManagers.length === prompts.length) runManagers = startedRunManagers;
		else {
			const invocationParams = this?.invocationParams(parsedOptions);
			const metadataInvocationParams = require_utils.parseMetadataInvocationParams(invocationParams);
			const callbackManager_ = require_callbacks_manager.CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, handledOptions.metadata, {
				...metadataInvocationParams,
				...this.metadata
			}, { verbose: this.verbose });
			const extra = {
				options: parsedOptions,
				invocation_params: invocationParams,
				batch_size: prompts.length
			};
			runManagers = await callbackManager_?.handleLLMStart(this.toJSON(), prompts, handledOptions.runId, void 0, extra, void 0, void 0, handledOptions?.runName);
		}
		const hasStreamingHandler = !!runManagers?.[0].handlers.find(require_callbacks_base.callbackHandlerPrefersStreaming);
		let output;
		if (hasStreamingHandler && prompts.length === 1 && this._streamResponseChunks !== BaseLLM.prototype._streamResponseChunks) try {
			const stream = await this._streamResponseChunks(prompts[0], parsedOptions, runManagers?.[0]);
			let aggregated;
			for await (const chunk of stream) if (aggregated === void 0) aggregated = chunk;
			else aggregated = require_utils_stream.concat(aggregated, chunk);
			if (aggregated === void 0) throw new Error("Received empty response from chat model call.");
			output = {
				generations: [[aggregated]],
				llmOutput: {}
			};
			await runManagers?.[0].handleLLMEnd(output);
		} catch (e) {
			await runManagers?.[0].handleLLMError(e);
			throw e;
		}
		else {
			try {
				output = await this._generate(prompts, parsedOptions, runManagers?.[0]);
			} catch (err) {
				await Promise.all((runManagers ?? []).map((runManager) => runManager?.handleLLMError(err)));
				throw err;
			}
			const flattenedOutputs = this._flattenLLMResult(output);
			await Promise.all((runManagers ?? []).map((runManager, i) => runManager?.handleLLMEnd(flattenedOutputs[i])));
		}
		const runIds = runManagers?.map((manager) => manager.runId) || void 0;
		Object.defineProperty(output, require_outputs.RUN_KEY, {
			value: runIds ? { runIds } : void 0,
			configurable: true
		});
		return output;
	}
	async _generateCached({ prompts, cache, llmStringKey, parsedOptions, handledOptions, runId }) {
		const invocationParams = this?.invocationParams(parsedOptions);
		const metadataInvocationParams = require_utils.parseMetadataInvocationParams(invocationParams);
		const callbackManager_ = require_callbacks_manager.CallbackManager.configure(handledOptions.callbacks, this.callbacks, handledOptions.tags, this.tags, handledOptions.metadata, {
			...metadataInvocationParams,
			...this.metadata
		}, { verbose: this.verbose });
		const extra = {
			options: parsedOptions,
			invocation_params: invocationParams,
			batch_size: prompts.length
		};
		const runManagers = await callbackManager_?.handleLLMStart(this.toJSON(), prompts, runId, void 0, extra, void 0, void 0, handledOptions?.runName);
		const missingPromptIndices = [];
		const cachedResults = (await Promise.allSettled(prompts.map(async (prompt, index) => {
			const result = await cache.lookup(prompt, llmStringKey);
			if (result == null) missingPromptIndices.push(index);
			return result;
		}))).map((result, index) => ({
			result,
			runManager: runManagers?.[index]
		})).filter(({ result }) => result.status === "fulfilled" && result.value != null || result.status === "rejected");
		const generations = [];
		await Promise.all(cachedResults.map(async ({ result: promiseResult, runManager }, i) => {
			if (promiseResult.status === "fulfilled") {
				const result = promiseResult.value;
				generations[i] = result.map((result) => {
					result.generationInfo = {
						...result.generationInfo,
						tokenUsage: {}
					};
					return result;
				});
				if (result.length) await runManager?.handleLLMNewToken(result[0].text);
				return runManager?.handleLLMEnd({ generations: [result] }, void 0, void 0, void 0, { cached: true });
			} else {
				await runManager?.handleLLMError(promiseResult.reason, void 0, void 0, void 0, { cached: true });
				return Promise.reject(promiseResult.reason);
			}
		}));
		const output = {
			generations,
			missingPromptIndices,
			startedRunManagers: runManagers
		};
		Object.defineProperty(output, require_outputs.RUN_KEY, {
			value: runManagers ? { runIds: runManagers?.map((manager) => manager.runId) } : void 0,
			configurable: true
		});
		return output;
	}
	/**
	* Run the LLM on the given prompts and input, handling caching.
	*/
	async generate(prompts, options, callbacks) {
		if (!Array.isArray(prompts)) throw new Error("Argument 'prompts' is expected to be a string[]");
		let parsedOptions;
		if (Array.isArray(options)) parsedOptions = { stop: options };
		else parsedOptions = options;
		const [runnableConfig, callOptions] = this._separateRunnableConfigFromCallOptionsCompat(parsedOptions);
		runnableConfig.callbacks = runnableConfig.callbacks ?? callbacks;
		if (!this.cache) return this._generateUncached(prompts, callOptions, runnableConfig);
		const { cache } = this;
		const llmStringKey = this._getSerializedCacheKeyParametersForCall(callOptions);
		const { generations, missingPromptIndices, startedRunManagers } = await this._generateCached({
			prompts,
			cache,
			llmStringKey,
			parsedOptions: callOptions,
			handledOptions: runnableConfig,
			runId: runnableConfig.runId
		});
		let llmOutput = {};
		if (missingPromptIndices.length > 0) {
			const results = await this._generateUncached(missingPromptIndices.map((i) => prompts[i]), callOptions, runnableConfig, startedRunManagers !== void 0 ? missingPromptIndices.map((i) => startedRunManagers?.[i]) : void 0);
			await Promise.all(results.generations.map(async (generation, index) => {
				const promptIndex = missingPromptIndices[index];
				generations[promptIndex] = generation;
				return cache.update(prompts[promptIndex], llmStringKey, generation);
			}));
			llmOutput = results.llmOutput ?? {};
		}
		return {
			generations,
			llmOutput
		};
	}
	/**
	* Get the identifying parameters of the LLM.
	*/
	_identifyingParams() {
		return {};
	}
	_modelType() {
		return "base_llm";
	}
};
/**
* LLM class that provides a simpler interface to subclass than {@link BaseLLM}.
*
* Requires only implementing a simpler {@link _call} method instead of {@link _generate}.
*
* @augments BaseLLM
*/
var LLM = class extends BaseLLM {
	async _generate(prompts, options, runManager) {
		return { generations: await Promise.all(prompts.map((prompt, promptIndex) => this._call(prompt, {
			...options,
			promptIndex
		}, runManager).then((text) => [{ text }]))) };
	}
};
//#endregion
exports.BaseLLM = BaseLLM;
exports.LLM = LLM;
Object.defineProperty(exports, "llms_exports", {
	enumerable: true,
	get: function() {
		return llms_exports;
	}
});

//# sourceMappingURL=llms.cjs.map