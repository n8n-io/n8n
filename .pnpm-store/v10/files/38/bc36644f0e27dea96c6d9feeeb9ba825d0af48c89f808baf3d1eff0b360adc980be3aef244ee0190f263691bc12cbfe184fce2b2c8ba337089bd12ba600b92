const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __aws_sdk_client_bedrock_runtime = require_rolldown_runtime.__toESM(require("@aws-sdk/client-bedrock-runtime"));
const __langchain_core_embeddings = require_rolldown_runtime.__toESM(require("@langchain/core/embeddings"));

//#region src/embeddings.ts
/**
* Class that extends the Embeddings class and provides methods for
* generating embeddings using the Bedrock API.
* @example
* ```typescript
* const embeddings = new BedrockEmbeddings({
*   region: "your-aws-region",
*   credentials: {
*     accessKeyId: "your-access-key-id",
*     secretAccessKey: "your-secret-access-key",
*   },
*   model: "amazon.titan-embed-text-v1",
*   // Configure client options (e.g., custom request handler)
*   // clientOptions: {
*   //   requestHandler: myCustomRequestHandler,
*   // },
* });
*
* // Embed a query and log the result
* const res = await embeddings.embedQuery(
*   "What would be a good company name for a company that makes colorful socks?"
* );
* console.log({ res });
* ```
*/
var BedrockEmbeddings = class extends __langchain_core_embeddings.Embeddings {
	model;
	client;
	clientOptions;
	batchSize = 512;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? "amazon.titan-embed-text-v1";
		this.clientOptions = fields?.clientOptions;
		this.client = fields?.client ?? new __aws_sdk_client_bedrock_runtime.BedrockRuntimeClient({
			...fields?.clientOptions,
			region: fields?.region,
			credentials: fields?.credentials
		});
	}
	/**
	* Protected method to make a request to the Bedrock API to generate
	* embeddings. Handles the retry logic and returns the response from the
	* API.
	* @param request Request to send to the Bedrock API.
	* @returns Promise that resolves to the response from the API.
	*/
	async _embedText(text) {
		return this.caller.call(async () => {
			try {
				const cleanedText = text.replace(/\n/g, " ");
				const res = await this.client.send(new __aws_sdk_client_bedrock_runtime.InvokeModelCommand({
					modelId: this.model,
					body: JSON.stringify({ inputText: cleanedText }),
					contentType: "application/json",
					accept: "application/json"
				}));
				const body = new TextDecoder().decode(res.body);
				return JSON.parse(body).embedding;
			} catch (e) {
				console.error({ error: e });
				if (e instanceof Error) throw new Error(`An error occurred while embedding documents with Bedrock: ${e.message}`);
				throw new Error("An error occurred while embedding documents with Bedrock");
			}
		});
	}
	/**
	* Method that takes a document as input and returns a promise that
	* resolves to an embedding for the document. It calls the _embedText
	* method with the document as the input.
	* @param document Document for which to generate an embedding.
	* @returns Promise that resolves to an embedding for the input document.
	*/
	embedQuery(document) {
		return this.caller.callWithOptions({}, this._embedText.bind(this), document);
	}
	/**
	* Method to generate embeddings for an array of texts. Calls _embedText
	* method which batches and handles retry logic when calling the AWS Bedrock API.
	* @param documents Array of texts for which to generate embeddings.
	* @returns Promise that resolves to a 2D array of embeddings for each input document.
	*/
	async embedDocuments(documents) {
		return Promise.all(documents.map((document) => this._embedText(document)));
	}
};

//#endregion
exports.BedrockEmbeddings = BedrockEmbeddings;
//# sourceMappingURL=embeddings.cjs.map