import { Serializable } from "@langchain/core/load/serializable";
import { ClientOptions, OpenAIClient } from "@langchain/openai";

//#region src/experimental/openai_files/index.d.ts
type OpenAIFilesInput = {
  client?: OpenAIClient;
  clientOptions?: ClientOptions;
};
declare class OpenAIFiles extends Serializable {
  lc_namespace: string[];
  private oaiClient;
  constructor(fields?: OpenAIFilesInput);
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
  createFile({
    file,
    purpose,
    options
  }: OpenAIClient.FileCreateParams & {
    options?: OpenAIClient.RequestOptions;
  }): Promise<OpenAIClient.FileObject & {
    _request_id?: string | null | undefined;
  }>;
  /**
   * Delete a file.
   *
   * @link {https://platform.openai.com/docs/api-reference/files/delete}
   * @param {string} fileId
   * @param {OpenAIClient.RequestOptions | undefined} options
   * @returns {Promise<OpenAIClient.Files.FileDeleted>}
   */
  deleteFile({
    fileId,
    options
  }: {
    fileId: string;
    options?: OpenAIClient.RequestOptions;
  }): Promise<OpenAIClient.FileDeleted & {
    _request_id?: string | null | undefined;
  }>;
  /**
   * List files
   * Returns a list of files that belong to the user's organization.
   *
   * @link {https://platform.openai.com/docs/api-reference/files/list}
   * @param {OpenAIClient.Files.FileListParams | undefined} query
   * @param {OpenAIClient.RequestOptions | undefined} options
   * @returns {Promise<OpenAIClient.Files.FileObjectsPage>}
   */
  listFiles(props?: {
    query?: OpenAIClient.Files.FileListParams;
    options?: OpenAIClient.RequestOptions;
  }): Promise<OpenAIClient.FileObjectsPage>;
  /**
   * Retrieve file
   * Returns information about a specific file.
   *
   * @link {https://platform.openai.com/docs/api-reference/files/retrieve}
   * @param {string} fileId
   * @param {OpenAIClient.RequestOptions | undefined} options
   * @returns {Promise<OpenAIClient.Files.FileObject>}
   */
  retrieveFile({
    fileId,
    options
  }: {
    fileId: string;
    options?: OpenAIClient.RequestOptions;
  }): Promise<OpenAIClient.FileObject & {
    _request_id?: string | null | undefined;
  }>;
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
  retrieveFileContent({
    fileId,
    options
  }: {
    fileId: string;
    options?: OpenAIClient.RequestOptions;
  }): Promise<OpenAIClient.FileObject & {
    _request_id?: string | null | undefined;
  }>;
}
//#endregion
export { OpenAIFiles, OpenAIFilesInput };
//# sourceMappingURL=index.d.ts.map