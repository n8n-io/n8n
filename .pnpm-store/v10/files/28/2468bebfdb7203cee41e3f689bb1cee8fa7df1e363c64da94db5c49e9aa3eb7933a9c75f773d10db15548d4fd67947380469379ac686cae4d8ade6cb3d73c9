import { __export } from "../../_virtual/rolldown_runtime.js";
import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { AsyncCaller } from "@langchain/core/utils/async_caller";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";

//#region src/document_loaders/web/airtable.ts
var airtable_exports = {};
__export(airtable_exports, { AirtableLoader: () => AirtableLoader });
var AirtableLoader = class AirtableLoader extends BaseDocumentLoader {
	apiToken;
	tableId;
	baseId;
	kwargs;
	static BASE_URL = "https://api.airtable.com/v0";
	asyncCaller;
	/**
	* Initializes the AirtableLoader with configuration options.
	* Retrieves the API token from environment variables and validates it.
	*
	* @param tableId - ID of the Airtable table.
	* @param baseId - ID of the Airtable base.
	* @param kwargs - Additional query parameters for Airtable requests.
	* @param config - Loader configuration for retry options.
	*/
	constructor({ tableId, baseId, kwargs = {} }) {
		super();
		this.apiToken = getEnvironmentVariable("AIRTABLE_API_TOKEN") || "";
		this.tableId = tableId;
		this.baseId = baseId;
		this.kwargs = kwargs;
		if (!this.apiToken) throw new Error("Missing Airtable API token. Please set AIRTABLE_API_TOKEN environment variable.");
		this.asyncCaller = new AsyncCaller({
			maxRetries: 3,
			maxConcurrency: 5
		});
	}
	/**
	* Loads documents from Airtable, handling pagination and retries.
	*
	* @returns A promise that resolves to an array of Document objects.
	*/
	async load() {
		const documents = [];
		let offset;
		try {
			do {
				const body = this.constructRequestBody(offset);
				const data = await this.asyncCaller.call(() => this.fetchRecords(body));
				data.records.forEach((record) => documents.push(this.createDocument(record)));
				offset = data.offset;
			} while (offset);
		} catch (error) {
			console.error("Error loading Airtable records:", error);
			throw new Error("Failed to load Airtable records");
		}
		return documents;
	}
	/**
	* Asynchronous generator function for lazily loading documents from Airtable.
	* This method yields each document individually, enabling memory-efficient
	* handling of large datasets by fetching records in pages.
	*
	* @returns An asynchronous generator yielding Document objects one by one.
	*/
	async *loadLazy() {
		let offset;
		try {
			do {
				const body = this.constructRequestBody(offset);
				const data = await this.asyncCaller.call(() => this.fetchRecords(body));
				for (const record of data.records) yield this.createDocument(record);
				offset = data.offset;
			} while (offset);
		} catch (error) {
			console.error("Error loading Airtable records lazily:", error);
			throw new Error("Failed to load Airtable records lazily");
		}
	}
	/**
	* Constructs the request body for an API call.
	*
	* @param offset - An optional string representing the offset for pagination.
	* @returns A record containing the combined properties of `kwargs` and the provided offset.
	*/
	constructRequestBody(offset) {
		return {
			...this.kwargs,
			offset
		};
	}
	/**
	* Sends the API request to Airtable and handles the response.
	* Includes a timeout to prevent hanging on unresponsive requests.
	*
	* @param body - The request payload to be sent to the Airtable API.
	* @returns A promise that resolves to an AirtableResponse object.
	* @throws Will throw an error if the Airtable API request fails.
	*/
	async fetchRecords(body) {
		const url = `${AirtableLoader.BASE_URL}/${this.baseId}/${this.tableId}/listRecords`;
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.apiToken}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});
			if (!response.ok) throw new Error(`Airtable API request failed with status ${response.status}: ${response.statusText}`);
			return await response.json();
		} catch (error) {
			console.error("Error during fetch:", error);
			throw error;
		}
	}
	/**
	* Converts an Airtable record into a Document object with metadata.
	*
	* @param record - An Airtable record to convert.
	* @returns A Document object with page content and metadata.
	*/
	createDocument(record) {
		const metadata = {
			source: `${this.baseId}_${this.tableId}`,
			base_id: this.baseId,
			table_id: this.tableId,
			...this.kwargs.view && { view: this.kwargs.view }
		};
		return new Document({
			pageContent: JSON.stringify(record),
			metadata
		});
	}
};

//#endregion
export { AirtableLoader, airtable_exports };
//# sourceMappingURL=airtable.js.map