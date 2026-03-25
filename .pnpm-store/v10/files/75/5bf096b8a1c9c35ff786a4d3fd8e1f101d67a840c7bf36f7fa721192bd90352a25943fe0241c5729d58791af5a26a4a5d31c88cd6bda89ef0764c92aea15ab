import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/serpapi.ts
var serpapi_exports = {};
__export(serpapi_exports, { SerpAPILoader: () => SerpAPILoader });
/**
* Class representing a document loader for loading search results from
* the SerpAPI. It extends the BaseDocumentLoader class.
* @example
* ```typescript
* const loader = new SerpAPILoader({ q: "{query}", apiKey: "{apiKey}" });
* const docs = await loader.load();
* ```
*/
var SerpAPILoader = class extends BaseDocumentLoader {
	apiKey;
	searchQuery;
	constructor(params) {
		super();
		const { apiKey = getEnvironmentVariable("SERPAPI_API_KEY"), q } = params;
		if (!apiKey) throw new Error("SerpAPI API key not set. You can set it as SERPAPI_API_KEY in your .env file, or pass it to SerpAPI.");
		this.apiKey = apiKey;
		this.searchQuery = q;
	}
	/**
	* Builds the URL for the SerpAPI search request.
	* @returns The URL for the search request.
	*/
	buildUrl() {
		const params = new URLSearchParams();
		params.append("api_key", this.apiKey);
		params.append("q", this.searchQuery);
		return `https://serpapi.com/search?${params.toString()}`;
	}
	/**
	* Extracts documents from the provided output.
	* @param output - The output to extract documents from.
	* @param responseType - The type of the response to extract documents from.
	* @returns An array of Documents.
	*/
	extractDocuments(output, responseType) {
		const documents = [];
		const results = Array.isArray(output) ? output : [output];
		for (const result of results) {
			const pageContent = JSON.stringify(result);
			const metadata = {
				source: "SerpAPI",
				responseType
			};
			documents.push(new Document({
				pageContent,
				metadata
			}));
		}
		return documents;
	}
	/**
	* Processes the response data from the SerpAPI search request and converts it into an array of Documents.
	* @param data - The response data from the SerpAPI search request.
	* @returns An array of Documents.
	*/
	processResponseData(data) {
		const documents = [];
		const responseTypes = [
			"answer_box",
			"sports_results",
			"shopping_results",
			"knowledge_graph",
			"organic_results"
		];
		for (const responseType of responseTypes) if (responseType in data) documents.push(...this.extractDocuments(data[responseType], responseType));
		return documents;
	}
	/**
	* Fetches the data from the provided URL and returns it as a JSON object.
	* If an error occurs during the fetch operation, an exception is thrown with the error message.
	* @param url - The URL to fetch data from.
	* @returns A promise that resolves to the fetched data as a JSON object.
	* @throws An error if the fetch operation fails.
	*/
	async fetchData(url) {
		const response = await fetch(url);
		const data = await response.json();
		if (data.error) throw new Error(`Failed to load search results from SerpAPI due to: ${data.error}`);
		return data;
	}
	/**
	* Loads the search results from the SerpAPI.
	* @returns An array of Documents representing the search results.
	* @throws An error if the search results could not be loaded.
	*/
	async load() {
		const url = this.buildUrl();
		const data = await this.fetchData(url);
		try {
			return this.processResponseData(data);
		} catch (error) {
			console.error(error);
			throw new Error(`Failed to process search results from SerpAPI: ${error}`);
		}
	}
};

//#endregion
export { SerpAPILoader, serpapi_exports };
//# sourceMappingURL=serpapi.js.map