import { ensureConfig } from "@langchain/core/runnables";
import { BaseLangChain } from "@langchain/core/language_models/base";
import { RUN_KEY } from "@langchain/core/outputs";
import { CallbackManager, parseCallbackConfigArg } from "@langchain/core/callbacks/manager";

//#region src/chains/base.ts
/**
* Base interface that all chains must implement.
*/
var BaseChain = class extends BaseLangChain {
	get lc_namespace() {
		return [
			"langchain",
			"chains",
			this._chainType()
		];
	}
	constructor(fields, verbose, callbacks) {
		if (arguments.length === 1 && typeof fields === "object" && !("saveContext" in fields)) {
			const { memory, callbackManager,...rest } = fields;
			super({
				...rest,
				callbacks: callbackManager ?? rest.callbacks
			});
			this.memory = memory;
		} else {
			super({
				verbose,
				callbacks
			});
			this.memory = fields;
		}
	}
	/** @ignore */
	_selectMemoryInputs(values) {
		const valuesForMemory = { ...values };
		if ("signal" in valuesForMemory) delete valuesForMemory.signal;
		if ("timeout" in valuesForMemory) delete valuesForMemory.timeout;
		return valuesForMemory;
	}
	/**
	* Invoke the chain with the provided input and returns the output.
	* @param input Input values for the chain run.
	* @param config Optional configuration for the Runnable.
	* @returns Promise that resolves with the output of the chain run.
	*/
	async invoke(input, options) {
		const config = ensureConfig(options);
		const fullValues = await this._formatValues(input);
		const callbackManager_ = await CallbackManager.configure(config?.callbacks, this.callbacks, config?.tags, this.tags, config?.metadata, this.metadata, { verbose: this.verbose });
		const runManager = await callbackManager_?.handleChainStart(this.toJSON(), fullValues, void 0, void 0, void 0, void 0, config?.runName);
		let outputValues;
		try {
			if (fullValues.signal) {
				let listener;
				outputValues = await Promise.race([this._call(fullValues, runManager, config), new Promise((_, reject) => {
					listener = () => {
						reject(/* @__PURE__ */ new Error("AbortError"));
					};
					fullValues.signal?.addEventListener("abort", listener);
				})]).finally(() => {
					if (fullValues.signal && listener) fullValues.signal.removeEventListener("abort", listener);
				});
			} else outputValues = await this._call(fullValues, runManager, config);
		} catch (e) {
			await runManager?.handleChainError(e);
			throw e;
		}
		if (!(this.memory == null)) await this.memory.saveContext(this._selectMemoryInputs(input), outputValues);
		await runManager?.handleChainEnd(outputValues);
		Object.defineProperty(outputValues, RUN_KEY, {
			value: runManager ? { runId: runManager?.runId } : void 0,
			configurable: true
		});
		return outputValues;
	}
	_validateOutputs(outputs) {
		const missingKeys = this.outputKeys.filter((k) => !(k in outputs));
		if (missingKeys.length) throw new Error(`Missing output keys: ${missingKeys.join(", ")} from chain ${this._chainType()}`);
	}
	async prepOutputs(inputs, outputs, returnOnlyOutputs = false) {
		this._validateOutputs(outputs);
		if (this.memory) await this.memory.saveContext(inputs, outputs);
		if (returnOnlyOutputs) return outputs;
		return {
			...inputs,
			...outputs
		};
	}
	/**
	* Return a json-like object representing this chain.
	*/
	serialize() {
		throw new Error("Method not implemented.");
	}
	/** @deprecated Use .invoke() instead. Will be removed in 0.2.0. */
	async run(input, config) {
		const inputKeys = this.inputKeys.filter((k) => !this.memory?.memoryKeys.includes(k));
		const isKeylessInput = inputKeys.length <= 1;
		if (!isKeylessInput) throw new Error(`Chain ${this._chainType()} expects multiple inputs, cannot use 'run' `);
		const values = inputKeys.length ? { [inputKeys[0]]: input } : {};
		const returnValues = await this.call(values, config);
		const keys = Object.keys(returnValues);
		if (keys.length === 1) return returnValues[keys[0]];
		throw new Error("return values have multiple keys, `run` only supported when one key currently");
	}
	async _formatValues(values) {
		const fullValues = { ...values };
		if (fullValues.timeout && !fullValues.signal) {
			fullValues.signal = AbortSignal.timeout(fullValues.timeout);
			delete fullValues.timeout;
		}
		if (!(this.memory == null)) {
			const newValues = await this.memory.loadMemoryVariables(this._selectMemoryInputs(values));
			for (const [key, value] of Object.entries(newValues)) fullValues[key] = value;
		}
		return fullValues;
	}
	/**
	* @deprecated Use .invoke() instead. Will be removed in 0.2.0.
	*
	* Run the core logic of this chain and add to output if desired.
	*
	* Wraps _call and handles memory.
	*/
	async call(values, config, tags) {
		const parsedConfig = {
			tags,
			...parseCallbackConfigArg(config)
		};
		return this.invoke(values, parsedConfig);
	}
	/**
	* @deprecated Use .batch() instead. Will be removed in 0.2.0.
	*
	* Call the chain on all inputs in the list
	*/
	async apply(inputs, config) {
		return Promise.all(inputs.map(async (i, idx) => this.call(i, config?.[idx])));
	}
	/**
	* Load a chain from a json-like object describing it.
	*/
	static async deserialize(data, values = {}) {
		switch (data._type) {
			case "llm_chain": {
				const { LLMChain } = await import("./llm_chain.js");
				return LLMChain.deserialize(data);
			}
			case "sequential_chain": {
				const { SequentialChain } = await import("./sequential_chain.js");
				return SequentialChain.deserialize(data);
			}
			case "simple_sequential_chain": {
				const { SimpleSequentialChain } = await import("./sequential_chain.js");
				return SimpleSequentialChain.deserialize(data);
			}
			case "stuff_documents_chain": {
				const { StuffDocumentsChain } = await import("./combine_docs_chain.js");
				return StuffDocumentsChain.deserialize(data);
			}
			case "map_reduce_documents_chain": {
				const { MapReduceDocumentsChain } = await import("./combine_docs_chain.js");
				return MapReduceDocumentsChain.deserialize(data);
			}
			case "refine_documents_chain": {
				const { RefineDocumentsChain } = await import("./combine_docs_chain.js");
				return RefineDocumentsChain.deserialize(data);
			}
			case "vector_db_qa": {
				const { VectorDBQAChain } = await import("./vector_db_qa.js");
				return VectorDBQAChain.deserialize(data, values);
			}
			case "api_chain": {
				const { APIChain } = await import("./api/api_chain.js");
				return APIChain.deserialize(data);
			}
			default: throw new Error(`Invalid prompt type in config: ${data._type}`);
		}
	}
};

//#endregion
export { BaseChain };
//# sourceMappingURL=base.js.map