Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_callbacks_manager = require("../callbacks/manager.cjs");
const require_config = require("../runnables/config.cjs");
const require_base = require("../runnables/base.cjs");
//#region src/retrievers/index.ts
var retrievers_exports = /* @__PURE__ */ require_runtime.__exportAll({ BaseRetriever: () => BaseRetriever });
/**
* Abstract base class for a document retrieval system, designed to
* process string queries and return the most relevant documents from a source.
*
* `BaseRetriever` provides common properties and methods for derived retrievers,
* such as callbacks, tagging, and verbose logging. Custom retrieval systems
* should extend this class and implement `_getRelevantDocuments` to define
* the specific retrieval logic.
*
* @template Metadata - The type of metadata associated with each document,
*                      defaulting to `Record<string, any>`.
*/
var BaseRetriever = class extends require_base.Runnable {
	/**
	* Optional callbacks to handle various events in the retrieval process.
	*/
	callbacks;
	/**
	* Tags to label or categorize the retrieval operation.
	*/
	tags;
	/**
	* Metadata to provide additional context or information about the retrieval
	* operation.
	*/
	metadata;
	/**
	* If set to `true`, enables verbose logging for the retrieval process.
	*/
	verbose;
	/**
	* Constructs a new `BaseRetriever` instance with optional configuration fields.
	*
	* @param fields - Optional input configuration that can include `callbacks`,
	*                 `tags`, `metadata`, and `verbose` settings for custom retriever behavior.
	*/
	constructor(fields) {
		super(fields);
		this.callbacks = fields?.callbacks;
		this.tags = fields?.tags ?? [];
		this.metadata = fields?.metadata ?? {};
		this.verbose = fields?.verbose ?? false;
	}
	/**
	* TODO: This should be an abstract method, but we'd like to avoid breaking
	* changes to people currently using subclassed custom retrievers.
	* Change it on next major release.
	*/
	/**
	* Placeholder method for retrieving relevant documents based on a query.
	*
	* This method is intended to be implemented by subclasses and will be
	* converted to an abstract method in the next major release. Currently, it
	* throws an error if not implemented, ensuring that custom retrievers define
	* the specific retrieval logic.
	*
	* @param _query - The query string used to search for relevant documents.
	* @param _callbacks - (optional) Callback manager for managing callbacks
	*                     during retrieval.
	* @returns A promise resolving to an array of `DocumentInterface` instances relevant to the query.
	* @throws {Error} Throws an error indicating the method is not implemented.
	*/
	_getRelevantDocuments(_query, _callbacks) {
		throw new Error("Not implemented!");
	}
	/**
	* Executes a retrieval operation.
	*
	* @param input - The query string used to search for relevant documents.
	* @param options - (optional) Configuration options for the retrieval run,
	*                  which may include callbacks, tags, and metadata.
	* @returns A promise that resolves to an array of `DocumentInterface` instances
	*          representing the most relevant documents to the query.
	*/
	async invoke(input, options) {
		const parsedConfig = require_config.ensureConfig(require_callbacks_manager.parseCallbackConfigArg(options));
		const runManager = await (await require_callbacks_manager.CallbackManager.configure(parsedConfig.callbacks, this.callbacks, parsedConfig.tags, this.tags, parsedConfig.metadata, this.metadata, { verbose: this.verbose }))?.handleRetrieverStart(this.toJSON(), input, parsedConfig.runId, void 0, void 0, void 0, parsedConfig.runName);
		try {
			const results = await this._getRelevantDocuments(input, runManager);
			await runManager?.handleRetrieverEnd(results);
			return results;
		} catch (error) {
			await runManager?.handleRetrieverError(error);
			throw error;
		}
	}
};
//#endregion
exports.BaseRetriever = BaseRetriever;
Object.defineProperty(exports, "retrievers_exports", {
	enumerable: true,
	get: function() {
		return retrievers_exports;
	}
});

//# sourceMappingURL=index.cjs.map