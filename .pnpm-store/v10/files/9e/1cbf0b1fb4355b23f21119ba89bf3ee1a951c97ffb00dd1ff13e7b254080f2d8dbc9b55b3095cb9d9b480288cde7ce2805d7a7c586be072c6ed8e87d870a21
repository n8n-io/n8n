import { __export } from "../../_virtual/rolldown_runtime.js";
import { Serializable } from "@langchain/core/load/serializable";
import { OpenAIClient } from "@langchain/openai";

//#region src/experimental/openai_files/index.ts
var openai_files_exports = {};
__export(openai_files_exports, { OpenAIFiles: () => OpenAIFiles });
var OpenAIFiles = class extends Serializable {
	lc_namespace = ["langchain", "experimental"];
	oaiClient;
	constructor(fields) {
		super(fields);
		this.oaiClient = fields?.client ?? new OpenAIClient(fields?.clientOptions);
	}
	/**
	* Upload file
	* Upload a file that can be used across various endpoints. The size of all the files uploaded by one organization can be up to 100 GB.
	*
	* @note The size of individual files can be a maximum of 512 MB. See the Assistants Tools guide to learn more about the types of files supported. The Fine-tuning API only supports .jsonl files.
	*
	* @link {https://platform.openai.com/docs/api-reference/files/create}
	* @param {OpenAIClient.FileCreateParams['file']} file
	* @param {OpenAIClient.FileCreateParams['purpose']} purpose
	* @param {OpenAIClient.RequestOptions | undefined} options
	* @returns {Promise<OpenAIClient.Files.FileObject>}
	*/
	async createFile({ file, purpose, options }) {
		return this.oaiClient.files.create({
			file,
			purpose
		}, options);
	}
	/**
	* Delete a file.
	*
	* @link {https://platform.openai.com/docs/api-reference/files/delete}
	* @param {string} fileId
	* @param {OpenAIClient.RequestOptions | undefined} options
	* @returns {Promise<OpenAIClient.Files.FileDeleted>}
	*/
	async deleteFile({ fileId, options }) {
		return this.oaiClient.files.delete(fileId, options);
	}
	/**
	* List files
	* Returns a list of files that belong to the user's organization.
	*
	* @link {https://platform.openai.com/docs/api-reference/files/list}
	* @param {OpenAIClient.Files.FileListParams | undefined} query
	* @param {OpenAIClient.RequestOptions | undefined} options
	* @returns {Promise<OpenAIClient.Files.FileObjectsPage>}
	*/
	async listFiles(props) {
		return this.oaiClient.files.list(props?.query, props?.options);
	}
	/**
	* Retrieve file
	* Returns information about a specific file.
	*
	* @link {https://platform.openai.com/docs/api-reference/files/retrieve}
	* @param {string} fileId
	* @param {OpenAIClient.RequestOptions | undefined} options
	* @returns {Promise<OpenAIClient.Files.FileObject>}
	*/
	async retrieveFile({ fileId, options }) {
		return this.oaiClient.files.retrieve(fileId, options);
	}
	/**
	* Retrieve file content
	* Returns the contents of the specified file.
	*
	* @note You can't retrieve the contents of a file that was uploaded with the "purpose": "assistants" API.
	*
	* @link {https://platform.openai.com/docs/api-reference/files/retrieve-contents}
	* @param {string} fileId
	* @param {OpenAIClient.RequestOptions | undefined} options
	* @returns {Promise<string>}
	*/
	async retrieveFileContent({ fileId, options }) {
		return this.oaiClient.files.retrieve(fileId, options);
	}
};

//#endregion
export { OpenAIFiles, openai_files_exports };
//# sourceMappingURL=index.js.map