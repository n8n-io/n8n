import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { ApifyClient } from "apify-client";

//#region src/document_loaders/web/apify_dataset.ts
var apify_dataset_exports = {};
__export(apify_dataset_exports, { ApifyDatasetLoader: () => ApifyDatasetLoader });
/**
* A class that extends the BaseDocumentLoader and implements the
* DocumentLoader interface. It represents a document loader that loads
* documents from an Apify dataset.
* @example
* ```typescript
* const loader = new ApifyDatasetLoader("your-dataset-id", {
*   datasetMappingFunction: (item) =>
*     new Document({
*       pageContent: item.text || "",
*       metadata: { source: item.url },
*     }),
*   clientOptions: {
*     token: "your-apify-token",
*   },
* });
*
* const docs = await loader.load();
*
* const chain = new RetrievalQAChain();
* const res = await chain.invoke({ query: "What is LangChain?" });
*
* console.log(res.text);
* console.log(res.sourceDocuments.map((d) => d.metadata.source));
* ```
*/
var ApifyDatasetLoader = class ApifyDatasetLoader extends BaseDocumentLoader {
	apifyClient;
	datasetId;
	datasetMappingFunction;
	caller;
	constructor(datasetId, config) {
		super();
		const { clientOptions, datasetMappingFunction,...asyncCallerParams } = config;
		this.apifyClient = ApifyDatasetLoader._getApifyClient(clientOptions);
		this.datasetId = datasetId;
		this.datasetMappingFunction = datasetMappingFunction;
		this.caller = new AsyncCaller(asyncCallerParams);
	}
	/**
	* Creates an instance of the ApifyClient class with the provided clientOptions.
	* Adds a User-Agent header to the request config for langchainjs attribution.
	* @param clientOptions
	* @private
	*/
	static _getApifyClient(clientOptions) {
		const token = ApifyDatasetLoader._getApifyApiToken(clientOptions);
		const updatedClientOptions = {
			...clientOptions,
			token,
			requestInterceptors: [...clientOptions?.requestInterceptors ?? [], ApifyDatasetLoader._addUserAgent]
		};
		return new ApifyClient({
			...updatedClientOptions,
			token
		});
	}
	static _getApifyApiToken(config) {
		return config?.token ?? getEnvironmentVariable("APIFY_API_TOKEN");
	}
	/**
	* Adds a User-Agent header to the request config.
	* @param config
	* @private
	*/
	static _addUserAgent(config) {
		const updatedConfig = { ...config };
		updatedConfig.headers ??= {};
		updatedConfig.headers["User-Agent"] = `${updatedConfig.headers["User-Agent"] ?? ""}; Origin/langchainjs`;
		return updatedConfig;
	}
	/**
	* Retrieves the dataset items from the Apify platform and applies the
	* datasetMappingFunction to each item to create an array of Document
	* instances.
	* @returns An array of Document instances.
	*/
	async load() {
		const dataset = await this.apifyClient.dataset(this.datasetId).listItems({ clean: true });
		const documentList = await Promise.all(dataset.items.map((item) => this.caller.call(async () => this.datasetMappingFunction(item))));
		return documentList.flat();
	}
	/**
	* Create an ApifyDatasetLoader by calling an Actor on the Apify platform and waiting for its results to be ready.
	* @param actorId The ID or name of the Actor on the Apify platform.
	* @param input The input object of the Actor that you're trying to run.
	* @param config Options specifying settings for the Actor run.
	* @param config.datasetMappingFunction A function that takes a single object (an Apify dataset item) and converts it to an instance of the Document class.
	* @returns An instance of `ApifyDatasetLoader` with the results from the Actor run.
	*/
	static async fromActorCall(actorId, input, config) {
		const apifyApiToken = ApifyDatasetLoader._getApifyApiToken(config.clientOptions);
		const apifyClient = ApifyDatasetLoader._getApifyClient(config.clientOptions);
		const actorCall = await apifyClient.actor(actorId).call(input, config.callOptions ?? {});
		return new ApifyDatasetLoader(actorCall.defaultDatasetId, {
			datasetMappingFunction: config.datasetMappingFunction,
			clientOptions: {
				...config.clientOptions,
				token: apifyApiToken
			}
		});
	}
	/**
	* Create an ApifyDatasetLoader by calling a saved Actor task on the Apify platform and waiting for its results to be ready.
	* @param taskId The ID or name of the task on the Apify platform.
	* @param input The input object of the task that you're trying to run. Overrides the task's saved input.
	* @param config Options specifying settings for the task run.
	* @param config.callOptions Options specifying settings for the task run.
	* @param config.clientOptions Options specifying settings for the Apify client.
	* @param config.datasetMappingFunction A function that takes a single object (an Apify dataset item) and converts it to an instance of the Document class.
	* @returns An instance of `ApifyDatasetLoader` with the results from the task's run.
	*/
	static async fromActorTaskCall(taskId, input, config) {
		const apifyApiToken = ApifyDatasetLoader._getApifyApiToken(config.clientOptions);
		const apifyClient = ApifyDatasetLoader._getApifyClient(config.clientOptions);
		const taskCall = await apifyClient.task(taskId).call(input, config.callOptions ?? {});
		return new ApifyDatasetLoader(taskCall.defaultDatasetId, {
			datasetMappingFunction: config.datasetMappingFunction,
			clientOptions: {
				...config.clientOptions,
				token: apifyApiToken
			}
		});
	}
};

//#endregion
export { ApifyDatasetLoader, apify_dataset_exports };
//# sourceMappingURL=apify_dataset.js.map