const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __langchain_core_outputs = require_rolldown_runtime.__toESM(require("@langchain/core/outputs"));
const __langchain_core_language_models_llms = require_rolldown_runtime.__toESM(require("@langchain/core/language_models/llms"));
const __aws_sdk_client_sagemaker_runtime = require_rolldown_runtime.__toESM(require("@aws-sdk/client-sagemaker-runtime"));

//#region src/llms/sagemaker_endpoint.ts
var sagemaker_endpoint_exports = {};
require_rolldown_runtime.__export(sagemaker_endpoint_exports, {
	BaseSageMakerContentHandler: () => BaseSageMakerContentHandler,
	SageMakerEndpoint: () => SageMakerEndpoint
});
/**
* A handler class to transform input from LLM to a format that SageMaker
* endpoint expects. Similarily, the class also handles transforming output from
* the SageMaker endpoint to a format that LLM class expects.
*
* Example:
* ```
* class ContentHandler implements ContentHandlerBase<string, string> {
*   contentType = "application/json"
*   accepts = "application/json"
*
*   transformInput(prompt: string, modelKwargs: Record<string, unknown>) {
*     const inputString = JSON.stringify({
*       prompt,
*      ...modelKwargs
*     })
*     return Buffer.from(inputString)
*   }
*
*   transformOutput(output: Uint8Array) {
*     const responseJson = JSON.parse(Buffer.from(output).toString("utf-8"))
*     return responseJson[0].generated_text
*   }
*
* }
* ```
*/
var BaseSageMakerContentHandler = class {
	contentType = "text/plain";
	accepts = "text/plain";
};
/**
* The SageMakerEndpoint class is used to interact with SageMaker
* Inference Endpoint models. It uses the AWS client for authentication,
* which automatically loads credentials.
* If a specific credential profile is to be used, the name of the profile
* from the ~/.aws/credentials file must be passed. The credentials or
* roles used should have the required policies to access the SageMaker
* endpoint.
*/
var SageMakerEndpoint = class extends __langchain_core_language_models_llms.LLM {
	lc_serializable = true;
	static lc_name() {
		return "SageMakerEndpoint";
	}
	get lc_secrets() {
		return {
			"clientOptions.credentials.accessKeyId": "AWS_ACCESS_KEY_ID",
			"clientOptions.credentials.secretAccessKey": "AWS_SECRET_ACCESS_KEY",
			"clientOptions.credentials.sessionToken": "AWS_SESSION_TOKEN"
		};
	}
	endpointName;
	modelKwargs;
	endpointKwargs;
	client;
	contentHandler;
	streaming;
	constructor(fields) {
		super(fields);
		if (!fields.clientOptions.region) throw new Error(`Please pass a "clientOptions" object with a "region" field to the constructor`);
		const endpointName = fields?.endpointName;
		if (!endpointName) throw new Error(`Please pass an "endpointName" field to the constructor`);
		const contentHandler = fields?.contentHandler;
		if (!contentHandler) throw new Error(`Please pass a "contentHandler" field to the constructor`);
		this.endpointName = fields.endpointName;
		this.contentHandler = fields.contentHandler;
		this.endpointKwargs = fields.endpointKwargs;
		this.modelKwargs = fields.modelKwargs;
		this.streaming = fields.streaming ?? false;
		this.client = new __aws_sdk_client_sagemaker_runtime.SageMakerRuntimeClient(fields.clientOptions);
	}
	_llmType() {
		return "sagemaker_endpoint";
	}
	/**
	* Calls the SageMaker endpoint and retrieves the result.
	* @param {string} prompt The input prompt.
	* @param {this["ParsedCallOptions"]} options Parsed call options.
	* @param {CallbackManagerForLLMRun} runManager Optional run manager.
	* @returns {Promise<string>} A promise that resolves to the generated string.
	*/
	/** @ignore */
	async _call(prompt, options, runManager) {
		return this.streaming ? await this.streamingCall(prompt, options, runManager) : await this.noStreamingCall(prompt, options);
	}
	async streamingCall(prompt, options, runManager) {
		const chunks = [];
		for await (const chunk of this._streamResponseChunks(prompt, options, runManager)) chunks.push(chunk.text);
		return chunks.join("");
	}
	async noStreamingCall(prompt, options) {
		const body = await this.contentHandler.transformInput(prompt, this.modelKwargs ?? {});
		const { contentType, accepts } = this.contentHandler;
		const response = await this.caller.call(() => this.client.send(new __aws_sdk_client_sagemaker_runtime.InvokeEndpointCommand({
			EndpointName: this.endpointName,
			Body: body,
			ContentType: contentType,
			Accept: accepts,
			...this.endpointKwargs
		}), { abortSignal: options.signal }));
		if (response.Body === void 0) throw new Error("Inference result missing Body");
		return this.contentHandler.transformOutput(response.Body);
	}
	/**
	* Streams response chunks from the SageMaker endpoint.
	* @param {string} prompt The input prompt.
	* @param {this["ParsedCallOptions"]} options Parsed call options.
	* @returns {AsyncGenerator<GenerationChunk>} An asynchronous generator yielding generation chunks.
	*/
	async *_streamResponseChunks(prompt, options, runManager) {
		const body = await this.contentHandler.transformInput(prompt, this.modelKwargs ?? {});
		const { contentType, accepts } = this.contentHandler;
		const stream = await this.caller.call(() => this.client.send(new __aws_sdk_client_sagemaker_runtime.InvokeEndpointWithResponseStreamCommand({
			EndpointName: this.endpointName,
			Body: body,
			ContentType: contentType,
			Accept: accepts,
			...this.endpointKwargs
		}), { abortSignal: options.signal }));
		if (!stream.Body) throw new Error("Inference result missing Body");
		for await (const chunk of stream.Body) if (chunk.PayloadPart && chunk.PayloadPart.Bytes) {
			const text = await this.contentHandler.transformOutput(chunk.PayloadPart.Bytes);
			yield new __langchain_core_outputs.GenerationChunk({
				text,
				generationInfo: {
					...chunk,
					response: void 0
				}
			});
			await runManager?.handleLLMNewToken(text);
		} else if (chunk.InternalStreamFailure) throw new Error(chunk.InternalStreamFailure.message);
		else if (chunk.ModelStreamError) throw new Error(chunk.ModelStreamError.message);
	}
};

//#endregion
exports.BaseSageMakerContentHandler = BaseSageMakerContentHandler;
exports.SageMakerEndpoint = SageMakerEndpoint;
Object.defineProperty(exports, 'sagemaker_endpoint_exports', {
  enumerable: true,
  get: function () {
    return sagemaker_endpoint_exports;
  }
});
//# sourceMappingURL=sagemaker_endpoint.cjs.map