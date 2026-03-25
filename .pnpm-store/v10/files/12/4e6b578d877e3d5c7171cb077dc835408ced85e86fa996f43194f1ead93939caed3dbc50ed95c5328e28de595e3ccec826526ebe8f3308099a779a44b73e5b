import { BaseRetriever } from "@langchain/core/retrievers";
import { KendraClient, QueryCommand, RetrieveCommand } from "@aws-sdk/client-kendra";
import { Document } from "@langchain/core/documents";

//#region src/retrievers/kendra.ts
/**
* Class for interacting with Amazon Kendra, an intelligent search service
* provided by AWS. Extends the BaseRetriever class.
* @example
* ```typescript
* const retriever = new AmazonKendraRetriever({
*   topK: 10,
*   indexId: "YOUR_INDEX_ID",
*   region: "us-east-2",
*   clientOptions: {
*     credentials: {
*       accessKeyId: "YOUR_ACCESS_KEY_ID",
*       secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
*     },
*   },
* });
*
* const docs = await retriever.getRelevantDocuments("How are clouds formed?");
* ```
*/
var AmazonKendraRetriever = class extends BaseRetriever {
	static lc_name() {
		return "AmazonKendraRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"amazon_kendra"
	];
	indexId;
	topK;
	kendraClient;
	attributeFilter;
	constructor({ indexId, topK = 10, clientOptions, attributeFilter, region }) {
		super();
		if (!region) throw new Error("Please pass regionName field to the constructor!");
		if (!indexId) throw new Error("Please pass Kendra Index Id to the constructor");
		this.topK = topK;
		this.kendraClient = new KendraClient({
			region,
			...clientOptions
		});
		this.attributeFilter = attributeFilter;
		this.indexId = indexId;
	}
	/**
	* Combines title and excerpt into a single string.
	* @param title The title of the document.
	* @param excerpt An excerpt from the document.
	* @returns A single string combining the title and excerpt.
	*/
	combineText(title, excerpt) {
		let text = "";
		if (title) text += `Document Title: ${title}\n`;
		if (excerpt) text += `Document Excerpt: \n${excerpt}\n`;
		return text;
	}
	/**
	* Cleans the result text by replacing sequences of whitespace with a
	* single space and removing ellipses.
	* @param resText The result text to clean.
	* @returns The cleaned result text.
	*/
	cleanResult(resText) {
		const res = resText.replace(/\s+/g, " ").replace(/\.\.\./g, "");
		return res;
	}
	/**
	* Extracts the attribute value from a DocumentAttributeValue object.
	* @param value The DocumentAttributeValue object to extract the value from.
	* @returns The extracted attribute value.
	*/
	getDocAttributeValue(value) {
		if (value.DateValue) return value.DateValue;
		if (value.LongValue) return value.LongValue;
		if (value.StringListValue) return value.StringListValue;
		if (value.StringValue) return value.StringValue;
		return "";
	}
	/**
	* Extracts the attribute key-value pairs from an array of
	* DocumentAttribute objects.
	* @param documentAttributes The array of DocumentAttribute objects to extract the key-value pairs from.
	* @returns An object containing the extracted attribute key-value pairs.
	*/
	getDocAttributes(documentAttributes) {
		const attributes = {};
		if (documentAttributes) {
			for (const attr of documentAttributes) if (attr.Key && attr.Value) attributes[attr.Key] = this.getDocAttributeValue(attr.Value);
		}
		return attributes;
	}
	/**
	* Converts a RetrieveResultItem object into a Document object.
	* @param item The RetrieveResultItem object to convert.
	* @returns A Document object.
	*/
	convertRetrieverItem(item) {
		const title = item.DocumentTitle || "";
		const excerpt = item.Content ? this.cleanResult(item.Content) : "";
		const pageContent = this.combineText(title, excerpt);
		const source = item.DocumentURI;
		const attributes = this.getDocAttributes(item.DocumentAttributes);
		const metadata = {
			source,
			title,
			excerpt,
			document_attributes: attributes
		};
		return new Document({
			pageContent,
			metadata
		});
	}
	/**
	* Extracts the top-k documents from a RetrieveCommandOutput object.
	* @param response The RetrieveCommandOutput object to extract the documents from.
	* @param pageSize The number of documents to extract.
	* @returns An array of Document objects.
	*/
	getRetrieverDocs(response, pageSize) {
		if (!response.ResultItems) return [];
		const { length } = response.ResultItems;
		const count = length < pageSize ? length : pageSize;
		return response.ResultItems.slice(0, count).map((item) => this.convertRetrieverItem(item));
	}
	/**
	* Extracts the excerpt text from a QueryResultItem object.
	* @param item The QueryResultItem object to extract the excerpt text from.
	* @returns The extracted excerpt text.
	*/
	getQueryItemExcerpt(item) {
		if (item.AdditionalAttributes && item.AdditionalAttributes.length && item.AdditionalAttributes[0].Key === "AnswerText") {
			if (!item.AdditionalAttributes) return "";
			if (!item.AdditionalAttributes[0]) return "";
			return this.cleanResult(item.AdditionalAttributes[0].Value?.TextWithHighlightsValue?.Text || "");
		} else if (item.DocumentExcerpt) return this.cleanResult(item.DocumentExcerpt.Text || "");
		else return "";
	}
	/**
	* Converts a QueryResultItem object into a Document object.
	* @param item The QueryResultItem object to convert.
	* @returns A Document object.
	*/
	convertQueryItem(item) {
		const title = item.DocumentTitle?.Text || "";
		const excerpt = this.getQueryItemExcerpt(item);
		const pageContent = this.combineText(title, excerpt);
		const source = item.DocumentURI;
		const attributes = this.getDocAttributes(item.DocumentAttributes);
		const metadata = {
			source,
			title,
			excerpt,
			document_attributes: attributes
		};
		return new Document({
			pageContent,
			metadata
		});
	}
	/**
	* Extracts the top-k documents from a QueryCommandOutput object.
	* @param response The QueryCommandOutput object to extract the documents from.
	* @param pageSize The number of documents to extract.
	* @returns An array of Document objects.
	*/
	getQueryDocs(response, pageSize) {
		if (!response.ResultItems) return [];
		const { length } = response.ResultItems;
		const count = length < pageSize ? length : pageSize;
		return response.ResultItems.slice(0, count).map((item) => this.convertQueryItem(item));
	}
	/**
	* Sends a retrieve or query request to Kendra and returns the top-k
	* documents.
	* @param query The query to send to Kendra.
	* @param topK The number of top documents to return.
	* @param attributeFilter Optional filter to apply when retrieving documents.
	* @returns A Promise that resolves to an array of Document objects.
	*/
	async queryKendra(query, topK, attributeFilter) {
		const retrieveCommand = new RetrieveCommand({
			IndexId: this.indexId,
			QueryText: query,
			PageSize: topK,
			AttributeFilter: attributeFilter
		});
		const retrieveResponse = await this.kendraClient.send(retrieveCommand);
		const retriveLength = retrieveResponse.ResultItems?.length;
		if (retriveLength === 0) {
			const queryCommand = new QueryCommand({
				IndexId: this.indexId,
				QueryText: query,
				PageSize: topK,
				AttributeFilter: attributeFilter
			});
			const queryResponse = await this.kendraClient.send(queryCommand);
			return this.getQueryDocs(queryResponse, this.topK);
		} else return this.getRetrieverDocs(retrieveResponse, this.topK);
	}
	async _getRelevantDocuments(query) {
		const docs = await this.queryKendra(query, this.topK, this.attributeFilter);
		return docs;
	}
};

//#endregion
export { AmazonKendraRetriever };
//# sourceMappingURL=kendra.js.map