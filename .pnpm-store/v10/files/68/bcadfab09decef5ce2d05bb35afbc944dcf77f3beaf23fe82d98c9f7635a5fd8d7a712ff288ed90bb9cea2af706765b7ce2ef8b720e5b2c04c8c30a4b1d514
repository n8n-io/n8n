import { __export } from "../../_virtual/rolldown_runtime.js";
import { GoogleVertexAILLMConnection } from "../../utils/googlevertexai-connection.js";
import { Embeddings } from "@langchain/core/embeddings";
import { GoogleAuth } from "google-auth-library";

//#region src/experimental/multimodal_embeddings/googlevertexai.ts
var googlevertexai_exports = {};
__export(googlevertexai_exports, { GoogleVertexAIMultimodalEmbeddings: () => GoogleVertexAIMultimodalEmbeddings });
/**
* Class for generating embeddings for text and images using Google's
* Vertex AI. It extends the Embeddings base class and implements the
* GoogleVertexAIMultimodalEmbeddingsParams interface.
*/
var GoogleVertexAIMultimodalEmbeddings = class extends Embeddings {
	model = "multimodalembedding@001";
	connection;
	constructor(fields) {
		super(fields ?? {});
		this.model = fields?.model ?? this.model;
		this.connection = new GoogleVertexAILLMConnection({
			...fields,
			...this
		}, this.caller, new GoogleAuth({
			scopes: "https://www.googleapis.com/auth/cloud-platform",
			...fields?.authOptions
		}));
	}
	/**
	* Converts media (text or image) to an instance that can be used for
	* generating embeddings.
	* @param media The media (text or image) to be converted.
	* @returns An instance of media that can be used for generating embeddings.
	*/
	mediaToInstance(media) {
		const ret = {};
		if (media?.text) ret.text = media.text;
		if (media.image) ret.image = { bytesBase64Encoded: media.image.toString("base64") };
		return ret;
	}
	/**
	* Converts the response from Google Vertex AI to embeddings.
	* @param response The response from Google Vertex AI.
	* @returns An array of media embeddings.
	*/
	responseToEmbeddings(response) {
		return (response?.data).predictions.map((r) => ({
			text: r.textEmbedding,
			image: r.imageEmbedding
		}));
	}
	/**
	* Generates embeddings for multiple media instances.
	* @param media An array of media instances.
	* @returns A promise that resolves to an array of media embeddings.
	*/
	async embedMedia(media) {
		return Promise.all(media.map((m) => this.embedMediaQuery(m)));
	}
	/**
	* Generates embeddings for a single media instance.
	* @param media A single media instance.
	* @returns A promise that resolves to a media embedding.
	*/
	async embedMediaQuery(media) {
		const instance = this.mediaToInstance(media);
		const instances = [instance];
		const parameters = {};
		const options = {};
		const responses = await this.connection.request(instances, parameters, options);
		const result = this.responseToEmbeddings(responses);
		return result[0];
	}
	/**
	* Generates embeddings for multiple images.
	* @param images An array of images.
	* @returns A promise that resolves to an array of image embeddings.
	*/
	async embedImage(images) {
		return this.embedMedia(images.map((image) => ({ image }))).then((embeddings) => embeddings.map((e) => e.image ?? []));
	}
	/**
	* Generates embeddings for a single image.
	* @param image A single image.
	* @returns A promise that resolves to an image embedding.
	*/
	async embedImageQuery(image) {
		return this.embedMediaQuery({ image }).then((embeddings) => embeddings.image ?? []);
	}
	/**
	* Generates embeddings for multiple text documents.
	* @param documents An array of text documents.
	* @returns A promise that resolves to an array of text document embeddings.
	*/
	async embedDocuments(documents) {
		return this.embedMedia(documents.map((text) => ({ text }))).then((embeddings) => embeddings.map((e) => e.text ?? []));
	}
	/**
	* Generates embeddings for a single text document.
	* @param document A single text document.
	* @returns A promise that resolves to a text document embedding.
	*/
	async embedQuery(document) {
		return this.embedMediaQuery({ text: document }).then((embeddings) => embeddings.text ?? []);
	}
};

//#endregion
export { GoogleVertexAIMultimodalEmbeddings, googlevertexai_exports };
//# sourceMappingURL=googlevertexai.js.map